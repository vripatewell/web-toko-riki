document.addEventListener('DOMContentLoaded', () => {
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

    // ✅ Script modal
    const scriptModal = document.getElementById('script-modal');
    const scriptFeatureInput = document.getElementById('script-feature-input');
    const addFeatureBtn = document.getElementById('add-feature-btn');
    const scriptFeatureList = document.getElementById('script-feature-list');
    const saveScriptFeatures = document.getElementById('save-script-features');
    const closeScriptModal = document.getElementById('close-script-modal');
    let scriptFeatures = [];

    // ✅ Delete produk
    const deleteCategorySelect = document.getElementById('delete-category');
    const deleteProductList = document.getElementById('delete-product-list');

    const API_BASE_URL = '/api';
    let activeToastTimeout = null;

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

    // ✅ Login
    const handleLogin = async () => {
        const password = passwordInput.value;
        if (!password) return showToast('Password tidak boleh kosong.', 'error');
        loginButton.textContent = 'Memverifikasi...';
        loginButton.disabled = true;
        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            loginScreen.style.display = 'none';
            productFormScreen.style.display = 'block';
            showToast('Login berhasil!', 'success');
        } catch (e) {
            showToast(e.message || 'Password salah.', 'error');
        } finally {
            loginButton.textContent = 'Masuk';
            loginButton.disabled = false;
        }
    };
    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', e => e.key === 'Enter' && handleLogin());

    // ✅ Toggle field tambahan
    categorySelect.addEventListener('change', () => {
        stockPhotoSection.style.display = categorySelect.value === 'Stock Akun' ? 'block' : 'none';
        if (categorySelect.value === 'Script') {
            scriptModal.style.display = 'block';
        }
    });

    // ✅ Modal Script
    addFeatureBtn.addEventListener('click', () => {
        if (!scriptFeatureInput.value.trim()) return;
        scriptFeatures.push(scriptFeatureInput.value.trim());
        const li = document.createElement('li');
        li.textContent = scriptFeatureInput.value.trim();
        scriptFeatureList.appendChild(li);
        scriptFeatureInput.value = '';
    });
    saveScriptFeatures.addEventListener('click', () => {
        scriptModal.style.display = 'none';
    });
    closeScriptModal.addEventListener('click', () => {
        scriptFeatures = [];
        scriptFeatureList.innerHTML = '';
        scriptModal.style.display = 'none';
    });

    // ✅ Tambah produk
    addButton.addEventListener('click', async () => {
        const productData = {
            category: categorySelect.value,
            nama: nameInput.value.trim(),
            harga: parseInt(priceInput.value, 10),
            deskripsiPanjang: descriptionInput.value.trim(),
            images: photosInput.value.split(',').map(l => l.trim()).filter(Boolean),
            createdAt: new Date().toISOString()
        };
        if (categorySelect.value === 'Script') {
            productData.menuContent = scriptFeatures;
        }
        if (!productData.nama || !productData.harga || !productData.deskripsiPanjang) {
            return showToast('Semua kolom wajib diisi.', 'error');
        }
        addButton.textContent = 'Memproses...';
        addButton.disabled = true;
        try {
            const res = await fetch(`${API_BASE_URL}/addProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            showToast(`Produk "${productData.nama}" berhasil ditambahkan.`, 'success');
            nameInput.value = '';
            priceInput.value = '';
            descriptionInput.value = '';
            photosInput.value = '';
            scriptFeatures = [];
            scriptFeatureList.innerHTML = '';
        } catch (err) {
            showToast(err.message || 'Gagal menambahkan produk.', 'error');
        } finally {
            addButton.textContent = 'Tambah Produk';
            addButton.disabled = false;
        }
    });

    // ✅ Hapus produk
    deleteCategorySelect.addEventListener('change', async () => {
        deleteProductList.innerHTML = 'Memuat...';
        if (!deleteCategorySelect.value) return (deleteProductList.innerHTML = '');
        try {
            const res = await fetch('/products.json');
            const data = await res.json();
            const category = deleteCategorySelect.value;
            if (!data[category] || data[category].length === 0) {
                deleteProductList.innerHTML = '<p>Tidak ada produk di kategori ini.</p>';
                return;
            }
            let html = '';
            data[category].forEach(prod => {
                const isNew = prod.createdAt && Date.now() - new Date(prod.createdAt).getTime() < 24*60*60*1000;
                html += `
                  <div class="delete-item" data-id="${prod.id}">
                    <span>${prod.nama} - Rp${prod.harga} ${isNew ? '<span class="new-badge">NEW</span>' : ''}</span>
                    <button class="delete-btn">Hapus</button>
                  </div>`;
            });
            deleteProductList.innerHTML = html;
            deleteProductList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async e => {
                    const parent = e.target.closest('.delete-item');
                    const id = parseInt(parent.dataset.id);
                    try {
                        const res = await fetch('/api/deleteProduct', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id, category: deleteCategorySelect.value })
                        });
                        const result = await res.json();
                        if (!res.ok) throw new Error(result.message);
                        showToast(result.message, 'success');
                        parent.remove(); // ✅ langsung hilang
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                });
            });
        } catch (err) {
            deleteProductList.innerHTML = '<p>Gagal memuat produk.</p>';
        }
    });
});
