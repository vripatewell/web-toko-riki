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
            const productsInCat = data[category] || [];
            if (productsInCat.length === 0) {
                manageProductList.innerHTML = '<p>Tidak ada produk di kategori ini.</p>';
                saveOrderButton.style.display = 'none';
                return;
            }
            renderManageList(productsInCat, category);
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
                <div class="item-header">
                    <span>${prod.nama} - ${priceDisplay} ${isNew ? '<span class="new-badge">NEW</span>' : ''}</span>
                    <div class="item-actions">
                        <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-btn"><i class="fas fa-trash-alt"></i> Hapus</button>
                    </div>
                </div>
                <div class="edit-form" style="display: none;">
                    <label for="edit-name-${prod.id}">Nama Produk:</label>
                    <input type="text" id="edit-name-${prod.id}" class="edit-name-input" value="${prod.nama}">
                    
                    <label for="edit-price-${prod.id}">Harga Baru:</label>
                    <input type="number" id="edit-price-${prod.id}" class="edit-price-input" value="${prod.harga}">
                    
                    <label for="edit-desc-${prod.id}">Deskripsi:</label>
                    <textarea id="edit-desc-${prod.id}" class="edit-desc-input">${prod.deskripsiPanjang.replace(/ \|\| /g, '\n')}</textarea>
                    
                    ${(category === 'Stock Akun' || category === 'Logo') ? `
                        <label>Kelola Foto:</label>
                        <div class="photo-grid">
                            ${(prod.images || []).map(img => `
                                <div class="photo-item">
                                    <img src="${img}" alt="Product Photo">
                                    <button class="delete-photo-btn" data-img-url="${img}"><i class="fas fa-times"></i></button>
                                </div>
                            `).join('')}
                        </div>
                        <div class="add-photo-container">
                            <input type="text" class="add-photo-input" placeholder="URL foto baru">
                            <button class="add-photo-btn">Tambah</button>
                        </div>
                    ` : ''}

                    <button class="save-edit-btn" data-id="${prod.id}">Simpan Perubahan</button>
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

        // Toggle Edit Form
        manageProductList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const parent = e.target.closest('.delete-item');
                const editForm = parent.querySelector('.edit-form');
                const isEditing = editForm.style.display === 'flex';

                editForm.style.display = isEditing ? 'none' : 'flex';
                btn.innerHTML = isEditing ? `<i class="fas fa-edit"></i> Edit` : `<i class="fas fa-times"></i> Batal`;
            });
        });

        // Simpan Perubahan Produk
        manageProductList.querySelectorAll('.save-edit-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                const parent = e.target.closest('.delete-item');
                const id = parseInt(parent.dataset.id);
                const newName = parent.querySelector('.edit-name-input').value;
                const newPrice = parseInt(parent.querySelector('.edit-price-input').value, 10);
                const newDesc = parent.querySelector('.edit-desc-input').value.replace(/\n/g, ' || ');
                
                let newImages = [];
                if (category === 'Stock Akun' || category === 'Logo') {
                    const existingImages = [...parent.querySelectorAll('.photo-grid img')].map(img => img.src);
                    const newPhotoInput = parent.querySelector('.add-photo-input').value.trim();
                    const newPhotos = newPhotoInput ? newPhotoInput.split(',').map(url => url.trim()) : [];
                    newImages = [...existingImages, ...newPhotos];
                }

                if (isNaN(newPrice) || newPrice < 0 || !newName || !newDesc) {
                    return showToast('Data tidak valid.', 'error');
                }
                
                btn.textContent = '...';
                btn.disabled = true;

                try {
                    const res = await fetch(`${API_BASE_URL}/updateProduct`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, category, newName, newPrice, newDesc, newImages })
                    });
                    const result = await res.json();

                    if (!res.ok) {
                        throw new Error(result.message);
                    }
                    showToast(result.message, 'success');
                    manageCategorySelect.dispatchEvent(new Event('change'));
                } catch (err) {
                    showToast(err.message || 'Gagal memperbarui produk.', 'error');
                } finally {
                    btn.textContent = 'Simpan Perubahan';
                    btn.disabled = false;
                }
            });
        });
        
        // Hapus Foto
        manageProductList.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.target.closest('.photo-item').remove();
            });
        });
        
        // Tambah Foto
        manageProductList.querySelectorAll('.add-photo-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const parent = e.target.closest('.edit-form');
                const input = parent.querySelector('.add-photo-input');
                const photoGrid = parent.querySelector('.photo-grid');
                const newPhotoUrl = input.value.trim();
                
                if (newPhotoUrl) {
                    const newPhotoItem = document.createElement('div');
                    newPhotoItem.className = 'photo-item';
                    newPhotoItem.innerHTML = `<img src="${newPhotoUrl}" alt="Product Photo"><button class="delete-photo-btn"><i class="fas fa-times"></i></button>`;
                    photoGrid.appendChild(newPhotoItem);
                    input.value = '';
                    
                    newPhotoItem.querySelector('.delete-photo-btn').addEventListener('click', e => {
                        e.target.closest('.photo-item').remove();
                    });
                } else {
                    showToast('URL foto tidak boleh kosong.', 'error');
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
