document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const loadingStatus = document.createElement('div');
  loadingStatus.className = 'loading-status';
  dropArea.appendChild(loadingStatus);

  // Video element for processing
  const video = document.createElement('video');
  video.style.display = 'none';
  document.body.appendChild(video);

  // File handling
  fileInput.addEventListener('change', handleFiles);
  
  function handleFiles(e) {
    const file = e.target.files[0];
    if (!file || !file.type.includes('video')) {
      alert('Please select a video file');
      return;
    }

    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    
    dropArea.querySelector('h2').textContent = file.name;
    dropArea.querySelector('p').textContent = `${(file.size/(1024*1024)).toFixed(1)}MB - Ready to convert`;
    convertBtn.disabled = false;
  }

  // Conversion
  convertBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    convertBtn.disabled = true;
    loadingStatus.textContent = 'Preparing...';

    // Wait for video to load
    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
      if (video.readyState >= 3) resolve(); // Already loaded
    });

    // Get user settings
    const fps = parseInt(document.getElementById('fps').value);
    const duration = parseInt(document.getElementById('duration').value);
    const startTime = parseInt(document.getElementById('startTime').value);
    
    // Setup GIF encoder
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: video.videoWidth,
      height: video.videoHeight,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js/dist/gif.worker.js'
    });

    // Process frames
    const frameCount = Math.min(duration * fps, 100); // Max 100 frames
    const interval = 1 / fps;
    
    loadingStatus.textContent = `Processing 0/${frameCount} frames...`;
    
    for (let i = 0; i < frameCount; i++) {
      const time = startTime + i * interval;
      await processFrame(video, time, gif);
      loadingStatus.textContent = `Processing ${i+1}/${frameCount} frames...`;
    }

    // Render GIF
    gif.on('finished', (blob) => {
      const gifUrl = URL.createObjectURL(blob);
      document.getElementById('gifPreview').innerHTML = `<img src="${gifUrl}">`;
      document.getElementById('downloadBtn').href = gifUrl;
      document.getElementById('resultArea').classList.remove('hidden');
      loadingStatus.textContent = 'Done!';
      convertBtn.disabled = false;
    });

    gif.render();
  });

  // Process individual frame
  function processFrame(video, time) {
    return new Promise(resolve => {
      video.currentTime = time;
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        gif.addFrame(canvas, {delay: 1000 / fps, copy: true});
        resolve();
      };
    });
  }
});
