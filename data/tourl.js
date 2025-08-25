document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const uploadText = document.getElementById('upload-text');
    const uploadButton = document.getElementById('upload-button');
    const resultContainer = document.getElementById('result-container');
    const notification = document.getElementById('notification');

    let selectedFiles = [];
    let notificationTimeout;

    function showNotification(message, type = 'success') {
        clearTimeout(notificationTimeout);
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    uploadArea.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    
    uploadArea.addEventListener('dragenter', () => uploadArea.classList.add('drag-over'));
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (event) => handleFiles(event.target.files));

    function handleFiles(files) {
        selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        previewContainer.innerHTML = '';
        if (selectedFiles.length === 0) {
            uploadText.textContent = 'Klik atau seret gambar ke sini';
            uploadButton.style.display = 'none';
            return;
        }

        uploadText.textContent = `${selectedFiles.length} gambar dipilih.`;
        uploadButton.style.display = 'block';
        uploadButton.textContent = `Unggah ${selectedFiles.length} Gambar`;

        selectedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'preview-image-wrapper';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                wrapper.appendChild(img);
                previewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    }

    uploadButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        uploadButton.disabled = true;
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = '<h3>Hasil Unggahan:</h3>';
        let successCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            uploadButton.innerHTML = `<span class="spinner"></span> Mengunggah ${i + 1} dari ${selectedFiles.length}...`;
            
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                const response = await fetch('/api/tourl', { method: 'POST', body: formData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal');
                addResultItem(result.link, true);
                successCount++;
            } catch (error) {
                addResultItem(`Gagal mengunggah ${file.name}: ${error.message}`, false);
            }
        }

        uploadButton.innerHTML = 'Selesai!';
        if(successCount > 0) {
            showNotification(`${successCount} gambar berhasil diunggah!`, 'success');
        } else {
            showNotification('Semua gambar gagal diunggah.', 'error');
        }
        
        setTimeout(() => {
            uploadButton.textContent = `Unggah ${selectedFiles.length} Gambar`;
            uploadButton.disabled = false;
        }, 2000);
    });
    
    function addResultItem(link, isSuccess) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = link;
        input.readOnly = true;
        
        itemDiv.appendChild(input);

        if (isSuccess) {
            const button = document.createElement('button');
            button.textContent = 'Salin';
            button.onclick = () => {
                input.select();
                navigator.clipboard.writeText(input.value);
                button.textContent = 'Tersalin!';
                setTimeout(() => { button.textContent = 'Salin'; }, 2000);
            };
            itemDiv.appendChild(button);
        } else {
            input.style.color = 'var(--error-color)';
        }
        
        resultContainer.appendChild(itemDiv);
    }
});