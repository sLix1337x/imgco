// MP4 to GIF Converter - Debugged Version
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded - initializing...');

    // 1. UI Elements
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const convertBtn = document.getElementById('convertBtn');
    const resultArea = document.getElementById('resultArea');
    const gifPreview = document.getElementById('gifPreview');
    const loadingStatus = document.createElement('div');
    loadingStatus.className = 'loading-status';
    dropArea.appendChild(loadingStatus);

    // 2. FFmpeg Setup
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({
        log: true,
        corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });

    // 3. Load FFmpeg
    async function loadFFmpeg() {
        try {
            console.log('Loading FFmpeg...');
            loadingStatus.textContent = 'Loading converter (25MB)...';
            
            ffmpeg.setProgress(function({ ratio }) {
                const percent = Math.round(ratio * 100);
                loadingStatus.textContent = `Downloading: ${percent}%`;
            });

            await ffmpeg.load();
            console.log('FFmpeg loaded successfully');
            loadingStatus.textContent = 'Converter ready!';
            return true;
        } catch (error) {
            console.error('FFmpeg load error:', error);
            loadingStatus.textContent = 'Error loading converter. Please refresh.';
            return false;
        }
    }

    // 4. File Handling
    function setupFileHandlers() {
        console.log('Setting up file handlers...');

        // Drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        dropArea.addEventListener('drop', function(e) {
            console.log('File dropped');
            const files = e.dataTransfer.files;
            if (files.length) {
                handleFiles(files);
            }
        });

        fileInput.addEventListener('change', function() {
            console.log('File selected via input');
            if (this.files.length) {
                handleFiles(this.files);
            }
        });
    }

    // 5. Handle Uploaded Files
    function handleFiles(files) {
        console.log('Handling files:', files);
        const file = files[0];

        if (!file.type.match('video.*')) {
            console.warn('Not a video file:', file.type);
            alert('Please upload a video file (MP4, MOV, etc.)');
            return;
        }

        console.log('Valid video file detected');
        dropArea.querySelector('h2').textContent = file.name;
        dropArea.querySelector('p').textContent = `${(file.size/(1024*1024)).toFixed(1)}MB - Ready to convert`;
        
        if (ffmpeg.isLoaded()) {
            convertBtn.disabled = false;
        }
    }

    // 6. Conversion Function
    convertBtn.addEventListener('click', async function() {
        if (!fileInput.files.length) {
            alert('Please select a file first');
            return;
        }

        console.log('Starting conversion...');
        const file = fileInput.files[0];
        convertBtn.disabled = true;
        loadingStatus.textContent = 'Converting...';

        try {
            ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));
            
            await ffmpeg.run(
                '-i', 'input.mp4',
                '-vf', 'fps=10,scale=640:-1:flags=lanczos',
                '-f', 'gif',
                'output.gif'
            );

            const data = ffmpeg.FS('readFile', 'output.gif');
            const gifUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
            
            gifPreview.innerHTML = `<img src="${gifUrl}" alt="Converted GIF">`;
            downloadBtn.href = gifUrl;
            resultArea.classList.remove('hidden');
            
            console.log('Conversion successful!');
            loadingStatus.textContent = 'Done!';

        } catch (error) {
            console.error('Conversion failed:', error);
            loadingStatus.textContent = 'Conversion failed';
            alert('Conversion error: ' + error.message);
        } finally {
            convertBtn.disabled = false;
        }
    });

    // 7. Initialize
    (async function init() {
        setupFileHandlers();
        await loadFFmpeg();
        console.log('Converter ready');
    })();
});
