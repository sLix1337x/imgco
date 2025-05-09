document.addEventListener('DOMContentLoaded', async () => {
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  document.getElementById('dropArea').appendChild(loadingStatus);

  // Use FFmpeg version without thread requirements
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/ffmpeg-core.js'
  });

  try {
    loadingStatus.textContent = 'Loading converter...';
    await ffmpeg.load();
    loadingStatus.textContent = 'Ready to convert!';
    document.getElementById('convertBtn').disabled = false;
    
    // [Rest of your existing conversion code...]
    
  } catch (error) {
    loadingStatus.innerHTML = `
      Error loading converter:<br>
      1. Try refreshing the page<br>
      2. Use latest Chrome/Firefox<br>
      <small>${error.message}</small>
    `;
  }
});
