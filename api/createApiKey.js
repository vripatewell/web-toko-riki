import { Octokit } from "@octokit/rest";
import { v4 as uuidv4 } from 'uuid'; // Untuk menghasilkan UUID unik

// Fungsi untuk mendapatkan tanggal kadaluarsa berdasarkan durasi
function getExpirationDate(duration) {
    const now = new Date();
    switch (duration) {
        case 'daily':
            now.setDate(now.getDate() + 1);
            break;
        case 'weekly':
            now.setDate(now.getDate() + 7);
            break;
        case 'monthly':
            now.setMonth(now.getMonth() + 1);
            break;
        case 'yearly':
            now.setFullYear(now.getFullYear() + 1);
            break;
        case 'permanent':
        default:
            return null; // Permanen tidak memiliki tanggal kadaluarsa spesifik
    }
    return now.toISOString();
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { prefix, duration } = request.body; // prefix opsional

        if (!duration) {
            return response.status(400).json({ message: 'Durasi API Key wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const API_KEYS_FILE_PATH = 'api_keys.json'; // File baru untuk menyimpan API Keys

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // Ambil konten file api_keys.json yang ada dari GitHub
        let fileData;
        let apiKeys = [];
        let sha = null;

        try {
            const res = await octokit.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: API_KEYS_FILE_PATH,
            });
            fileData = res.data;
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            apiKeys = JSON.parse(content);
            sha = fileData.sha;
        } catch (error) {
            // Jika file tidak ditemukan, inisialisasi dengan array kosong
            if (error.status === 404) {
                apiKeys = [];
                sha = null; // Tidak ada SHA jika file baru
            } else {
                throw error;
            }
        }
        
        const newUuid = uuidv4();
        const newApiKey = `${prefix || ''}${newUuid}`; // Gabungkan prefix dan UUID
        const expiresAt = getExpirationDate(duration);

        const apiKeyData = {
            key: newApiKey,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt,
            duration: duration,
            usageCount: 0, // Inisialisasi hitungan penggunaan
            status: 'active'
        };

        apiKeys.push(apiKeyData); // Tambahkan API Key baru

        // Update file kembali ke repositori GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: API_KEYS_FILE_PATH,
            message: `feat: Menambahkan API Key baru: ${newApiKey} (${duration})`,
            content: Buffer.from(JSON.stringify(apiKeys, null, 4)).toString('base64'),
            sha: sha, // SHA wajib ada untuk proses update, null jika file baru
        });

        response.status(200).json({ message: 'API Key berhasil dibuat!', apiKey: newApiKey });

    } catch (error) {
        console.error("Error createApiKey:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}