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

if (isWindows) {
    if (!fs.existsSync(YTDLP_PATH)) {
        console.error(`❌ ERROR: No se encontró yt-dlp.exe en: ${YTDLP_PATH}`);
        console.log('Intentando buscar en el directorio actual...');
        const altPath = path.join(process.cwd(), 'yt-dlp.exe');
        if (fs.existsSync(altPath)) {
            console.log(`✅ Encontrado en el directorio actual: ${altPath}`);
        }
    } else {
        console.log(`✅ Motor yt-dlp.exe detectado en: ${YTDLP_PATH}`);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Obtener información del video
app.get('/api/info', (req, res) => {
    const videoURL = req.query.url;
    console.log(`[INFO] Analizando URL con yt-dlp: ${videoURL}`);

    if (!videoURL) return res.status(400).json({ error: 'URL no válida' });

    const args = [
        '--dump-json',
        '--no-playlist',
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--extractor-args', 'youtube:player-client=android,web',
        videoURL
    ];

    execFile(YTDLP_PATH, args, (error, stdout, stderr) => {
        if (error) {
            console.error('[ERROR] Info failed:', stderr);
            return res.status(500).json({ error: 'No se pudo obtener la información. YouTube está bloqueando la conexión.' });
        }

        try {
            const info = JSON.parse(stdout);
            console.log(`[INFO] Video encontrado: ${info.title}`);

            res.json({
                title: info.title,
                author: info.uploader,
                thumbnail: info.thumbnail,
                duration: info.duration
            });
        } catch (e) {
            res.status(500).json({ error: 'Error al procesar la respuesta de YouTube' });
        }
    });
});

// API: Descargar (MP3 o MP4)
app.get('/api/download', (req, res) => {
    const videoURL = req.query.url;
    const format = req.query.format || 'mp3';

    console.log(`[DOWNLOAD] Solicitud: ${videoURL} | Formato: ${format}`);

    if (!videoURL) return res.status(400).send('URL no válida');

    // Comandos de resiliencia comunes
    const commonArgs = [
        '--no-playlist',
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--extractor-args', 'youtube:player-client=android,web'
    ];

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

        console.log(`[DOWNLOAD] Ejecutando yt-dlp para streaming...`);
        const child = spawn(YTDLP_PATH, args);

        child.stdout.pipe(res);

        child.stderr.on('data', (data) => {
            console.log(`[YT-DLP LOG] ${data}`);
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('[DOWNLOAD] Traspaso finalizado con éxito.');
            } else {
                console.error(`[ERROR] yt-dlp falló con código ${code}`);
                if (!res.headersSent) res.status(500).send('Error durante la descarga.');
            }
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Music Server running on http://localhost:${PORT}`);
    console.log(`🛠️ Engine: yt-dlp (Resilient Mode)`);
});
