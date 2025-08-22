import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
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
                // File tidak ada, anggap tidak ada API Keys
                apiKeys = [];
            } else {
                throw error;
            }
        }
        
        // Filter API Keys yang permanen atau belum kadaluarsa
        const activeApiKeys = apiKeys.filter(keyData => {
            if (keyData.duration === 'permanent') return true;
            const expires = new Date(keyData.expiresAt);
            const now = new Date();
            return expires > now;
        });

        response.status(200).json(activeApiKeys);

    } catch (error) {
        console.error("Error listApiKeys:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}