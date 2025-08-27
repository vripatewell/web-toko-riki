import fetch from 'node-fetch';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    const { url, type } = request.body;

    if (!url || !type) {
        return response.status(400).json({ message: 'Parameter "url" dan "type" wajib diisi.' });
    }

    let externalApiUrl = '';
    let apiName = '';

    switch (type) {
        case 'tiktok':
            apiName = 'TikTok';
            externalApiUrl = `https://newapiriki.vercel.app/download/tiktok?apikey=rikinew&url=${encodeURIComponent(url)}`;
            break;
        case 'instagram':
            apiName = 'Instagram';
            externalApiUrl = `https://api-simplebot.vercel.app/download/instagram?apikey=free&url=${encodeURIComponent(url)}`;
            break;
        case 'youtube':
            apiName = 'YouTube';
            externalApiUrl = `https://api-simplebot.vercel.app/download/ytmp4?apikey=free&url=${encodeURIComponent(url)}`;
            break;
        case 'remini':
            apiName = 'Remini';
            externalApiUrl = `https://newapiriki.vercel.app/imagecreator/remini?apikey=rikinew&url=${encodeURIComponent(url)}`;
            break;
        default:
            return response.status(400).json({ message: 'Tipe downloader tidak valid.' });
    } // <-- Tanda kurung kurawal ini adalah akhir dari switch

    // Blok try...catch seharusnya ada di sini, DI LUAR dan SETELAH switch
    try {
        const apiResponse = await fetch(externalApiUrl);
        const data = await apiResponse.json();

        if (!apiResponse.ok || !data.status) {
            const errorMessage = (data.result && typeof data.result === 'string') ? data.result : `Gagal mengambil data dari API ${apiName}.`;
            throw new Error(errorMessage);
        }

        response.status(200).json(data.result);

    } catch (error) {
        console.error(`Error pada API ${apiName}:`, error);
        response.status(500).json({ message: error.message || 'Terjadi kesalahan di server.' });
    }
}
