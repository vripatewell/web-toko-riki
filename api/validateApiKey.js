import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { apiKey } = request.body;

        if (!apiKey) {
            return response.status(400).json({ valid: false, message: 'API Key wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const API_KEYS_FILE_PATH = 'api_keys.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        let apiKeys = [];
        try {
            const res = await octokit.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: API_KEYS_FILE_PATH,
            });
            const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
            apiKeys = JSON.parse(content);
        } catch (error) {
            if (error.status === 404) {
                return response.status(404).json({ valid: false, message: 'File API Keys tidak ditemukan atau belum ada.' });
            }
            throw error;
        }

        const foundApiKeyData = apiKeys.find(keyData => keyData.key === apiKey);

        if (!foundApiKeyData) {
            return response.status(401).json({ valid: false, message: 'API Key tidak ditemukan.' });
        }

        // Cek kadaluarsa
        if (foundApiKeyData.duration !== 'permanent') {
            const expires = new Date(foundApiKeyData.expiresAt);
            const now = new Date();
            if (expires < now) {
                // Tandai sebagai kadaluarsa di file (opsional, tapi disarankan)
                foundApiKeyData.status = 'expired';
                
                // Simpan perubahan status ke file api_keys.json
                await octokit.repos.createOrUpdateFileContents({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    path: API_KEYS_FILE_PATH,
                    message: `chore: Menandai API Key ${apiKey} sebagai kadaluarsa`,
                    content: Buffer.from(JSON.stringify(apiKeys, null, 4)).toString('base64'),
                    sha: request.query.sha || res.data.sha, // Perlu SHA terbaru
                });

                return response.status(401).json({ valid: false, message: 'API Key sudah kadaluarsa.' });
            }
        }

        // API Key valid, kembalikan data terkait
        response.status(200).json({ valid: true, message: 'API Key valid.', apiKeyData: foundApiKeyData });

    } catch (error) {
        console.error("Error validateApiKey:", error);
        response.status(500).json({ valid: false, message: 'Terjadi kesalahan di server.', error: error.message });
    }
}