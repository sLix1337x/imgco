document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing converter...');
  
  // ========================
  // 1. UI Elements Setup
  // ========================
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const convertBtn = document.getElementById('convertBtn');
  const resultArea = document.getElementById('resultArea');
  const gifPreview = document.getElementById('gifPreview');
  const downloadBtn = document.getElementById('downloadBtn');
  const newConversionBtn = document.getElementById('newConversionBtn');
  
  // Create loading status element
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  dropArea.appendChild(loadingStatus);

  // Debug all elements exist
  console.log('UI elements:', {
    fileInput, dropArea, convertBtn, 
    resultArea, gifPreview, downloadBtn
  });

  // ========================
  // 2. FFmpeg Initialization
  // ========================
  console.log('Loading FFmpeg...');
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    wasmPath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm'
  });

  try {
    loadingStatus.textContent = 'Loading converter (25MB)...';
    convertBtn.disabled = true;

    // Show download progress
    ffmpeg.setProgress(({ ratio }) => {
      const percent = Math.round(ratio * 100);
      loadingStatus.textContent = `Downloading: ${percent}% (${Math.round(25 * ratio)}MB/25MB)`;
    });

    // Load with timeout
    await Promise.race([
      ffmpeg.load(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout after 60 seconds')), 60000)
    ]);
    
    loadingStatus.textContent = 'Converter ready!';
    loadingStatus.style.color = '#4CAF50';
    convertBtn.disabled = false;
    console.log('FFmpeg loaded successfully!');

  } catch (error) {
    loadingStatus.innerHTML = `
      Failed to load converter:<br>
      1. Refresh the page<br>
      2. Use Chrome/Firefox<br>
      3. Check internet connection<br>
      <small>${error.message}</small>
    `;
    loadingStatus.style.color = '#F44336';
    console.error('FFmpeg loading failed:', error);
    return;
  }

  // ========================
  // 3. File Handling
  // ========================
  console.log('Setting up file handlers...');
  
  // Drag and drop events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop area
  ['dragenter', 'dragover'].forEach(event => {
    dropArea.addEventListener(event, highlight, false);
  });

  ['dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, unhighlight, false);
  });

  function highlight() { 
    dropArea.classList.add('highlight');
    console.log('Drag active');
  }

  function unhighlight() { 
    dropArea.classList.remove('highlight');
  }

  // Handle dropped files
  dropArea.addEventListener('drop', handleDrop, false);
  fileInput.addEventListener('change', handleFileSelect);

  function handleDrop(e) {
    console.log('Files dropped:', e.dataTransfer.files);
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      handleFiles(files);
    }
  }

  function handleFileSelect() {
    console.log('File selected:', fileInput.files);
    if (fileInput.files.length) {
      handleFiles(fileInput.files);
    }
  }

  // Main file processing function
  async function handleFiles(files) {
    try {
      console.log('Handling files:', files);
      
      if (!files || !files.length) {
        throw new Error('No files received');
      }

      const file = files[0];
      console.log('Processing file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error(`Unsupported file type: ${file.type}. Please upload a video file.`);
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error(`File too large: ${(file.size/(1024*1024)).toFixed(1)}MB (max 50MB)`);
      }

      // Update UI
      dropArea.querySelector('h2').textContent = file.name;
      dropArea.querySelector('p').textContent = `${(file.size/(1024*1024)).toFixed(1)}MB - Ready to convert`;
      
      // Enable convert button if FFmpeg is ready
      if (ffmpeg.isLoaded()) {
        convertBtn.disabled = false;
      }

    } catch (error) {
      console.error('File handling error:', error);
      dropArea.querySelector('h2').textContent = 'Upload Failed';
      dropArea.querySelector('p').textContent = error.message;
      dropArea.style.borderColor = '#F44336';
      setTimeout(() => {
        dropArea.style.borderColor = '';
      }, 2000);
    }
  }

  // ========================
  // 4. Conversion Function
  // ========================
  convertBtn.addEventListener('click', async () => {
    if (!fileInput.files.length) {
      alert('Please select a file first');
      return;
    }

    const file = fileInput.files[0];
    const quality = document.getElementById('quality').value;
    const startTime = document.getElementById('startTime').value;
    const duration = document.getElementById('duration').value;
    const fps = document.getElementById('fps').value;

    console.log('Starting conversion with settings:', {
      quality, startTime, duration, fps
    });

    // Validate inputs
    if (duration <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    // UI Updates
    convertBtn.textContent = 'Converting...';
    convertBtn.disabled = true;
    loadingStatus.textContent = 'Processing video...';
    loadingStatus.style.color = '#2196F3';

    try {
      const gifBlob = await convertToGif(file, quality, startTime, duration, fps);
      displayResult(gifBlob);
      
    } catch (error) {
      console.error('Conversion failed:', error);
      loadingStatus.textContent = `Error: ${error.message}`;
      loadingStatus.style.color = '#F44336';
      
    } finally {
      convertBtn.textContent = 'Convert to GIF';
    }
  });

  async function convertToGif(file, quality, startTime, duration, fps) {
    console.log('Beginning conversion...');
    
    // Quality settings
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

    // Write file to FFmpeg's virtual filesystem
    console.log('Writing file to FFmpeg FS...');
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
    
    // Run conversion
    console.log('Executing FFmpeg command...');
    await ffmpeg.run(
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-i', 'input.mp4',
      ...qualityParams,
      '-f', 'gif',
      'output.gif'
    );

    // Read result
    console.log('Reading output file...');
    const data = ffmpeg.FS('readFile', 'output.gif');
    
    return new Blob([data.buffer], { type: 'image/gif' });
  }

  function displayResult(gifBlob) {
    console.log('Displaying result...');
    const gifUrl = URL.createObjectURL(gifBlob);
    
    // Create image preview
    gifPreview.innerHTML = '';
    const img = document.createElement('img');
    img.src = gifUrl;
    img.alt = 'Converted GIF';
    gifPreview.appendChild(img);
    
    // Set up download
    downloadBtn.href = gifUrl;
    downloadBtn.download = `converted-${Date.now()}.gif`;
    
    // Show result area
    resultArea.classList.remove('hidden');
    loadingStatus.textContent = 'Conversion complete!';
    loadingStatus.style.color = '#4CAF50';
    
    console.log('Conversion successful!');
  }

  // ========================
  // 5. Reset Function
  // ========================
  newConversionBtn.addEventListener('click', () => {
    console.log('Resetting converter...');
    fileInput.value = '';
    dropArea.querySelector('h2').textContent = 'Upload MP4 File';
    dropArea.querySelector('p').textContent = 'Drag & drop your video file here or click to browse';
    resultArea.classList.add('hidden');
    convertBtn.disabled = true;
  });

  // ========================
  // 6. Debug Helpers
  // ========================
  // Click drop zone to trigger file input
  dropArea.addEventListener('click', () => {
    fileInput.click();
  });

  // Log all events for debugging
  fileInput.addEventListener('change', () => {
    console.log('File input changed:', fileInput.files);
  });

  console.log('Converter initialized successfully!');
});
