document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const convertBtn = document.getElementById('convertBtn');
    const resultArea = document.getElementById('resultArea');
    const gifPreview = document.getElementById('gifPreview');
    const downloadBtn = document.getElementById('downloadBtn');
    const newConversionBtn = document.getElementById('newConversionBtn');
    
    // FFmpeg setup
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    let ffmpegLoaded = false;
    
    // Load FFmpeg
    async function loadFFmpeg() {
        if (!ffmpegLoaded) {
            convertBtn.textContent = 'Loading converter...';
            convertBtn.disabled = true;
            await ffmpeg.load();
            ffmpegLoaded = true;
            convertBtn.textContent = 'Convert to GIF';
            if (fileInput.files.length > 0) {
                convertBtn.disabled = false;
            }
        }
    }
    
    // Initialize FFmpeg loading
    loadFFmpeg().catch(console.error);
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            fileInput.files = files;
            handleFiles(files);
        }
    }
    
    // File input change handler
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files);
        }
    });
    
    // Handle selected files
    function handleFiles(files) {
        const file = files[0];
        
        // Check if file is a video
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file.');
            return;
        }
        
        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File size exceeds 50MB limit.');
            return;
        }
        
        // Update UI
        dropArea.querySelector('h2').textContent = file.name;
        dropArea.querySelector('p').textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        
        if (ffmpegLoaded) {
            convertBtn.disabled = false;
        }
    }
    
    // Convert button click handler
    convertBtn.addEventListener('click', async function() {
        if (!fileInput.files.length) return;
        
        const file = fileInput.files[0];
        const quality = document.getElementById('quality').value;
        const startTime = document.getElementById('startTime').value;
        const duration = document.getElementById('duration').value;
        const fps = document.getElementById('fps').value;
        
        // Validate inputs
        if (duration <= 0) {
            alert('Duration must be greater than 0');
            return;
        }
        
        // Show loading state
        convertBtn.textContent = 'Converting...';
        convertBtn.disabled = true;
        
        try {
            // Convert video to GIF
            const gifData = await convertToGif(file, quality, startTime, duration, fps);
            
            // Display result
            displayResult(gifData);
        } catch (error) {
            console.error('Conversion error:', error);
            alert('Conversion failed. Please try again.');
        } finally {
            convertBtn.textContent = 'Convert to GIF';
        }
    });
    
    // Convert video to GIF using FFmpeg
    async function convertToGif(file, quality, startTime, duration, fps) {
        // Set FFmpeg quality parameters
        let qualityParams = [];
        switch (quality) {
            case 'high':
                qualityParams = ['-b:v', '2M', '-filter_complex', '[0:v] fps=15,scale=640:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse'];
                break;
            case 'medium':
                qualityParams = ['-b:v', '1M', '-filter_complex', '[0:v] fps=10,scale=480:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse'];
                break;
            case 'low':
                qualityParams = ['-b:v', '500K', '-filter_complex', '[0:v] fps=5,scale=320:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse'];
                break;
        }
        
        // Write the file to FFmpeg's file system
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
        
        // Run FFmpeg command
        await ffmpeg.run(
            '-ss', startTime.toString(),
            '-t', duration.toString(),
            '-i', 'input.mp4',
            ...qualityParams,
            '-f', 'gif',
            'output.gif'
        );
        
        // Read the result
        const data = ffmpeg.FS('readFile', 'output.gif');
        
        return new Blob([data.buffer], { type: 'image/gif' });
    }
    
    // Display the converted GIF
    function displayResult(gifBlob) {
        const gifUrl = URL.createObjectURL(gifBlob);
        
        // Create image element
        const img = document.createElement('img');
        img.src = gifUrl;
        img.alt = 'Converted GIF';
        
        // Clear previous preview and add new one
        gifPreview.innerHTML = '';
        gifPreview.appendChild(img);
        
        // Set download link
        downloadBtn.href = gifUrl;
        
        // Show result area
        resultArea.classList.remove('hidden');
        
        // Scroll to result
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }
    
    // New conversion button handler
    newConversionBtn.addEventListener('click', function() {
        // Reset file input
        fileInput.value = '';
        
        // Reset drop area text
        dropArea.querySelector('h2').textContent = 'Upload MP4 File';
        dropArea.querySelector('p').textContent = 'Drag & drop your video file here or click to browse';
        
        // Reset controls to defaults
        document.getElementById('quality').value = 'medium';
        document.getElementById('startTime').value = '0';
        document.getElementById('duration').value = '5';
        document.getElementById('fps').value = '10';
        
        // Hide result area
        resultArea.classList.add('hidden');
        
        // Disable convert button
        convertBtn.disabled = true;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});