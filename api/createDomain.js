import { Octokit } from "@octokit/rest";
import { v4 as uuidv4 } from 'uuid'; // Untuk menghasilkan UUID unik
import axios from 'axios'; // Menggunakan axios seperti kode CJS Anda

// Fungsi untuk membuat string acak untuk node (sesuai permintaan)
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
        const { apiKey, subdomain, domainCategory, ipAddress } = request.body;

        if (!apiKey || !subdomain || !domainCategory || !ipAddress) {
            return response.status(400).json({ message: 'API Key, nama subdomain, kategori domain, dan alamat IP wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const CONFIG_FILE_PATH = 'config.json';
        const API_KEYS_FILE_PATH = 'api_keys.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // --- 1. Validasi API Key ---
        let apiKeysFileContent;
        let apiKeysData;
        let apiKeysSha;

        try {
            const res = await octokit.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: API_KEYS_FILE_PATH,
            });
            apiKeysFileContent = Buffer.from(res.data.content, 'base64').toString('utf-8');
            apiKeysData = JSON.parse(apiKeysFileContent);
            apiKeysSha = res.data.sha;
        } catch (error) {
            return response.status(404).json({ message: 'File API Keys tidak ditemukan atau belum ada.' });
        }

        const foundApiKeyData = apiKeysData.find(keyData => keyData.key === apiKey);

        if (!foundApiKeyData) {
            return response.status(401).json({ message: 'API Key tidak ditemukan.' });
        }

        // Cek kadaluarsa (sesuai validateApiKey.js)
        if (foundApiKeyData.duration !== 'permanent') {
            const expires = new Date(foundApiKeyData.expiresAt);
            const now = new Date();
            if (expires < now) {
                // Perbarui status menjadi expired di file
                foundApiKeyData.status = 'expired';
                await octokit.repos.createOrUpdateFileContents({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: API_KEYS_FILE_PATH,
                    message: `chore: Menandai API Key ${apiKey} sebagai kadaluarsa saat pembuatan domain`,
                    content: Buffer.from(JSON.stringify(apiKeysData, null, 4)).toString('base64'),
                    sha: apiKeysSha,
                });
                return response.status(401).json({ message: 'API Key sudah kadaluarsa.' });
            }
        }
        
        // Di sini kita bisa menambahkan logika kuota/limit per API key jika diperlukan

        // --- 2. Ambil Kredensial Cloudflare dari config.json ---
        const { data: configFile } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: CONFIG_FILE_PATH,
        });
        const configContent = Buffer.from(configFile.content, 'base64').toString('utf-8');
        const configJson = JSON.parse(configContent);
        
        const domainsConfig = configJson.domain_categories || {};
        const domainConfig = domainsConfig[domainCategory];

        if (!domainConfig || !domainConfig.zone || !domainConfig.apitoken) {
            return response.status(400).json({ message: `Kategori domain "${domainCategory}" tidak ditemukan atau tidak dikonfigurasi dengan benar.` });
        }

        const { zone, apitoken } = domainConfig;
        
        // Bersihkan input sesuai kode CJS
        const cleanedSubdomain = subdomain.replace(/[^a-z0-9.-]/gi, "").toLowerCase();
        const cleanedIp = ipAddress.replace(/[^0-9.]/gi, "");

        const fullDomain = `${cleanedSubdomain}.${domainCategory}`;
        const randomString = generateRandomString(8); // Contoh panjang 8 karakter
        const nodeSubdomain = `node${randomString}.${cleanedSubdomain}`; // Contoh node random

        // --- 3. Fungsi Pembuatan DNS Record (diadaptasi dari kode CJS Anda) ---
        async function createDnsRecord(name, type, content, proxied = true) {
            return new Promise(async (resolve) => {
                try {
                    const res = await axios.post(
                        `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`,
                        {
                            type: type,
                            name: name,
                            content: content,
                            ttl: 1, // Otomatis
                            proxied: proxied
                        },
                        {
                            headers: {
                                Authorization: "Bearer " + apitoken,
                                "Content-Type": "application/json",
                            },
                        }
                    );
                    let result = res.data;
                    if (result.success) {
                        resolve({
                            success: true,
                            zone: result.result?.zone_name,
                            name: result.result?.name,
                            content: result.result?.content // Menggunakan content untuk IP atau target CNAME
                        });
                    } else {
                        resolve({ success: false, error: result.errors?.[0]?.message || 'Unknown Cloudflare error' });
                    }
                } catch (e) {
                    let err1 = e.response?.data?.errors?.[0]?.message || e.response?.data?.errors || e.response?.data || e.response || e;
                    let err1Str = String(err1);
                    resolve({ success: false, error: err1Str });
                }
            });
        }

        let domainCreationSuccess = true;
        let errorMessage = [];

        // Buat A record untuk subdomain utama
        const aRecordResult = await createDnsRecord(cleanedSubdomain, 'A', cleanedIp);
        if (!aRecordResult.success) {
            domainCreationSuccess = false;
            errorMessage.push(`Gagal membuat A record untuk ${cleanedSubdomain}: ${aRecordResult.error}`);
        }

        // Buat CNAME record untuk node (sesuai permintaan, mengarah ke fullDomain)
        const cnameRecordResult = await createDnsRecord(nodeSubdomain, 'CNAME', fullDomain);
        if (!cnameRecordResult.success) {
            domainCreationSuccess = false;
            errorMessage.push(`Gagal membuat CNAME record untuk ${nodeSubdomain}: ${cnameRecordResult.error}`);
        }

        if (!domainCreationSuccess) {
            return response.status(500).json({ message: `Gagal membuat domain: ${errorMessage.join(', ')}` });
        }

        // --- 4. Perbarui data API Key (opsional: jika ada kuota penggunaan) ---
        // Contoh: Jika API Key memiliki batasan penggunaan, kurangi di sini.
        // Untuk saat ini, kita hanya bisa memperbarui 'lastUsedAt' atau sejenisnya
        // atau jika ada mekanisme kuota, kita bisa menguranginya.
        // Jika Anda ingin kuota, beri tahu saya. Untuk saat ini, saya hanya akan memperbarui status (bukan expired)
        // dan Anda bisa menambahkan logika di validateApiKey.js atau di sini untuk membatasi
        // penggunaan berdasarkan 'usageCount' misalnya.

        // Jika Anda ingin mengurangi kuota atau mencatat penggunaan per API Key:
        // foundApiKeyData.usageCount = (foundApiKeyData.usageCount || 0) + 1;
        // await octokit.repos.createOrUpdateFileContents({ ... update api_keys.json ... });

        response.status(200).json({ message: 'Domain dan Node berhasil dibuat.', fullDomain: fullDomain, node: `${nodeSubdomain}.${domainCategory}` });

    } catch (error) {
        console.error("Error createDomain:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}