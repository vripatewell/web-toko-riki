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

        // 1. Ambil konten file products.json yang ada dari GitHub
        const { data: fileData } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const productsJson = JSON.parse(content);

        // 2. Siapkan data produk baru dari frontend
        const newProductData = request.body;
        
        
        // 3. Cari ID tertinggi untuk generate ID otomatis yang unik
        let maxId = 0;
        Object.values(productsJson).flat().forEach(product => {
            if (product.id > maxId) maxId = product.id;
        });
        const newId = maxId + 1;
        
        // 4. Buat objek produk baru yang akan disimpan
        const newProduct = {
            id: newId,
            nama: newProductData.nama,
            harga: newProductData.harga,
            hargaAsli: newProductData.harga, // Menambahkan harga asli saat produk pertama kali dibuat
            deskripsiPanjang: newProductData.deskripsiPanjang.replace(/\n/g, ' || '),
            createdAt: newProductData.createdAt
        };


        if ((newProductData.category === 'Stock Akun' || newProductData.category === 'Logo') && newProductData.images.length > 0) {
            newProduct.images = newProductData.images;
        }


        // Jika kategori adalah Script, tambahkan konten menu
        if (newProductData.category === 'Script' && newProductData.menuContent) {
            newProduct.menuContent = newProductData.menuContent;
        }
        
        // 5. Tambahkan produk ke kategori yang sesuai
        if (productsJson[newProductData.category]) {
            // UBAH DARI .push(newProduct) MENJADI .unshift(newProduct)
            productsJson[newProductData.category].unshift(newProduct); 
        } else {
            // Jika kategori tidak ada, buat array baru
            productsJson[newProductData.category] = [newProduct];
        }

        // 6. Update file kembali ke repositori GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: FILE_PATH,
            message: `feat: Menambahkan produk baru "${newProduct.nama}"`,
            content: Buffer.from(JSON.stringify(productsJson, null, 4)).toString('base64'),
            sha: fileData.sha, // SHA wajib ada untuk proses update
        });

        response.status(200).json({ message: 'Produk berhasil ditambahkan!', newProduct });

    } catch (error) {
        console.error("Kesalahan Backend:", error);
        response.status(500).json({ message: 'Terjadi kesalahan di server.', error: error.message });
    }
}