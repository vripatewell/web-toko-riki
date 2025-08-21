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
    const scriptMenuSection = document.getElementById('scriptMenuSection');
    const scriptMenuContentInput = document.getElementById('script-menu-content');
    const stockPhotoSection = document.getElementById('stock-photo-section');
    const photosInput = document.getElementById('product-photos');
    const addButton = document.getElementById('add-product-button');

    // ✅ Delete dan Urutkan Produk
    const deleteCategorySelect = document.getElementById('delete-category');
    const deleteProductList = document.getElementById('delete-product-list');
    const saveOrderButton = document.getElementById('save-order-button');
    let currentProducts = []; // Untuk menyimpan data produk lokal

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
        const category = categorySelect.value;
        stockPhotoSection.style.display = category === 'Stock Akun' || category === 'Logo' ? 'block' : 'none';
        scriptMenuSection.style.display = category === 'Script' ? 'block' : 'none';
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
        if (productData.category === 'Script') {
            productData.menuContent = scriptMenuContentInput.value.trim();
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
            scriptMenuContentInput.value = '';
        } catch (err) {
            showToast(err.message || 'Gagal menambahkan produk.', 'error');
        } finally {
            addButton.textContent = 'Tambah Produk';
            addButton.disabled = false;
        }
    });

    // ✅ Hapus & Urutkan Produk
    deleteCategorySelect.addEventListener('change', async () => {
        deleteProductList.innerHTML = 'Memuat...';
        saveOrderButton.style.display = 'none';
        const category = deleteCategorySelect.value;
        if (!category) return (deleteProductList.innerHTML = '');
        try {
            const res = await fetch('/products.json');
            const data = await res.json();
            currentProducts = data[category] || [];
            if (currentProducts.length === 0) {
                deleteProductList.innerHTML = '<p>Tidak ada produk di kategori ini.</p>';
                return;
            }
            renderDeleteList(currentProducts);
        } catch (err) {
            deleteProductList.innerHTML = '<p>Gagal memuat produk.</p>';
        }
    });

    function renderDeleteList(productsToRender) {
        deleteProductList.innerHTML = '';
        productsToRender.forEach(prod => {
            const isNew = prod.createdAt && Date.now() - new Date(prod.createdAt).getTime() < 24 * 60 * 60 * 1000;
            const item = document.createElement('div');
            item.className = 'delete-item';
            item.setAttribute('draggable', 'true');
            item.dataset.id = prod.id;
            item.innerHTML = `
              <span>${prod.nama} - Rp${prod.harga} ${isNew ? '<span class="new-badge">NEW</span>' : ''}</span>
              <button class="delete-btn">Hapus</button>
            `;
            deleteProductList.appendChild(item);
        });

        setupDragAndDrop();
        setupDeleteButtons();
        saveOrderButton.style.display = 'block';
    }

    function setupDeleteButtons() {
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
                    parent.remove();
                    currentProducts = currentProducts.filter(p => p.id !== id);
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    }

    function setupDragAndDrop() {
        let draggingItem = null;

        deleteProductList.addEventListener('dragstart', (e) => {
            draggingItem = e.target.closest('.delete-item');
            if (draggingItem) {
                setTimeout(() => draggingItem.classList.add('dragging'), 0);
            }
        });

        deleteProductList.addEventListener('dragend', () => {
            if (draggingItem) {
                draggingItem.classList.remove('dragging');
                draggingItem = null;
            }
        });

        deleteProductList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(deleteProductList, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                deleteProductList.appendChild(draggable);
            } else {
                deleteProductList.insertBefore(draggable, afterElement);
            }
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.delete-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    saveOrderButton.addEventListener('click', async () => {
        const newOrder = [...deleteProductList.children].map(item => parseInt(item.dataset.id));
        const category = deleteCategorySelect.value;
        if (!category || newOrder.length === 0) return;

        showToast('Menyimpan urutan...', 'info', 5000);
        try {
            const res = await fetch('/api/reorderProducts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, order: newOrder })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            showToast('Urutan berhasil disimpan.', 'success');
        } catch (err) {
            showToast(err.message || 'Gagal menyimpan urutan.', 'error');
        }
    });

    // Cek status login saat halaman dimuat
    if (sessionStorage.getItem('isAdminAuthenticated')) {
        loginScreen.style.display = 'none';
        productFormScreen.style.display = 'block';
    }
});
