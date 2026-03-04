document.addEventListener('DOMContentLoaded', () => {
    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Registration failed', err));
        });
    }

    const urlInput = document.getElementById('youtube-url');
    const btnPaste = document.getElementById('btn-paste');
    const btnAnalyze = document.getElementById('btn-analyze');
    const previewCard = document.getElementById('video-preview');
    const loader = document.getElementById('loader');

    // UI Elements for preview
    const videoThumb = document.getElementById('video-thumb');
    const videoTitle = document.getElementById('video-title');
    const videoAuthor = document.getElementById('video-author');
    const btnDownloadMp3 = document.getElementById('btn-download-mp3');
    const btnDownloadMp4 = document.getElementById('btn-download-mp4');
    const btnShare = document.getElementById('btn-share');

    // History elements
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const btnClearHistory = document.getElementById('btn-clear-history');

    let currentVideoData = null;

    // Load history on start
    renderHistory();

    // Manejar el botón de pegar
    btnPaste.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
            urlInput.focus();
        } catch (err) {
            console.error('No se pudo acceder al portapapeles', err);
        }
    });

    // Analizar el enlace
    btnAnalyze.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return alert('Por favor, pega un enlace de YouTube');

        showLoader('Analizando video...');
        previewCard.style.display = 'none';

        try {
            const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (data.error) throw new Error(data.error);

            // Actualizar vista previa
            videoThumb.src = data.thumbnail;
            videoTitle.innerText = data.title;
            videoAuthor.innerText = data.author;

            // Guardar datos actuales para descarga
            currentVideoData = {
                url: url,
                title: data.title,
                author: data.author,
                thumbnail: data.thumbnail
            };

            hideLoader();
            previewCard.style.display = 'block';
            previewCard.classList.remove('animate-pop');
            void previewCard.offsetWidth; // Trigger reflow
            previewCard.classList.add('animate-pop');

        } catch (error) {
            hideLoader();
            alert('Error: ' + error.message);
        }
    });

    // Descargar MP3
    btnDownloadMp3.addEventListener('click', () => {
        handleDownload('mp3');
    });

    // Descargar MP4
    btnDownloadMp4.addEventListener('click', () => {
        handleDownload('mp4');
    });

    // Compartir
    btnShare.addEventListener('click', async () => {
        if (!currentVideoData) return;

        const shareData = {
            title: currentVideoData.title,
            text: `¡Mira esta canción que encontré en YT Music Pro!`,
            url: currentVideoData.url
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback a WhatsApp si no hay share nativo
                const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`;
                window.open(waUrl, '_blank');
            }
        } catch (err) {
            console.log('Error al compartir:', err);
        }
    });

    function handleDownload(format) {
        if (!currentVideoData) return;

        const downloadURL = `/api/download?url=${encodeURIComponent(currentVideoData.url)}&format=${format}`;
        window.location.href = downloadURL;

        // Agregar al historial
        addToHistory(currentVideoData);

        // Feedback visual en el botón correspondiente
        const btn = format === 'mp3' ? btnDownloadMp3 : btnDownloadMp4;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fa-solid fa-clock"></i> DESCARGANDO...';
        btn.style.opacity = '0.7';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
        }, 5000);
    }

    // --- Funciones de Historial (LocalStorage) ---

    function addToHistory(video) {
        let history = JSON.parse(localStorage.getItem('yt_download_history') || '[]');

        // Evitar duplicados recientes
        history = history.filter(item => item.url !== video.url);

        // Agregar al inicio
        history.unshift({
            ...video,
            timestamp: Date.now()
        });

        // Limitar historial a 10 items
        if (history.length > 10) history.pop();

        localStorage.setItem('yt_download_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = JSON.parse(localStorage.getItem('yt_download_history') || '[]');

        if (history.length === 0) {
            historySection.style.display = 'none';
            return;
        }

        historySection.style.display = 'block';
        historyList.innerHTML = history.map(item => `
            <div class="history-item animate-pop" onclick="document.getElementById('youtube-url').value='${item.url}'; document.getElementById('btn-analyze').click();">
                <img src="${item.thumbnail}" class="history-thumb">
                <div class="history-info">
                    <h4>${item.title}</h4>
                    <p>${item.author}</p>
                </div>
                <i class="fa-solid fa-chevron-right" style="color: var(--text-secondary); font-size: 0.8rem;"></i>
            </div>
        `).join('');
    }

    btnClearHistory.addEventListener('click', () => {
        if (confirm('¿Limpiar todo el historial?')) {
            localStorage.removeItem('yt_download_history');
            renderHistory();
        }
    });

    function showLoader(text) {
        document.getElementById('loader-text').innerText = text;
        loader.style.display = 'block';
    }

    function hideLoader() {
        loader.style.display = 'none';
    }
});
