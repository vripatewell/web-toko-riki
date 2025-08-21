import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'DELETE') {
        return response.status(405).json({ message: 'Metode tidak diizinkan' });
    }

    try {
        const { id, category } = request.body;
        if (!id || !category) {
            return response.status(400).json({ message: 'ID dan kategori produk wajib diisi.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const FILE_PATH = 'products.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // Ambil file products.json dari GitHub
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const productsJson = JSON.parse(content);

        if (!productsJson[category]) {
            return response.status(400).json({ message: 'Kategori tidak valid.' });
        }

        // Filter produk
        const updatedProducts = productsJson[category].filter(prod => prod.id !== id);

        if (updatedProducts.length === productsJson[category].length) {
            return response.status(404).json({ message: 'Produk tidak ditemukan.' });
        }

        productsJson[category] = updatedProducts;

        // Simpan ke GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `chore: Menghapus produk ID ${id}`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: 'Produk berhasil dihapus.' });

    } catch (error) {
        console.error("Error deleteProduct:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}