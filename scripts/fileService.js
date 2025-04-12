import {showToast} from './uiService.js';

export class FileService {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.fileUploadBtn = document.getElementById('fileUploadBtn');
        this.selectedFiles = [];
        this.setupListeners();
    }

    setupListeners() {
        this.fileUploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', async (e) => {
            const selectedFiles = await this.handleFileSelect(e);
            if (selectedFiles && selectedFiles.length > 0) {
                this.selectedFiles = selectedFiles;
                this.showFilePreview();
                showToast(`${selectedFiles.length} ${selectedFiles.length > 1 ? 'files selected' : 'file selected'}`);
                this.fileInput.value = '';
            }
        })
    }

    showFilePreview() {
        // Find or create preview container
        let previewContainer = document.querySelector('.file-preview');
        const inputBox = document.querySelector('.input-box');
        
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.className = 'file-preview';
            inputBox.insertBefore(previewContainer, inputBox.firstChild);
        } else {
            previewContainer.innerHTML = '';
        }

        // Create and append file items
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">
                    <i class="fas ${this.getFileIcon(file.type)}"></i>
                    ${file.name}
                </span>
                <span class="file-size">${file.size}</span>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            fileItem.querySelector('.remove-file').addEventListener('click', () => {
                this.selectedFiles.splice(index, 1);
                if (this.selectedFiles.length === 0) {
                    previewContainer.remove();
                } else {
                    this.showFilePreview();
                }
            });

            previewContainer.appendChild(fileItem);
        });
    }

    // Get the appropriate icon
    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fa-image';
        if (fileType === 'application/pdf') return 'fa-file-pdf';
        if (fileType === 'text/plain') return 'fa-file-alt';
        if (fileType.includes('word')) return 'fa-file-word';
        return 'fa-file';
    }

    async handleFileSelect(event) {
        const files = Array.from(event.target.files);
        const validFiles = [];
        const invalidFiles = [];

        // Wait for all files to be processed
        await Promise.all(files.map(async file => {
            if (this.validateFile(file)) {
                const processedFile = await this.processFile(file);
                validFiles.push(processedFile);
            } else {
                invalidFiles.push(file.name);
            }
        }));

        if (invalidFiles.length > 0) {
            showToast(`Invalid files: ${invalidFiles.join(', ')}`);
        }

        return validFiles;
    }

    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; //5MB
        const textBasedTypes = [
            // Programming languages
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/javascript',
            'application/json',
            'text/xml',
            'application/xml',
            'text/markdown',
            'text/x-python',
            'text/x-java',
            'text/x-c',
            'text/x-cpp',
            
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            
            // Config files
            'application/x-yaml',
            'text/csv',
            'application/x-config',
            
            // Source code files (custom mime types)
            'text/x-typescript',
            'text/x-php',
            'text/x-ruby',
            'text/x-go',
            'text/x-rust',
            'text/x-swift'
        ];

        // Accept any file in list
        const isTextBased = file.type.startsWith('text/') ||
                            textBasedTypes.includes(file.type) ||
                            this.hasTextFileExtension(file.name);
        
        const isImage = file.type.startsWith('image/');

        return file.size <= maxSize && (isTextBased || isImage);
    }

    hasTextFileExtension(fileName) {
        const textExtensions = [
            // Programming
            '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.php',
            '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.groovy', '.dart',
            
            // Web
            '.html', '.htm', '.css', '.scss', '.sass', '.less', '.jsx', '.tsx',
            '.vue', '.svelte', '.angular',
            
            // Data & Config
            '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config',
            '.env', '.properties', '.gradle', '.pom', '.csv', '.sql',
            
            // Documentation
            '.md', '.txt', '.rtf', '.log', '.readme',
            
            // Shell scripts
            '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1'
        ];

        return textExtensions.some(ext => fileName.toLowerCase().endsWith(ext.toLowerCase()));
    }

    async processFile(file) {
        const isImage = file.type.startsWith('image/');
        let preview = null;
        let data = null;

        if (isImage) {
            preview = await this.createImagePreview(file);
            data = await this.fileToBase64(file)
        }
        else {
            try {
                data = await this.readFileAsText(file);
            }
            catch (error) {
                console.error('Error reading file:', error);
                data = await this.fileToBase64(file);
            }
        }

        return {
            name: file.name,
            type: file.type || this.getFileTypeFromExtension(file.name),
            size: this.formatFileSize(file.size),
            preview,
            data
        };
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    resolve(text)
                }
                catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    getFileTypeFromExtension(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            // Programming Languages
        'js': 'text/javascript',
        'ts': 'text/typescript',
        'py': 'text/x-python',
        'java': 'text/x-java',
        'cpp': 'text/x-cpp',
        'c': 'text/x-c',
        'cs': 'text/x-csharp',
        'php': 'text/x-php',
        'rb': 'text/x-ruby',
        'go': 'text/x-go',
        'rs': 'text/x-rust',
        'swift': 'text/x-swift',
        
        // Web Technologies
        'html': 'text/html',
        'css': 'text/css',
        'jsx': 'text/javascript',
        'tsx': 'text/typescript',
        
        // Data & Config
        'json': 'application/json',
        'xml': 'text/xml',
        'yaml': 'application/x-yaml',
        'yml': 'application/x-yaml',
        'csv': 'text/csv',
        'sql': 'text/x-sql',
        
        // Documentation
        'md': 'text/markdown',
        'txt': 'text/plain',
        'log': 'text/plain',
        
        // Shell Scripts
        'sh': 'text/x-sh',
        'bash': 'text/x-sh',
        'bat': 'text/plain',
        'ps1': 'text/plain'
        };

        return mimeTypes[ext] || 'text/plain';
    }

    clearFiles() {
        this.selectedFiles = [];
        this.fileInput.value = '';
        const preview = document.querySelector('.file-preview');
        if (preview) {
            preview.remove();
        }
    }

    getSelectedFiles() {
        return this.selectedFiles;
    }

    async createImagePreview(file) {
        return new Promise((resolve) => {     
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
