import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { WA_ADMIN_NUMBER } = request.body;
        if (!WA_ADMIN_NUMBER) {
            return response.status(400).json({ message: 'Nomor WhatsApp tidak valid.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const FILE_PATH = 'config.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // Ambil konten file config.json
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const configJson = JSON.parse(content);

        // Update nomor admin
        configJson.WA_ADMIN_NUMBER = WA_ADMIN_NUMBER;

        // Simpan ke GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `chore: Memperbarui nomor WA admin`,
            content: Buffer.from(JSON.stringify(configJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: 'Nomor admin berhasil diperbarui.' });
    } catch (error) {
        console.error("Error updateAdminNumber:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}
