import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') { // Menggunakan POST untuk konsistensi atau DELETE
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { apiKey } = request.body;

        if (!apiKey) {
            return response.status(400).json({ message: 'API Key wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const API_KEYS_FILE_PATH = 'api_keys.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // Ambil konten file api_keys.json yang ada dari GitHub
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: API_KEYS_FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        let apiKeys = JSON.parse(content);
        let sha = fileData.sha;

        const initialLength = apiKeys.length;
        apiKeys = apiKeys.filter(keyData => keyData.key !== apiKey);

        if (apiKeys.length === initialLength) {
            return response.status(404).json({ message: 'API Key tidak ditemukan.' });
        }

        // Update file kembali ke repositori GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: API_KEYS_FILE_PATH,
            message: `chore: Menghapus API Key: ${apiKey}`,
            content: Buffer.from(JSON.stringify(apiKeys, null, 4)).toString('base64'),
            sha: sha, 
        });

        response.status(200).json({ message: 'API Key berhasil dihapus.' });

    } catch (error) {
        console.error("Error deleteApiKey:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}