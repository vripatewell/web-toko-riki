import { Octokit } from "@octokit/rest";

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const { id, category, newName, newPrice, newDesc, newImages, newMenuContent, newWaNumber, updateType } = request.body;

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
        let productsJson = JSON.parse(content); // Gunakan let karena akan dimodifikasi

        if (!productsJson[category]) {
             return response.status(400).json({ message: 'Kategori produk tidak valid.' });
        }

        let commitMessage = '';

        if (updateType === 'bulk') { // Update harga semua produk di kategori
            if (typeof newPrice !== 'number' || newPrice < 0) {
                return response.status(400).json({ message: 'Data tidak valid: harga baru tidak ada/tidak valid.' });
            }
            productsJson[category] = productsJson[category].map(product => ({
                ...product, 
                harga: newPrice,
                // hargaAsli tetap dipertahankan jika belum ada, atau diupdate jika memang diinginkan.
                // Untuk fitur kembalikan harga, kita akan selalu merujuk ke hargaAsli yang pertama kali disimpan.
                // Jika user mengubah harga massal, hargaAsli tetap sama (harga awal)
            }));
            commitMessage = `chore: Memperbarui harga semua produk di kategori ${category} menjadi Rp${newPrice}`;
            return response.status(200).json({ message: `Harga semua produk di kategori "${category}" berhasil diperbarui menjadi ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(newPrice)}.` });

        } else if (updateType === 'revert') { // Kembalikan harga ke hargaAsli
            productsJson[category] = productsJson[category].map(product => ({
                ...product,
                harga: product.hargaAsli || product.harga // Kembalikan ke hargaAsli, jika tidak ada pakai harga saat ini
            }));
            commitMessage = `chore: Mengembalikan harga semua produk di kategori ${category} ke harga awal`;
            return response.status(200).json({ message: `Harga semua produk di kategori "${category}" berhasil dikembalikan ke harga awal.` });

        } else if (updateType === 'single') { // Update produk individual
            if (id === undefined || typeof newPrice !== 'number' || newPrice < 0 || !newName || !newDesc) {
                return response.status(400).json({ message: 'Data tidak valid: ID, Nama, Harga, Deskripsi produk wajib diisi dan harga harus angka positif.' });
            }

            let productFound = false;
            productsJson[category] = productsJson[category].map(product => {
                if (product.id === id) {
                    productFound = true;
                    const updatedProduct = {
                        ...product,
                        nama: newName,
                        harga: newPrice,
                        deskripsiPanjang: newDesc,
                        waNumber: newWaNumber || null // Simpan nomor WA produk, jika ada
                    };
                    if (newImages) updatedProduct.images = newImages;
                    if (newMenuContent) updatedProduct.menuContent = newMenuContent;
                    return updatedProduct;
                }
                return product;
            });

            if (!productFound) {
                return response.status(404).json({ message: 'Produk tidak ditemukan.' });
            }
            commitMessage = `feat: Memperbarui produk ID ${id} (${newName})`;

        } else {
            return response.status(400).json({ message: 'Tipe pembaruan tidak valid.' });
        }

        // 3. Simpan ke GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: commitMessage,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: 'Produk berhasil diperbarui.' });

    } catch (error) {
        console.error("Error updateProduct:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}