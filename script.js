document.addEventListener('DOMContentLoaded', async function() {
  console.log('Starting converter...');
  
  // 1. Get all UI elements
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const convertBtn = document.getElementById('convertBtn');
  const resultArea = document.getElementById('resultArea');
  const gifPreview = document.getElementById('gifPreview');
  
  // Create loading status display
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  dropArea.appendChild(loadingStatus);

  // 2. Configure FFmpeg with multiple CDN fallbacks
  const CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    'https://fastly.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
  ];

  async function loadFFmpeg() {
    const { createFFmpeg, fetchFile } = FFmpeg;
    
    // Try each CDN until one works
    for (let i = 0; i < CDN_URLS.length; i++) {
      try {
        loadingStatus.textContent = `Loading converter (${i+1}/${CDN_URLS.length})...`;
        console.log(`Trying CDN: ${CDN_URLS[i]}`);
        
        const ffmpeg = createFFmpeg({
          log: true,
          corePath: CDN_URLS[i],
          wasmPath: CDN_URLS[i].replace('.js', '.wasm')
        });

        // Load with 30-second timeout
        await Promise.race([
          ffmpeg.load(),
          new Promise((_, reject) => 
            setTimeout(() => reject('Timeout after 30 seconds'), 30000)
          )
        ]);

        console.log('FFmpeg loaded successfully!');
        return { ffmpeg, fetchFile };
        
      } catch (err) {
        console.log(`CDN ${i+1} failed:`, err);
        if (i === CDN_URLS.length - 1) throw err;
      }
    }
  }

  // 3. Initialize FFmpeg
  try {
    const { ffmpeg, fetchFile } = await loadFFmpeg();
    loadingStatus.textContent = 'Ready to convert!';
    loadingStatus.style.color = '#4CAF50';
    console.log('Converter initialized');

    // 4. Handle file selection
    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        handleFile(this.files[0]);
      }
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      dropArea.addEventListener(event, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    dropArea.addEventListener('drop', function(e) {
      const files = e.dataTransfer.files;
      if (files.length) handleFile(files[0]);
    });

    function handleFile(file) {
      console.log('File selected:', file.name);
      
      if (!file.type.includes('video')) {
        alert('Please upload a video file (MP4, MOV, etc.)');
        return;
      }

      dropArea.querySelector('h2').textContent = file.name;
      dropArea.querySelector('p').textContent = `${(file.size/(1024*1024)).toFixed(1)}MB - Ready to convert`;
      convertBtn.disabled = false;
    }

    // 5. Conversion function
    convertBtn.addEventListener('click', async function() {
      if (!fileInput.files.length) {
        alert('Please select a file first');
        return;
      }

      const file = fileInput.files[0];
      console.log('Starting conversion for:', file.name);
      
      convertBtn.disabled = true;
      loadingStatus.textContent = 'Converting...';
      loadingStatus.style.color = '#2196F3';

      try {
        // Write file to FFmpeg's virtual filesystem
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
        
        // Simple conversion command
        await ffmpeg.run(
          '-i', 'input.mp4',          // Input file
          '-vf', 'fps=10,scale=640:-1', // 10 FPS, width 640px
          '-f', 'gif',               // Output format
          'output.gif'               // Output file
        );

        // Get the result
        const data = ffmpeg.FS('readFile', 'output.gif');
        const gifUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
        
        // Display result
        gifPreview.innerHTML = `<img src="${gifUrl}" alt="Converted GIF">`;
        document.getElementById('downloadBtn').href = gifUrl;
        resultArea.classList.remove('hidden');
        
        console.log('Conversion successful!');
        loadingStatus.textContent = 'Conversion complete!';
        
      } catch (error) {
        console.error('Conversion failed:', error);
        loadingStatus.textContent = 'Error during conversion';
        loadingStatus.style.color = '#F44336';
        alert('Conversion failed: ' + error.message);
      } finally {
        convertBtn.disabled = false;
      }
    });

  } catch (error) {
    console.error('Initialization failed:', error);
    loadingStatus.innerHTML = `
      Failed to load converter:<br>
      1. Refresh the page<br>
      2. Try Chrome/Firefox<br>
      3. Check internet connection<br>
      <small>${error.message}</small>
    `;
    loadingStatus.style.color = '#F44336';
  }
});
