import fetch from 'node-fetch';

// Fungsi untuk mengekstrak ID Video dari berbagai format URL YouTube
function getYouTubeID(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    const { query } = request.body;
    if (!query) {
        return response.status(400).json({ message: 'Query pencarian tidak boleh kosong.' });
    }

    // Ganti dengan API Key Anda jika berbeda
    const RIKI_API_KEY = "rikinew"; 
    
    // API URL dari bot WhatsApp Anda yang sudah bekerja
    const RIKI_API_URL = `https://newapiriki.vercel.app/api/youtube/play?apikey=${RIKI_API_KEY}&query=${encodeURIComponent(query)}`;

    try {
        const apiResponse = await fetch(RIKI_API_URL);
        const result = await apiResponse.json();

        if (!apiResponse.ok || !result.status || !result.result) {
            throw new Error(result.message || 'Gagal mengambil data dari Riki API.');
        }

        const data = result.result;
        
        // Kita format ulang respons dari API Anda agar cocok dengan frontend
        const finalResult = {
            title: data.title,
            author: data.author,
            thumbnail: data.thumb,
            duration: data.duration,
            url: data.url,
            videoId: getYouTubeID(data.url),
            audioUrl: data.audio_url,
            videoUrl: data.video_url,
        };
        
        response.status(200).json(finalResult);

    } catch (error) {
        console.error("Error saat memanggil Riki API:", error);
        response.status(500).json({ message: 'Gagal mengambil data dari API, coba lagi nanti.' });
    }
}