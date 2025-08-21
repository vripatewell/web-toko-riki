document.addEventListener('DOMContentLoaded', () => {
    // Elemen Halaman
    const loginScreen = document.getElementById('login-screen');
    const productFormScreen = document.getElementById('product-form-screen');
    const toastContainer = document.getElementById('toast-container');
    
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    
    const categorySelect = document.getElementById('category');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const descriptionInput = document.getElementById('product-description');
    const stockPhotoSection = document.getElementById('stock-photo-section');
    const photosInput = document.getElementById('product-photos');
    const addButton = document.getElementById('add-product-button');
    
    const API_BASE_URL = '/api';

    // [PERUBAHAN] Variabel untuk melacak notifikasi aktif
    let activeToastTimeout = null;

    // [PERUBAHAN] Fungsi notifikasi toast yang sudah disempurnakan
    function showToast(message, type = 'info', duration = 3000) {
        // Hapus notifikasi lama jika ada
        if (toastContainer.firstChild) {
            clearTimeout(activeToastTimeout);
            toastContainer.innerHTML = '';
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        if (type === 'error') iconClass = 'fas fa-exclamation-circle';

        toast.innerHTML = `<i class="${iconClass}"></i> ${message}`;
        toastContainer.appendChild(toast);

        // Atur timeout untuk menghapus notifikasi baru
        activeToastTimeout = setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    if (sessionStorage.getItem('isAdminAuthenticated')) {
        loginScreen.style.display = 'none';
        productFormScreen.style.display = 'block';
    }

    const handleLogin = async () => {
        const password = passwordInput.value;
        if (!password) {
            showToast('Password tidak boleh kosong.', 'error');
            return;
        }

        loginButton.textContent = 'Memverifikasi...';
        loginButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            loginScreen.style.display = 'none';
            productFormScreen.style.display = 'block';
            showToast('Login berhasil!', 'success');
        } catch (error) {
            showToast(error.message || 'Password salah.', 'error');
        } finally {
            loginButton.textContent = 'Masuk';
            loginButton.disabled = false;
        }
    };

    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    categorySelect.addEventListener('change', () => {
        stockPhotoSection.style.display = categorySelect.value === 'Stock Akun' ? 'block' : 'none';
    });

    addButton.addEventListener('click', async () => {
        const productData = {
            category: categorySelect.value,
            nama: nameInput.value.trim(),
            harga: parseInt(priceInput.value, 10),
            deskripsiPanjang: descriptionInput.value.trim(),
            images: photosInput.value.split(',').map(link => link.trim()).filter(Boolean)
        };
        
        if (!productData.nama || !productData.harga || !productData.deskripsiPanjang) {
            showToast('Semua kolom wajib diisi.', 'error');
            return;
        }

        addButton.textContent = 'Memproses...';
        addButton.disabled = true;
        showToast('Menambahkan produk...', 'info', 2000);

        try {
            const response = await fetch(`${API_BASE_URL}/addProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            showToast(`Produk "${productData.nama}" berhasil ditambahkan.`, 'success');
            nameInput.value = '';
            priceInput.value = '';
            descriptionInput.value = '';
            photosInput.value = '';
        } catch (error) {
            showToast(error.message || 'Gagal menambahkan produk.', 'error');
        } finally {
            addButton.textContent = 'Tambah Produk';
            addButton.disabled = false;
        }
    });
});

