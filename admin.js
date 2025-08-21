import { Octokit } from "@octokit/rest";

// Fungsi utama
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan' });
    }

    try {
        // Ambil semua kredensial aman dari Environment Variables
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.REPO_OWNER; // Nama pengguna GitHub Anda
        const REPO_NAME = process.env.REPO_NAME;   // Nama repositori Anda
        const FILE_PATH = 'products.json';         // Path ke file produk

        const octokit = new Octokit({ auth: GITHUB_TOKEN });

        // 1. Ambil konten file products.json dari GitHub
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const productsJson = JSON.parse(content);

        // 2. Data produk baru dari frontend
        const newProductData = request.body;
        
        // 3. Cari ID tertinggi
        let maxId = 0;
        Object.values(productsJson).flat().forEach(product => {
            if (product.id > maxId) maxId = product.id;
        });
        const newId = maxId + 1;

        // 4. Buat objek produk baru
        const newProduct = {
            id: newId,
            nama: newProductData.nama,
            harga: newProductData.harga,
            deskripsiPanjang: newProductData.deskripsiPanjang.replace(/\n/g, ' || '),
            createdAt: new Date().toISOString() // ✅ simpan timestamp buat label NEW
        };

        // ✅ Jika kategori Script, sertakan menuContent
        if (newProductData.category === 'Script' && newProductData.menuContent) {
            newProduct.menuContent = newProductData.menuContent;
        }

        // ✅ Jika kategori Stock Akun, sertakan images
        if (newProductData.category === 'Stock Akun' && newProductData.images.length > 0) {
            newProduct.images = newProductData.images;
        }
        
        // 5. Tambahkan produk ke kategori di posisi paling atas
        if (productsJson[newProductData.category]) {
            productsJson[newProductData.category].unshift(newProduct); // ✅ taruh di atas
        } else {
            return response.status(400).json({ message: 'Kategori produk tidak valid.' });
        }

        // 6. Update file ke repositori GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `feat: Menambahkan produk baru "${newProduct.nama}"`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha,
        });

        response.status(200).json({ message: 'Produk berhasil ditambahkan!', newProduct });

    } catch (error) {
        console.error("Kesalahan Backend:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}
