 // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const convertBtn = document.getElementById('convertBtn');
    const resultArea = document.getElementById('resultArea');
    const gifPreview = document.getElementById('gifPreview');
    const downloadBtn = document.getElementById('downloadBtn');
    const newConversionBtn = document.getElementById('newConversionBtn');
    const loadingStatus = document.createElement('div');
    loadingStatus.className = 'loading-status';
    dropArea.appendChild(loadingStatus);

    // FFmpeg configuration with multiple CDN fallbacks
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ 
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        wasmPath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm'
    });
    let ffmpegLoaded = false;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    // CDN fallback options
    const CDN_PATHS = [
        'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        'https://fastly.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    ];

    async function loadFFmpeg() {
        if (!ffmpegLoaded && retryCount < MAX_RETRIES) {
            try {
                loadingStatus.textContent = 'Loading converter (this may take a minute)...';
                loadingStatus.style.color = 'var(--loading-color)';
                convertBtn.disabled = true;

                // Try current CDN path first
                try {
                    await tryLoadFFmpeg();
                } catch (firstError) {
                    console.log('First load attempt failed, trying fallbacks...');
                    // Try fallback CDNs
                    for (let i = 0; i < CDN_PATHS.length; i++) {
                        if (i > 0) {
                            ffmpeg.corePath = CDN_PATHS[i];
                            loadingStatus.textContent = `Trying alternative source (${i+1}/${CDN_PATHS.length})...`;
                        }
                        try {
                            await tryLoadFFmpeg();
                            break; // Success, exit loop
                        } catch (err) {
                            console.error(`CDN ${i} failed:`, err);
                            if (i === CDN_PATHS.length - 1) throw err;
                        }
                    }
                }

                ffmpegLoaded = true;
                loadingStatus.textContent = 'Converter ready!';
                loadingStatus.style.color = 'var(--success-color)';
                if (fileInput.files.length > 0) {
                    convertBtn.disabled = false;
                }
            } catch (error) {
                retryCount++;
                console.error('FFmpeg load error:', error);
                if (retryCount < MAX_RETRIES) {
                    loadingStatus.textContent = `Retrying... (${retryCount}/${MAX_RETRIES})`;
                    setTimeout(loadFFmpeg, 2000);
                } else {
                    loadingStatus.textContent = 'Error loading converter. Please check your connection and refresh.';
                    loadingStatus.style.color = 'var(--error-color)';
                    showAlternativeOptions();
                }
            }
        }
    }

    async function tryLoadFFmpeg() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Loading timeout'));
            }, 45000); // 45 second timeout

            ffmpeg.setProgress(({ ratio }) => {
                const percent = Math.round(ratio * 100);
                loadingStatus.textContent = `Downloading: ${percent}% (${formatBytes(ratio * 25 * 1024 * 1024)}/25MB)`;
            });

            ffmpeg.load()
                .then(() => {
                    clearTimeout(timeout);
                    resolve();
                })
                .catch(reject);
        });
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + 'B';
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
        else return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    }

    function showAlternativeOptions() {
        const alternatives = document.createElement('div');
        alternatives.className = 'alternative-options';
        alternatives.innerHTML = `
            <p>If the converter won't load:</p>
            <ul>
                <li>Refresh the page</li>
                <li>Try a different browser (Chrome/Firefox recommended)</li>
                <li>Check your internet connection</li>
            </ul>
        `;
        loadingStatus.after(alternatives);
    }

    // Initialize FFmpeg loading
    loadFFmpeg().catch(console.error);

    // [Rest of your existing code remains the same...]
});
