import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') { // Menggunakan POST untuk konsistensi atau DELETE jika Anda ingin lebih RESTful
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { domainName } = request.body;

        if (!domainName) {
            return response.status(400).json({ message: 'Nama domain wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const CONFIG_FILE_PATH = 'config.json'; 

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // 1. Ambil konten file config.json yang ada dari GitHub
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: CONFIG_FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const configJson = JSON.parse(content);

        if (!configJson.domain_categories || !configJson.domain_categories[domainName]) {
            return response.status(404).json({ message: `Kategori domain "${domainName}" tidak ditemukan.` });
        }

        // 2. Hapus kategori domain
        delete configJson.domain_categories[domainName];

        // 3. Update file kembali ke repositori GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: CONFIG_FILE_PATH,
            message: `chore: Menghapus kategori domain "${domainName}"`,
            content: Buffer.from(JSON.stringify(configJson, null, 4)).toString('base64'),
            sha: fileData.sha, 
        });

        response.status(200).json({ message: 'Kategori domain berhasil dihapus.' });

    } catch (error) {
        console.error("Error deleteDomainCategory:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}