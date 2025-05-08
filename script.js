document.addEventListener('DOMContentLoaded', async () => {
  // ===== 1. UI Elements =====
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const convertBtn = document.getElementById('convertBtn');
  const resultArea = document.getElementById('resultArea');
  const gifPreview = document.getElementById('gifPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  dropArea.appendChild(loadingStatus);

  // ===== 2. FFmpeg Initialization =====
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    wasmPath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm'
  });

  // Load FFmpeg with progress tracking
  try {
    loadingStatus.textContent = 'Loading converter (25MB)...';
    convertBtn.disabled = true;

    ffmpeg.setProgress(({ ratio }) => {
      const percent = Math.round(ratio * 100);
      loadingStatus.textContent = `Downloading: ${percent}% (${Math.round(25 * ratio)}MB/25MB)`;
    });

    await Promise.race([
      ffmpeg.load(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout after 60 seconds')), 60000)
    ]);
    
    loadingStatus.textContent = 'Converter ready!';
    loadingStatus.style.color = '#4CAF50';
    convertBtn.disabled = false;

  } catch (error) {
    loadingStatus.innerHTML = `
      Failed to load converter:<br>
      1. Refresh the page<br>
      2. Use Chrome/Firefox<br>
      3. Check internet connection<br>
      <small>${error.message}</small>
    `;
    loadingStatus.style.color = '#F44336';
    console.error('FFmpeg error:', error);
    return;
  }

  // ===== 3. File Handling =====
  // Drag and drop functionality
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(event => {
    dropArea.addEventListener(event, highlight, false);
  });

  ['dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, unhighlight, false);
  });

  function highlight() { dropArea.classList.add('highlight'); }
  function unhighlight() { dropArea.classList.remove('highlight'); }

  dropArea.addEventListener('drop', handleDrop, false);
  fileInput.addEventListener('change', handleFileSelect);

  function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      handleFiles(files);
    }
  }

  function handleFileSelect() {
    if (fileInput.files.length) {
      handleFiles(fileInput.files);
    }
  }

  function handleFiles(files) {
    const file = files[0];
    
    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file (MP4, MOV, etc.)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit');
      return;
    }

    dropArea.querySelector('h2').textContent = file.name;
    dropArea.querySelector('p').textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }

  // ===== 4. Conversion Function =====
  convertBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) return;

    const file = fileInput.files[0];
    const quality = document.getElementById('quality').value;
    const startTime = document.getElementById('startTime').value;
    const duration = document.getElementById('duration').value;
    const fps = document.getElementById('fps').value;

    if (duration <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    convertBtn.textContent = 'Converting...';
    convertBtn.disabled = true;
    loadingStatus.textContent = 'Processing video...';
    loadingStatus.style.color = '#2196F3';

    try {
      const gifBlob = await convertToGif(file, quality, startTime, duration, fps);
      displayResult(gifBlob);
    } catch (error) {
      console.error('Conversion error:', error);
      loadingStatus.textContent = `Error: ${error.message}`;
      loadingStatus.style.color = '#F44336';
    } finally {
      convertBtn.textContent = 'Convert to GIF';
    }
  });

  async function convertToGif(file, quality, startTime, duration, fps) {
    let qualityParams;
    switch (quality) {
      case 'high':
        qualityParams = ['-b:v', '2M', '-filter_complex', `[0:v] fps=${fps},scale=640:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse`];
        break;
      case 'medium':
        qualityParams = ['-b:v', '1M', '-filter_complex', `[0:v] fps=${fps},scale=480:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse`];
        break;
      case 'low':
        qualityParams = ['-b:v', '500K', '-filter_complex', `[0:v] fps=${fps},scale=320:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse`];
        break;
    }

    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
    
    await ffmpeg.run(
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-i', 'input.mp4',
      ...qualityParams,
      '-f', 'gif',
      'output.gif'
    );

    const data = ffmpeg.FS('readFile', 'output.gif');
    return new Blob([data.buffer], { type: 'image/gif' });
  }

  function displayResult(gifBlob) {
    const gifUrl = URL.createObjectURL(gifBlob);
    gifPreview.innerHTML = `<img src="${gifUrl}" alt="Converted GIF">`;
    downloadBtn.href = gifUrl;
    downloadBtn.download = `converted-${Date.now()}.gif`;
    resultArea.classList.remove('hidden');
    loadingStatus.textContent = 'Conversion complete!';
    loadingStatus.style.color = '#4CAF50';
  }

  // ===== 5. Reset Function =====
  document.getElementById('newConversionBtn').addEventListener('click', () => {
    fileInput.value = '';
    dropArea.querySelector('h2').textContent = 'Upload MP4 File';
    dropArea.querySelector('p').textContent = 'Drag & drop your video file here or click to browse';
    resultArea.classList.add('hidden');
    convertBtn.disabled = true;
  });
});
