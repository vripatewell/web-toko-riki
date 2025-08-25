import yts from 'yt-search';
import fetch from 'node-fetch'; // <-- Pustaka untuk memanggil API Anda

// Fungsi ini tetap kita pakai untuk membedakan link dan judul
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

    // Ganti dengan apikey Anda
    const APIKEY = "rikinew"; 
    const API_BASE_URL = "https://newapiriki.vercel.app/download";

    try {
        // Langkah 1: Cari video menggunakan yt-search (tetap diperlukan untuk dapat URL jika inputnya judul)
        let video;
        const videoId = getYouTubeID(query);

        if (videoId) {
            video = await yts({ videoId });
        } else {
            const searchResults = await yts(query);
            video = searchResults.videos[0];
        }
        
        if (!video) {
            return response.status(404).json({ message: 'Video tidak ditemukan.' });
        }

        // Langkah 2: Panggil API Anda sendiri secara paralel untuk MP3 dan MP4
        const videoUrlEncoded = encodeURIComponent(video.url);
        
        const [mp3Response, mp4Response] = await Promise.all([
            fetch(`${API_BASE_URL}/ytmp3?apikey=${APIKEY}&url=${videoUrlEncoded}`),
            fetch(`${API_BASE_URL}/ytmp4?apikey=${APIKEY}&url=${videoUrlEncoded}`)
        ]);

        const mp3Result = await mp3Response.json();
        const mp4Result = await mp4Response.json();

        // Langkah 3: Siapkan data untuk dikirim kembali ke website Anda
        const finalResult = {
            title: video.title,
            author: video.author.name,
            thumbnail: video.thumbnail,
            duration: video.timestamp,
            url: video.url,
            videoId: video.videoId,
            // Ambil link download dari hasil API Anda
            audioUrl: mp3Result.status ? mp3Result.result.download : null,
            videoUrl: mp4Result.status ? mp4Result.result.download : null,
        };
        
        response.status(200).json(finalResult);

    } catch (error) {
        console.error("Error saat memanggil API eksternal:", error);
        response.status(500).json({ message: 'Gagal memproses permintaan melalui API.' });
    }
}
