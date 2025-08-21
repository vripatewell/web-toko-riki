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

    // ✅ Tambahan untuk kategori Script
    const menuContentSection = document.getElementById('menu-content-section');
    const menuContentInput = document.getElementById('product-menu-content');

    // ✅ Daftar produk
    const productListDiv = document.getElementById('product-list');
    
    const API_BASE_URL = '/api';
    let activeToastTimeout = null;

    // ✅ Toast
    function showToast(message, type = 'info', duration = 3000) {
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

        activeToastTimeout = setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    // ✅ Cek sesi login
    if (sessionStorage.getItem('isAdminAuthenticated')) {
        loginScreen.style.display = 'none';
        productFormScreen.style.display = 'block';
        loadProducts();
    }

    // ✅ Handle login
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
            loadProducts();
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
    
    // ✅ Munculkan field sesuai kategori
    categorySelect.addEventListener('change', () => {
        stockPhotoSection.style.display = categorySelect.value === 'Stock Akun' ? 'block' : 'none';
        menuContentSection.style.display = categorySelect.value === 'Script' ? 'block' : 'none';
    });

    // ✅ Tambah produk
    addButton.addEventListener('click', async () => {
        const productData = {
            category: categorySelect.value,
            nama: nameInput.value.trim(),
            harga: parseInt(priceInput.value, 10),
            deskripsiPanjang: descriptionInput.value.trim(),
            images: photosInput.value.split(',').map(link => link.trim()).filter(Boolean),
            createdAt: new Date().toISOString()
        };
        
        if (categorySelect.value === 'Script') {
            productData.menuContent = menuContentInput.value.trim();
        }

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
            menuContentInput.value = '';
            loadProducts();
        } catch (error) {
            showToast(error.message || 'Gagal menambahkan produk.', 'error');
        } finally {
            addButton.textContent = 'Tambah Produk';
            addButton.disabled = false;
        }
    });

    // ✅ Load daftar produk
    async function loadProducts() {
        productListDiv.innerHTML = 'Memuat...';
        try {
            const res = await fetch('/products.json');
            const data = await res.json();
            let html = '';
            Object.keys(data).forEach(category => {
                html += `<h4>${category}</h4>`;
                data[category].forEach(prod => {
                    html += `
                        <div class="product-item-admin">
                            <span>${prod.nama} - Rp${prod.harga}</span>
                            <button class="delete-btn" data-id="${prod.id}" data-cat="${category}">Hapus</button>
                        </div>
                    `;
                });
            });
            productListDiv.innerHTML = html;

            // Listener delete
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = parseInt(btn.dataset.id);
                    const category = btn.dataset.cat;
                    if (confirm(`Hapus produk ${id} dari kategori ${category}?`)) {
                        try {
                            const res = await fetch('/api/deleteProduct', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id, category })
                            });
                            const result = await res.json();
                            if (!res.ok) throw new Error(result.message);
                            showToast(result.message, 'success');
                            loadProducts();
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    }
                });
            });
        } catch (err) {
            productListDiv.innerHTML = 'Gagal memuat produk.';
        }
    }
});
