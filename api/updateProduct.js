import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { id, category, newName, newPrice, newDesc, newImages } = request.body;
        if (!id || !category || !newName || !newDesc || typeof newPrice !== 'number' || newPrice < 0) {
            return response.status(400).json({ message: 'Data tidak valid.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER;
        const REPO_NAME = process.env.REPO_NAME;
        const FILE_PATH = 'products.json';

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const productsJson = JSON.parse(content);
        
        if (!productsJson[category]) {
            return response.status(404).json({ message: 'Kategori tidak ditemukan.' });
        }

        let productFound = false;
        productsJson[category] = productsJson[category].map(product => {
            if (product.id === id) {
                productFound = true;
                if (product.harga !== newPrice) {
                    product.hargaAsli = product.harga;
                }
                product.nama = newName;
                product.harga = newPrice;
                product.deskripsiPanjang = newDesc;
                if (newImages) {
                    product.images = newImages;
                }
            }
            return product;
        });

        if (!productFound) {
            return response.status(404).json({ message: 'Produk tidak ditemukan.' });
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `chore: Memperbarui produk ID ${id}`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: 'Produk berhasil diperbarui.' });

    } catch (error) {
        console.error("Error updateProduct:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}
