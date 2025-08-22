import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { domainName, zoneId, apiToken } = request.body;

        if (!domainName || !zoneId || !apiToken) {
            return response.status(400).json({ message: 'Nama domain, Zone ID, dan API Token wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const CONFIG_FILE_PATH = 'config.json'; 

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        let fileData;
        let configJson;
        let sha = null;

        try {
            const res = await octokit.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: CONFIG_FILE_PATH,
            });
            fileData = res.data;
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            configJson = JSON.parse(content);
            sha = fileData.sha;
        } catch (error) {
            if (error.status === 404) {
                // Jika file tidak ditemukan, inisialisasi dengan objek dasar
                configJson = {
                    "WA_ADMIN_NUMBER": "", // Bisa disesuaikan
                    "domain_categories": {}
                };
            } else {
                throw error;
            }
        }
        
        // Inisialisasi domain_categories jika belum ada
        if (!configJson.domain_categories) {
            configJson.domain_categories = {};
        }

        // Cek apakah domain sudah ada
        if (configJson.domain_categories[domainName]) {
            return response.status(409).json({ message: `Kategori domain "${domainName}" sudah ada.` });
        }

        // Tambahkan kategori domain baru
        configJson.domain_categories[domainName] = {
            zone: zoneId,
            apitoken: apiToken,
        };

        // Update file kembali ke repositori GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: CONFIG_FILE_PATH,
            message: `feat: Menambahkan kategori domain baru "${domainName}"`,
            content: Buffer.from(JSON.stringify(configJson, null, 4)).toString('base64'),
            sha: sha, 
        });

        response.status(200).json({ message: 'Kategori domain berhasil ditambahkan!' });

    } catch (error) {
        console.error("Error addDomainCategory:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}