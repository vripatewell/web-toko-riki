document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const domainCreationScreen = document.getElementById('domain-creation-screen');
    const toastContainer = document.getElementById('toast-container');

    const apiKeyInput = document.getElementById('api-key-input');
    const loginButton = document.getElementById('login-button');

    const themeSwitchBtnLogin = document.getElementById('themeSwitchBtnLogin');
    const themeSwitchBtnPanel = document.getElementById('themeSwitchBtnPanel');
    const body = document.body;

    const savedTheme = localStorage.getItem('domain-panel-theme') || 'light-mode';
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
            localStorage.setItem('domain-panel-theme', 'dark-mode');
        } else {
            body.classList.replace('dark-mode', 'light-mode');
            localStorage.setItem('domain-panel-theme', 'light-mode');
        }
        updateThemeButton();
    }
    themeSwitchBtnLogin.addEventListener('click', toggleTheme);
    if (themeSwitchBtnPanel) {
        themeSwitchBtnPanel.addEventListener('click', toggleTheme);
    }
    
    // Elemen untuk tab Buat Domain
    const subdomainNameInput = document.getElementById('subdomain-name');
    const domainCategorySelect = document.getElementById('domain-category-select');
    const ipAddressInput = document.getElementById('ip-address');
    const createDomainBtn = document.getElementById('create-domain-btn');

    // Elemen untuk tab Info Domain
    const currentApiKeyValueSpan = document.getElementById('current-api-key-value');
    const apiKeyDurationInfoSpan = document.getElementById('api-key-duration-info');
    const apiKeyExpiresInfoSpan = document.getElementById('api-key-expires-info');
    const apiKeyStatusInfoSpan = document.getElementById('api-key-status-info');
    const listDomainCategoriesUl = document.getElementById('list-domain-categories');

    // Elemen untuk Custom Confirmation Modal
    const customConfirmModal = document.getElementById('customConfirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    let resolveConfirmPromise; // Untuk menyimpan resolve dari Promise konfirmasi

    // Elemen untuk modal sukses pembuatan domain
    const domainSuccessModal = document.getElementById('domainSuccessModal');
    const closeDomainSuccessModalBtn = document.getElementById('closeDomainSuccessModal');
    const outputDomain = document.getElementById('outputDomain');
    const outputNode = document.getElementById('outputNode');
    const copyDomainBtn = document.getElementById('copyDomainBtn');
    const copyNodeBtn = document.getElementById('copyNodeBtn');

    const API_BASE_URL = '/api';
    let activeToastTimeout = null;
    let userApiKey = null; // Menyimpan API Key yang berhasil login

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

    // Fungsi untuk menampilkan modal konfirmasi kustom
    function showCustomConfirm(message) {
        confirmMessage.innerHTML = message;
        customConfirmModal.classList.add('is-visible');
        return new Promise((resolve) => {
            resolveConfirmPromise = resolve;
        });
    }

    // Event listener untuk tombol OK di modal konfirmasi kustom
    confirmOkBtn.addEventListener('click', () => {
        customConfirmModal.classList.remove('is-visible');
        if (resolveConfirmPromise) {
            resolveConfirmPromise(true);
            resolveConfirmPromise = null;
        }
    });

    // Event listener untuk tombol Batal di modal konfirmasi kustom
    confirmCancelBtn.addEventListener('click', () => {
        customConfirmModal.classList.remove('is-visible');
        if (resolveConfirmPromise) {
            resolveConfirmPromise(false);
            resolveConfirmPromise = null;
        }
    });

    // Tutup modal konfirmasi jika klik di luar area konten
    customConfirmModal.addEventListener('click', (e) => {
        if (e.target === customConfirmModal) {
            customConfirmModal.classList.remove('is-visible');
            if (resolveConfirmPromise) {
                resolveConfirmPromise(false);
                resolveConfirmPromise = null;
            }
        }
    });

    // Tutup modal sukses domain jika klik di luar atau tombol close
    closeDomainSuccessModalBtn.addEventListener('click', () => domainSuccessModal.classList.remove('is-visible'));
    domainSuccessModal.addEventListener('click', (e) => {
        if (e.target === domainSuccessModal) {
            domainSuccessModal.classList.remove('is-visible');
        }
    });

    // Fungsi untuk menyalin teks ke clipboard
    function copyToClipboard(text, successMessage) {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast(successMessage, 'success');
    }

    // Event listener untuk tombol salin di modal sukses domain
    copyDomainBtn.addEventListener('click', () => {
        const domainText = outputDomain.textContent;
        if (domainText) {
            copyToClipboard(domainText, 'Domain berhasil disalin!');
        }
    });
    copyNodeBtn.addEventListener('click', () => {
        const nodeText = outputNode.textContent;
        if (nodeText) {
            copyToClipboard(nodeText, 'Node berhasil disalin!');
        }
    });

    // --- Logika Login API Key ---
    const handleLogin = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showToast('API Key tidak boleh kosong.', 'error');
            return;
        }
        loginButton.textContent = 'Memverifikasi...';
        loginButton.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/validateApiKey`, { // NEW API endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });
            const result = await res.json();

            if (!res.ok || !result.valid) {
                throw new Error(result.message || 'API Key tidak valid atau sudah kadaluarsa.');
            }

            userApiKey = apiKey; // Simpan API Key yang valid
            localStorage.setItem('domainPanelApiKey', apiKey); // Simpan di local storage
            
            loginScreen.style.display = 'none';
            domainCreationScreen.style.display = 'block';
            showToast('API Key berhasil divalidasi!', 'success');
            
            // Muat data awal setelah login
            loadDomainCategories();
            updateApiKeyInfo(result.apiKeyData); // Tampilkan info API Key
            document.querySelector('.tab-button[data-tab="createDomainTab"]').click();

        } catch (e) {
            console.error('API Key login error:', e);
            showToast(e.message || 'Gagal memverifikasi API Key.', 'error');
        } finally {
            loginButton.textContent = 'Masuk';
            loginButton.disabled = false;
        }
    };
    loginButton.addEventListener('click', handleLogin);
    apiKeyInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            handleLogin();
        }
    });

    // --- Logika Tab ---
    const tabButtons = document.querySelectorAll('.admin-tabs .tab-button');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(button.dataset.tab).classList.add('active');

            if (button.dataset.tab === 'domainInfoTab') {
                // Muat ulang info API Key dan kategori domain jika diperlukan
                loadDomainCategories();
                // Asumsi apiKeyData sudah disimpan saat login, atau bisa panggil lagi validateApiKey
                if (userApiKey) {
                     fetch(`${API_BASE_URL}/validateApiKey`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ apiKey: userApiKey })
                    }).then(res => res.json())
                    .then(data => {
                        if (data.valid) updateApiKeyInfo(data.apiKeyData);
                        else showToast('API Key tidak lagi valid.', 'error');
                    }).catch(err => console.error('Error refreshing API Key info:', err));
                }
            }
        });
    });

    // --- Logika untuk Memuat Kategori Domain (untuk dropdown & info) ---
    let domainCategories = {}; 

    async function loadDomainCategories() {
        domainCategorySelect.innerHTML = '<option value="">-- Memuat Kategori Domain --</option>';
        listDomainCategoriesUl.innerHTML = '<li>Memuat kategori domain...</li>';
        try {
            const timestamp = new Date().getTime();
            const res = await fetch(`/config.json?v=${timestamp}`);
            const config = await res.json();
            
            domainCategories = config.domain_categories || {};

            if (Object.keys(domainCategories).length === 0) {
                listDomainCategoriesUl.innerHTML = '<li>Belum ada kategori domain.</li>';
                return;
            }

            domainCategorySelect.innerHTML = '<option value="">-- Pilih Domain --</option>'; // Reset
            listDomainCategoriesUl.innerHTML = ''; // Reset

            for (const domainName in domainCategories) {
                const option = document.createElement('option');
                option.value = domainName;
                option.textContent = domainName;
                domainCategorySelect.appendChild(option);

                const listItem = document.createElement('li');
                listItem.textContent = domainName; // Hanya menampilkan nama domain
                listDomainCategoriesUl.appendChild(listItem);
            }
        } catch (err) {
            console.error('Gagal memuat kategori domain:', err);
            showToast('Gagal memuat kategori domain.', 'error');
            domainCategorySelect.innerHTML = '<option value="">-- Gagal memuat --</option>';
            listDomainCategoriesUl.innerHTML = '<li>Gagal memuat kategori domain.</li>';
        }
    }

    // --- Logika untuk Menampilkan Informasi API Key ---
    function updateApiKeyInfo(apiKeyData) {
        currentApiKeyValueSpan.textContent = apiKeyData.key;
        apiKeyDurationInfoSpan.textContent = apiKeyData.duration === 'permanent' ? 'Permanen' : 
                                             apiKeyData.duration === 'daily' ? 'Harian' : 
                                             apiKeyData.duration === 'weekly' ? 'Mingguan' : 
                                             apiKeyData.duration === 'monthly' ? 'Bulanan' : 
                                             apiKeyData.duration === 'yearly' ? 'Tahunan' : 'Tidak Diketahui';
        
        const expires = new Date(apiKeyData.expiresAt);
        const now = new Date();
        if (apiKeyData.duration === 'permanent') {
            apiKeyExpiresInfoSpan.textContent = 'Tidak Kadaluarsa';
            apiKeyStatusInfoSpan.textContent = 'Aktif';
            apiKeyStatusInfoSpan.style.color = 'var(--success-color)';
        } else if (expires < now) {
            apiKeyExpiresInfoSpan.textContent = expires.toLocaleDateString('id-ID');
            apiKeyStatusInfoSpan.textContent = 'Kadaluarsa';
            apiKeyStatusInfoSpan.style.color = 'var(--error-color)';
        } else {
            apiKeyExpiresInfoSpan.textContent = expires.toLocaleDateString('id-ID');
            apiKeyStatusInfoSpan.textContent = 'Aktif';
            apiKeyStatusInfoSpan.style.color = 'var(--primary-color)';
        }
    }

    // --- Logika Buat Domain ---
    createDomainBtn.addEventListener('click', async () => {
        const subdomainName = subdomainNameInput.value.trim();
        const selectedDomainCategory = domainCategorySelect.value;
        const ipAddress = ipAddressInput.value.trim();

        if (!userApiKey) {
            showToast('Anda harus login dengan API Key terlebih dahulu.', 'error');
            return;
        }
        if (!subdomainName || !selectedDomainCategory || !ipAddress) {
            return showToast('Semua kolom untuk pembuatan domain wajib diisi.', 'error');
        }
        if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddress)) {
            return showToast('Format alamat IP tidak valid.', 'error');
        }

        const confirmMessageHtml = `Apakah Anda yakin ingin membuat domain <b>${subdomainName}.${selectedDomainCategory}</b> dengan IP <b>${ipAddress}</b>?`;
        const userConfirmed = await showCustomConfirm(confirmMessageHtml);

        if (!userConfirmed) {
            showToast('Pembuatan domain dibatalkan.', 'info');
            return;
        }

        showToast('Membuat domain...', 'info', 15000); // Durasi lebih lama karena proses eksternal & validasi
        createDomainBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/createDomain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: userApiKey, // Kirim API Key bersama permintaan
                    subdomain: subdomainName,
                    domainCategory: selectedDomainCategory,
                    ipAddress: ipAddress
                })
            });
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.message);
            }

            outputDomain.textContent = result.fullDomain;
            outputNode.textContent = result.node;
            domainSuccessModal.classList.add('is-visible');
            showToast('Domain berhasil dibuat!', 'success');

            // Bersihkan form
            subdomainNameInput.value = '';
            domainCategorySelect.value = '';
            ipAddressInput.value = '';

            // Setelah domain berhasil dibuat, muat ulang info API key
            // (karena mungkin ada pengurangan kuota/masa berlaku)
            fetch(`${API_BASE_URL}/validateApiKey`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: userApiKey })
            }).then(res => res.json())
            .then(data => {
                if (data.valid) updateApiKeyInfo(data.apiKeyData);
            }).catch(err => console.error('Error refreshing API Key info after creation:', err));

        } catch (err) {
            console.error('Error creating domain:', err);
            showToast(err.message || 'Gagal membuat domain.', 'error');
        } finally {
            createDomainBtn.disabled = false;
        }
    });


    // Inisialisasi: Cek apakah API Key sudah tersimpan di local storage
    const storedApiKey = localStorage.getItem('domainPanelApiKey');
    if (storedApiKey) {
        apiKeyInput.value = storedApiKey;
        handleLogin(); // Coba login otomatis
    } else {
        loginScreen.style.display = 'flex';
    }
});