import fetch from 'node-fetch';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    const { url: imageUrl } = request.body;
    const apiKey = "rikinew";
    
    if (!imageUrl) {
        return response.status(400).json({ message: 'URL gambar tidak ditemukan.' });
    }

    const externalApiUrl = `https://newapiriki.vercel.app/imagecreator/remini?apikey=${apiKey}&url=${encodeURIComponent(imageUrl)}`;

    try {
        const apiResponse = await fetch(externalApiUrl);
        const data = await apiResponse.json();

        if (!apiResponse.ok || !data.status) {
            throw new Error(data.message || 'Gagal mengambil data dari API Remini.');
        }

        response.status(200).json(data);

    } catch (error) {
        console.error("Error pada API Remini:", error);
        response.status(500).json({ message: error.message || 'Terjadi kesalahan di server.' });
    }
}