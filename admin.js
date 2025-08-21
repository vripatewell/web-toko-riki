document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const productFormScreen = document.getElementById('product-form-screen');
    const toastContainer = document.getElementById('toast-container');

    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const passwordToggle = document.getElementById('passwordToggle');

    const themeSwitchBtnLogin = document.getElementById('themeSwitchBtnLogin');
    const themeSwitchBtnPanel = document.getElementById('themeSwitchBtnPanel');
    const body = document.body;

    const savedTheme = localStorage.getItem('admin-theme') || 'light-mode';
    body.className = savedTheme;
    function updateThemeButton() {
        const iconClass = body.classList.contains('dark-mode') ? 'fa-sun' : 'fa-moon';
        themeSwitchBtnLogin.querySelector('i').className = `fas ${iconClass}`;
        if (themeSwitchBtnPanel) {
            themeSwitchBtnPanel.querySelector('i').className = `fas ${iconClass}`;
        }
    }
    updateThemeButton();

    function toggleTheme() {
        if (body.classList.contains('light-mode')) {
            body.classList.replace('light-mode', 'dark-mode');
            localStorage.setItem('admin-theme', 'dark-mode');
        } else {
            body.classList.replace('dark-mode', 'light-mode');
            localStorage.setItem('admin-theme', 'light-mode');
        }
        updateThemeButton();
    }
    themeSwitchBtnLogin.addEventListener('click', toggleTheme);
    if (themeSwitchBtnPanel) {
        themeSwitchBtnPanel.addEventListener('click', toggleTheme);
    }
    
    // Toggle Password Visibility
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        passwordToggle.querySelector('i').className = `fas ${type === 'password' ? 'fa-eye-slash' : 'fa-eye'}`;
    });

    const categorySelect = document.getElementById('category');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const descriptionInput = document.getElementById('product-description');
    const scriptMenuSection = document.getElementById('scriptMenuSection');
    const scriptMenuContentInput = document.getElementById('script-menu-content');
    const stockPhotoSection = document.getElementById('stock-photo-section');
    const photosInput = document.getElementById('product-photos');
    const addButton = document.getElementById('add-product-button');

    const manageCategorySelect = document.getElementById('manage-category');
    const manageProductList = document.getElementById('manage-product-list');
    const saveOrderButton = document.getElementById('save-order-button');
    let currentProducts = [];

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

    categorySelect.addEventListener('change', () => {
        const category = categorySelect.value;
        stockPhotoSection.style.display = (category === 'Stock Akun' || category === 'Logo') ? 'block' : 'none';
        scriptMenuSection.style.display = category === 'Script' ? 'block' : 'none';
    });


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

    // Logika tab
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(button.dataset.tab).classList.add('active');
            if (button.dataset.tab === 'manageProducts') {
                manageCategorySelect.value = '';
                manageProductList.innerHTML = '';
            }
        });
    });

    // Kelola Produk (sekarang berada di tab)
    manageCategorySelect.addEventListener('change', async () => {
        manageProductList.innerHTML = 'Memuat...';
        const category = manageCategorySelect.value;
        if (!category) {
            manageProductList.innerHTML = '';
            saveOrderButton.style.display = 'none';
            return;
        }
        try {
            const res = await fetch('/products.json');
            const data = await res.json();
            currentProducts = data[category] || [];
            if (currentProducts.length === 0) {
                manageProductList.innerHTML = '<p>Tidak ada produk di kategori ini.</p>';
                saveOrderButton.style.display = 'none';
                return;
            }
            renderManageList(currentProducts, category);
            saveOrderButton.style.display = 'block';
        } catch (err) {
            manageProductList.innerHTML = '<p>Gagal memuat produk.</p>';
        }
    });

    function renderManageList(productsToRender, category) {
        manageProductList.innerHTML = '';
        productsToRender.forEach(prod => {
            const isNew = prod.createdAt && Date.now() - new Date(prod.createdAt).getTime() < 24 * 60 * 60 * 1000;
            const item = document.createElement('div');
            item.className = 'delete-item';
            item.setAttribute('draggable', 'true');
            item.dataset.id = prod.id;
            
            const priceDisplay = prod.hargaAsli && prod.hargaAsli > prod.harga
                ? `<span class="original-price"><del>Rp${prod.hargaAsli}</del></span> <span class="discounted-price">Rp${prod.harga}</span>`
                : `<span>Rp${prod.harga}</span>`;
            
            item.innerHTML = `
                <div class="item-info">
                    <span>${prod.nama} - ${priceDisplay} ${isNew ? '<span class="new-badge">NEW</span>' : ''}</span>
                    <div class="product-edit-fields" style="display: none;">
                        <input type="text" class="edit-name-input" placeholder="Nama baru" value="${prod.nama}">
                        <input type="number" class="edit-price-input" placeholder="Harga baru" value="${prod.harga}">
                        <textarea class="edit-desc-input" placeholder="Deskripsi baru">${prod.deskripsiPanjang}</textarea>
                        <button class="save-edit-btn">Simpan Perubahan</button>
                    </div>
                </div>
                <div class="item-actions-manage">
                    <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn"><i class="fas fa-trash-alt"></i> Hapus</button>
                </div>
            `;
            manageProductList.appendChild(item);
        });

        setupManageActions(category);
    }
    
    function setupManageActions(category) {
        // Hapus Produk
        manageProductList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                const parent = e.target.closest('.delete-item');
                const id = parseInt(parent.dataset.id);
                try {
                    const res = await fetch('/api/deleteProduct', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, category: category })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.message);
                    showToast(result.message, 'success');
                    parent.remove();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
        
        // Edit Produk (Harga & Deskripsi)
        manageProductList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const parent = e.target.closest('.delete-item');
                const editFields = parent.querySelector('.product-edit-fields');
                const infoSpan = parent.querySelector('.item-info > span');
                const isEditing = editFields.style.display === 'flex';

                if (isEditing) {
                    editFields.style.display = 'none';
                    infoSpan.style.display = 'block';
                    btn.innerHTML = `<i class="fas fa-edit"></i> Edit`;
                } else {
                    editFields.style.display = 'flex';
                    infoSpan.style.display = 'none';
                    btn.innerHTML = `<i class="fas fa-times"></i> Batal`;
                }
            });
        });

        manageProductList.querySelectorAll('.save-edit-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                const parent = e.target.closest('.delete-item');
                const id = parseInt(parent.dataset.id);
                const newName = parent.querySelector('.edit-name-input').value;
                const newPrice = parseInt(parent.querySelector('.edit-price-input').value, 10);
                const newDesc = parent.querySelector('.edit-desc-input').value;
                
                if (isNaN(newPrice) || newPrice < 0 || !newName || !newDesc) {
                    return showToast('Data tidak valid.', 'error');
                }
                
                btn.textContent = '...';
                btn.disabled = true;

                try {
                    const res = await fetch(`${API_BASE_URL}/updateProduct`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, category, newName, newPrice, newDesc })
                    });
                    const result = await res.json();

                    if (!res.ok) {
                        throw new Error(result.message);
                    }
                    showToast(result.message, 'success');
                    manageCategorySelect.dispatchEvent(new Event('change')); // Reload daftar produk
                } catch (err) {
                    showToast(err.message || 'Gagal memperbarui produk.', 'error');
                } finally {
                    btn.textContent = 'Simpan Perubahan';
                    btn.disabled = false;
                }
            });
        });

        // Geser Produk
        let draggingItem = null;
        manageProductList.addEventListener('dragstart', (e) => {
            draggingItem = e.target.closest('.delete-item');
            if (draggingItem) {
                setTimeout(() => draggingItem.classList.add('dragging'), 0);
            }
        });
        manageProductList.addEventListener('dragend', () => {
            if (draggingItem) {
                draggingItem.classList.remove('dragging');
                draggingItem = null;
            }
        });
        manageProductList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(manageProductList, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement == null) {
                manageProductList.appendChild(draggable);
            } else {
                manageProductList.insertBefore(draggable, afterElement);
            }
        });
        saveOrderButton.addEventListener('click', async () => {
            const newOrder = [...manageProductList.children].map(item => parseInt(item.dataset.id));
            const category = manageCategorySelect.value;
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

    // Cek status login saat halaman dimuat
    if (sessionStorage.getItem('isAdminAuthenticated')) {
        loginScreen.style.display = 'none';
        productFormScreen.style.display = 'block';
    }
});
