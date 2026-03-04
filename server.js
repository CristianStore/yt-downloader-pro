const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn, execFile } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4050;

// Verificar que yt-dlp existe
const isWindows = process.platform === 'win32';
const YTDLP_PATH = isWindows ? path.join(__dirname, 'yt-dlp.exe') : 'yt-dlp';
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');

if (isWindows) {
    if (!fs.existsSync(YTDLP_PATH)) {
        console.error(`❌ ERROR: No se encontró yt-dlp.exe en: ${YTDLP_PATH}`);
    } else {
        console.log(`✅ Motor yt-dlp.exe detectado en: ${YTDLP_PATH}`);
    }
}

// Verificar si hay cookies para saltar bloqueos
const hasCookies = fs.existsSync(COOKIES_PATH);
if (hasCookies) {
    console.log('🍪 Archivo cookies.txt Detectado: Usando para saltar bloqueos.');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Comandos de resiliencia comunes para saltar bloqueos de YouTube
function getCommonArgs() {
    const args = [
        '--no-playlist',
        '--no-check-certificates',
        '--force-ipv4', // Crucial para servidores (Render/Heroku)
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        '--extractor-args', 'youtube:player-client=android,web'
    ];

    // Si el usuario subió cookies, las usamos
    if (hasCookies) {
        args.push('--cookies', COOKIES_PATH);
    }

    return args;
}

// API: Obtener información del video
app.get('/api/info', (req, res) => {
    const videoURL = req.query.url;
    console.log(`[INFO] Analizando URL: ${videoURL}`);

    if (!videoURL) return res.status(400).json({ error: 'URL no válida' });

    const args = [
        '--dump-json',
        ...getCommonArgs(),
        videoURL
    ];

    execFile(YTDLP_PATH, args, (error, stdout, stderr) => {
        if (error) {
            console.error('[ERROR] Info failed:', stderr);
            return res.status(500).json({
                error: 'YouTube está bloqueando la conexión del servidor.',
                details: 'Se recomienda subir un archivo cookies.txt para saltar el bloqueo.'
            });
        }

        try {
            const info = JSON.parse(stdout);
            res.json({
                title: info.title,
                author: info.uploader,
                thumbnail: info.thumbnail,
                duration: info.duration,
                url: videoURL
            });
        } catch (e) {
            res.status(500).json({ error: 'Error al procesar respuesta de YouTube' });
        }
    });
});

// API: Descargar (MP3 o MP4)
app.get('/api/download', (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format || 'mp3';

    if (!videoURL) return res.status(400).send('URL no válida');

    const commonArgs = getCommonArgs();

    // Obtener título primero
    execFile(YTDLP_PATH, [...commonArgs, '--get-title', videoURL], (error, stdout) => {
        const title = (stdout || 'video').trim().replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
        const extension = format === 'mp4' ? 'mp4' : 'mp3';

        res.header('Content-Disposition', `attachment; filename="${title}.${extension}"`);

        const args = [
            ...commonArgs,
            '-o', '-',
            videoURL
        ];

        if (format === 'mp3') {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
        } else {
            args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        }

        const child = spawn(YTDLP_PATH, args);
        child.stdout.pipe(res);

        child.on('close', (code) => {
            if (code !== 0) console.error(`[ERROR] Descarga falló: ${code}`);
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en Puerto ${PORT}`);
    if (!hasCookies) {
        console.log('⚠️ TIP: Si YouTube te bloquea en Render, sube un archivo cookies.txt al proyecto.');
    }
});
