document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check for SharedArrayBuffer support
  if (typeof SharedArrayBuffer === 'undefined') {
    document.getElementById('dropArea').innerHTML = `
      <h2>Browser Compatibility Required</h2>
      <p>Please use Chrome/Firefox with these settings:</p>
      <ol>
        <li>Visit <b>chrome://flags</b></li>
        <li>Enable <b>#enable-webassembly-threads</b></li>
        <li>Reload browser</li>
      </ol>
      <p>Or try Firefox which supports this feature by default.</p>
    `;
    return;
  }

  // 2. Setup loading status
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  document.getElementById('dropArea').appendChild(loadingStatus);

  // 3. Initialize FFmpeg with fallback
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.1/dist/ffmpeg-core.js',
    wasmPath: 'https://unpkg.com/@ffmpeg/core@0.10.1/dist/ffmpeg-core.wasm'
  });

  // 4. Load FFmpeg
  try {
    loadingStatus.textContent = 'Loading converter...';
    await ffmpeg.load();
    loadingStatus.textContent = 'Ready to convert!';
    document.getElementById('convertBtn').disabled = false;
  } catch (error) {
    loadingStatus.innerHTML = `
      <strong>Solution:</strong><br>
      1. <a href="https://unpkg.com/@ffmpeg/core@0.10.1/dist/ffmpeg-core.js" download>Download FFmpeg</a><br>
      2. <a href="https://unpkg.com/@ffmpeg/core@0.10.1/dist/ffmpeg-core.wasm" download>Download WASM</a><br>
      3. Add them to your project folder<br>
      4. Refresh the page<br>
      <small>Error: ${error.message}</small>
    `;
    return;
  }

  // 5. File handling
  document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.includes('video')) {
      alert('Please upload a video file (MP4, MOV, etc.)');
      return;
    }

    document.getElementById('dropArea').querySelector('h2').textContent = file.name;
    document.getElementById('dropArea').querySelector('p').textContent = 
      `${(file.size/(1024*1024)).toFixed(1)}MB - Ready to convert`;
  });

  // 6. Conversion function
  document.getElementById('convertBtn').addEventListener('click', async () => {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
      alert('Please select a file first');
      return;
    }

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
      
      document.getElementById('gifPreview').innerHTML = `<img src="${gifUrl}" alt="Converted GIF">`;
      document.getElementById('downloadBtn').href = gifUrl;
      document.getElementById('resultArea').classList.remove('hidden');
      loadingStatus.textContent = 'Conversion complete!';
      
    } catch (error) {
      console.error('Conversion error:', error);
      loadingStatus.textContent = `Error: ${error.message}`;
      alert('Conversion failed. Please try a different file.');
    } finally {
      convertBtn.disabled = false;
    }
  });
});
