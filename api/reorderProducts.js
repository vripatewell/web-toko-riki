import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { category, order } = request.body;
        if (!category || !order || !Array.isArray(order)) {
            return response.status(400).json({ message: 'Data tidak valid.' });
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
        
        if (!productsJson[category]) {
             return response.status(400).json({ message: 'Kategori produk tidak valid.' });
        }

        const existingProducts = productsJson[category];
        const newOrderedProducts = [];
        
        // 2. Buat array baru sesuai urutan dari frontend
        order.forEach(id => {
            const product = existingProducts.find(p => p.id === id);
            if (product) {
                newOrderedProducts.push(product);
            }
        });

        // 3. Tambahkan produk yang tidak ada di urutan (jika ada) ke belakang
        existingProducts.forEach(prod => {
            if (!newOrderedProducts.find(p => p.id === prod.id)) {
                newOrderedProducts.push(prod);
            }
        });
        
        // 4. Update kategori dengan urutan yang baru
        productsJson[category] = newOrderedProducts;

        // 5. Simpan ke GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `chore: Memperbarui urutan produk di kategori ${category}`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: 'Urutan produk berhasil diperbarui.' });

    } catch (error) {
        console.error("Error reorderProducts:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}
