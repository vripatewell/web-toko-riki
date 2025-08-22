import { Octokit } from "@octokit/rest";

// Anda harus mendapatkan GITHUB_TOKEN, REPO_OWNER, REPO_NAME dari environment variables
// Untuk Cloudflare API, kita akan menggunakan fetch langsung karena Octokit bukan untuk Cloudflare
// Hardcode daftar domain Cloudflare untuk demo ini
const CLOUDFLARE_DOMAINS = {
    "rikishop.my.id": {
        "zone": "33970794e3373167a9c9556ad19fdb6a",
        "apitoken": "5BuYPtwU__7hJIzX1euJn3K-ChzZH29VZ_ivbja"
    },
    "kangpanel.biz.id": {
        "zone": "90ab3a017b7b29dd9ee92fdbb5831b0a",
        "apitoken": "Jf_bwzYFsH89BZ6az61JlUGGu56SmNOqf7WC7KgV"
    }
    // Kategori domain lainnya akan ditambahkan melalui addDomainCategory.js ke config.json
    // dan dimuat di sini saat runtime atau melalui restart server
};

// Fungsi untuk membuat string acak untuk node
function generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { subdomain, domainCategory, ipAddress } = request.body;

        if (!subdomain || !domainCategory || !ipAddress) {
            return response.status(400).json({ message: 'Nama subdomain, kategori domain, dan alamat IP wajib diisi.' });
        }

        // --- Ambil Kredensial Cloudflare dari CLOUDFLARE_DOMAINS atau config.json ---
        // Untuk demo ini, kita menggunakan CLOUDFLARE_DOMAINS yang sudah hardcode.
        // Dalam implementasi nyata, ini akan dimuat dari config.json yang diupdate
        // oleh addDomainCategory.js atau dari environment variables.
        let domainConfig = CLOUDFLARE_DOMAINS[domainCategory];
        
        // Coba muat dari config.json jika tidak ada di hardcode list (untuk kategori yang ditambahkan admin)
        if (!domainConfig) {
             const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
             const REPO_OWNER = process.env.REPO_OWNER;
             const REPO_NAME = process.env.REPO_NAME;
             const CONFIG_FILE_PATH = 'config.json';
             
             const octokit = new Octokit({ auth: GITHUB_TOKEN });
             const { data: configFile } = await octokit.repos.getContent({
                 owner: REPO_OWNER,
                 repo: REPO_NAME,
                 path: CONFIG_FILE_PATH,
             });
             const configContent = Buffer.from(configFile.content, 'base64').toString('utf-8');
             const configJson = JSON.parse(configContent);
             domainConfig = configJson.domain_categories ? configJson.domain_categories[domainCategory] : null;
        }

        if (!domainConfig) {
            return response.status(400).json({ message: `Kategori domain "${domainCategory}" tidak ditemukan atau tidak dikonfigurasi.` });
        }

        const { zone, apitoken } = domainConfig;
        const fullDomain = `${subdomain}.${domainCategory}`;
        const randomString = generateRandomString(8); // Contoh panjang 8 karakter
        const node = `node-${randomString}.${domainCategory}`;

        // --- Panggilan Cloudflare API untuk membuat A record ---
        const cfApiUrl = `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`;
        const cfHeaders = {
            'Authorization': `Bearer ${apitoken}`,
            'Content-Type': 'application/json',
        };

        // Buat A record untuk subdomain ke IP
        const aRecordData = {
            type: 'A',
            name: subdomain,
            content: ipAddress,
            ttl: 1, // Otomatis
            proxied: true // Disarankan untuk keamanan dan performa Cloudflare
        };

        const aRecordRes = await fetch(cfApiUrl, {
            method: 'POST',
            headers: cfHeaders,
            body: JSON.stringify(aRecordData)
        });
        const aRecordResult = await aRecordRes.json();

        if (!aRecordRes.ok || !aRecordResult.success) {
            console.error("Cloudflare A Record Error:", aRecordResult.errors || aRecordResult);
            return response.status(aRecordRes.status).json({ message: `Gagal membuat A record di Cloudflare: ${aRecordResult.errors ? aRecordResult.errors.map(err => err.message).join(', ') : 'Kesalahan tidak diketahui.'}` });
        }

        // Buat CNAME record untuk node ke IP (atau ke fullDomain jika itu CNAME lain)
        // Disini kita akan membuat CNAME ke subdomain yang baru dibuat (fullDomain)
        const cnameRecordData = {
            type: 'CNAME',
            name: `node-${randomString}`, // Nama CNAME adalah node-randomstring
            content: fullDomain,       // Mengarah ke fullDomain yang baru dibuat
            ttl: 1, // Otomatis
            proxied: true
        };

        const cnameRecordRes = await fetch(cfApiUrl, {
            method: 'POST',
            headers: cfHeaders,
            body: JSON.stringify(cnameRecordData)
        });
        const cnameRecordResult = await cnameRecordRes.json();

        if (!cnameRecordRes.ok || !cnameRecordResult.success) {
            console.error("Cloudflare CNAME Record Error:", cnameRecordResult.errors || cnameRecordResult);
            // Anda mungkin ingin menghapus A record yang sudah dibuat jika CNAME gagal
            return response.status(cnameRecordRes.status).json({ message: `Gagal membuat CNAME record di Cloudflare: ${cnameRecordResult.errors ? cnameRecordResult.errors.map(err => err.message).join(', ') : 'Kesalahan tidak diketahui.'}` });
        }

        response.status(200).json({ message: 'Domain dan Node berhasil dibuat.', fullDomain, node });

    } catch (error) {
        console.error("Error createDomain:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}