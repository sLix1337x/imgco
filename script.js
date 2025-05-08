// Replace your entire script.js with this:
document.addEventListener('DOMContentLoaded', async () => {
    const loadingStatus = document.createElement('div');
    loadingStatus.className = 'loading-status';
    document.getElementById('dropArea').appendChild(loadingStatus);

    // FFmpeg configuration with error handling
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({
        log: false, // Disable verbose logging
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });

    try {
        loadingStatus.textContent = 'Loading converter (25MB, please wait)...';
        
        // Show progress
        ffmpeg.setProgress(({ ratio }) => {
            const percent = Math.round(ratio * 100);
            loadingStatus.textContent = `Downloading: ${percent}% - ${Math.round(25 * ratio)}MB/25MB`;
        });

        // Load with timeout
        await Promise.race([
            ffmpeg.load(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout after 60 seconds')), 60000)
            )
        ]);
        
        loadingStatus.textContent = 'Converter ready!';
        loadingStatus.style.color = '#4CAF50';
        
        // Initialize your converter UI here
        document.getElementById('convertBtn').disabled = false;
        
    } catch (error) {
        console.error('FFmpeg load error:', error);
        loadingStatus.innerHTML = `
            Failed to load converter. Try:<br>
            1. Refresh the page<br>
            2. Use Chrome/Firefox<br>
            3. Check network connection<br>
            <small>Error: ${error.message}</small>
        `;
        loadingStatus.style.color = '#F44336';
    }
});
