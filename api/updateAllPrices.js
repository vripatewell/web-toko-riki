import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { newPrice } = request.body;
        if (typeof newPrice !== 'number' || newPrice < 0) {
            return response.status(400).json({ message: 'Harga baru tidak valid.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const FILE_PATH = 'products.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // 1. Ambil konten file products.json
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const productsJson = JSON.parse(content);
        
        // 2. Iterasi dan ubah harga semua produk
        for (const category in productsJson) {
            if (Array.isArray(productsJson[category])) {
                productsJson[category] = productsJson[category].map(product => {
                    return { ...product, harga: newPrice };
                });
            }
        }

        // 3. Simpan ke GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `chore: Menerapkan harga baru Rp${newPrice} ke semua produk`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: `Harga semua produk berhasil diperbarui menjadi Rp${newPrice}.` });

    } catch (error) {
        console.error("Error updateAllPrices:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}
