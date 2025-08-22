import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { category, newPrice } = request.body;
        if (!category || typeof newPrice !== 'number' || newPrice < 0) {
            return response.status(400).json({ message: 'Data tidak valid: kategori atau harga baru tidak ada/tidak valid.' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Pastikan ini ada di environment variables Anda
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

        // 2. Update harga semua produk di kategori yang dipilih
        productsJson[category] = productsJson[category].map(product => ({
            ...product, // Salin semua properti produk yang ada
            harga: newPrice, // Ubah harga
            hargaAsli: newPrice // Opsional: jika Anda ingin harga asli juga diupdate
        }));

        // 3. Simpan ke GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `chore: Memperbarui harga semua produk di kategori ${category} menjadi Rp${newPrice}`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: `Harga semua produk di kategori "${category}" berhasil diperbarui menjadi ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(newPrice)}.` });

    } catch (error) {
        console.error("Error updateProductsInCategory:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}
