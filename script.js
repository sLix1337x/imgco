document.addEventListener('DOMContentLoaded', async () => {
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  document.getElementById('dropArea').appendChild(loadingStatus);

  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: window.location.href.includes('github.io') 
      ? 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
      : 'ffmpeg-core.js', // Local fallback
    wasmPath: window.location.href.includes('github.io')
      ? 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm'
      : 'ffmpeg-core.wasm'
  });

  try {
    loadingStatus.textContent = 'Loading converter (25MB)...';
    await ffmpeg.load();
    loadingStatus.textContent = 'Converter ready!';
    document.getElementById('convertBtn').disabled = false;
  } catch (error) {
    loadingStatus.innerHTML = `
      <strong>Solution:</strong><br>
      1. <a href="ffmpeg-core.js" download>Download this file</a><br>
      2. <a href="ffmpeg-core.wasm" download>And this file</a><br>
      3. Add them to your project folder<br>
      4. Refresh the page<br>
      <small>Error: ${error.message}</small>
    `;
    return;
  }

  document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('dropArea').querySelector('h2').textContent = file.name;
    document.getElementById('dropArea').querySelector('p').textContent = 
      `${(file.size/(1024*1024)).toFixed(1)}MB - Ready to convert`;
  });

  document.getElementById('convertBtn').addEventListener('click', async () => {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;

    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = true;
    loadingStatus.textContent = 'Converting...';

    try {
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
      await ffmpeg.run(
        '-i', 'input.mp4',
        '-vf', 'fps=10,scale=640:-1',
        '-f', 'gif',
        'output.gif'
      );

      const data = ffmpeg.FS('readFile', 'output.gif');
      const gifUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
      
      document.getElementById('gifPreview').innerHTML = `<img src="${gifUrl}">`;
      document.getElementById('downloadBtn').href = gifUrl;
      document.getElementById('resultArea').classList.remove('hidden');
      loadingStatus.textContent = 'Done!';
      
    } catch (error) {
      loadingStatus.textContent = `Error: ${error.message}`;
    } finally {
      convertBtn.disabled = false;
    }
  });
});
