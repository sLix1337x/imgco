// MP4-to-GIF Converter - Final Working Version
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Setup UI
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  document.getElementById('dropArea').appendChild(loadingStatus);
  
  // 2. Configure FFmpeg with reliable CDN
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    wasmPath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm'
  });

  // 3. Load FFmpeg with error handling
  try {
    loadingStatus.textContent = 'Loading converter (20MB)...';
    
    // Show loading progress
    ffmpeg.setProgress(({ ratio }) => {
      const percent = Math.round(ratio * 100);
      loadingStatus.textContent = `Downloading: ${percent}% - Please wait...`;
    });

    // Load with 60-second timeout
    await Promise.race([
      ffmpeg.load(),
      new Promise((_, reject) => 
        setTimeout(() => reject('Timeout after 60 seconds'), 60000)
      )
    ]);
    
    loadingStatus.textContent = 'Ready to convert!';
    document.getElementById('convertBtn').disabled = false;

  } catch (error) {
    loadingStatus.innerHTML = `
      <strong>Fix:</strong><br>
      1. Refresh page<br>
      2. Try Chrome/Firefox<br>
      3. Check internet<br>
      <small>${error}</small>
    `;
    console.error('FFmpeg error:', error);
    return;
  }

  // 4. File handling
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

  // 5. Conversion function
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
      // Write file to FFmpeg's filesystem
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
      
      // Convert with reliable settings
      await ffmpeg.run(
        '-i', 'input.mp4',          // Input file
        '-vf', 'fps=10,scale=640:-1', // 10 FPS, width 640px
        '-f', 'gif',               // Output format
        'output.gif'               // Output file
      );

      // Get result
      const data = ffmpeg.FS('readFile', 'output.gif');
      const gifUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
      
      // Display result
      document.getElementById('gifPreview').innerHTML = `<img src="${gifUrl}" alt="Converted GIF">`;
      document.getElementById('downloadBtn').href = gifUrl;
      document.getElementById('resultArea').classList.remove('hidden');
      loadingStatus.textContent = 'Done!';
      
    } catch (error) {
      console.error('Conversion failed:', error);
      loadingStatus.textContent = `Error: ${error.message}`;
      alert('Conversion failed. Try a shorter video or different format.');
    } finally {
      convertBtn.disabled = false;
    }
  });
});
