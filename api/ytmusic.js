import yts from 'yt-search';
import ytdl from '@vreden/youtube_scraper';

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

    try {
        let video;
        const videoId = getYouTubeID(query);

        if (videoId) {
            // Jika input adalah URL, cari berdasarkan ID Video untuk mendapatkan detail lengkap
            video = await yts({ videoId });
        } else {
            // Jika input adalah teks, cari berdasarkan teks
            const searchResults = await yts(query);
            video = searchResults.videos[0];
        }
        
        if (!video) {
            return response.status(404).json({ message: 'Video tidak ditemukan.' });
        }

        const [mp3Result, mp4Result] = await Promise.all([
            ytdl.ytmp3(video.url),
            ytdl.ytmp4(video.url)
        ]);

        if (!mp3Result.status && !mp4Result.status) {
            throw new Error('Gagal mendapatkan link download.');
        }

        const finalResult = {
            title: video.title,
            author: video.author.name,
            thumbnail: video.thumbnail,
            duration: video.timestamp,
            url: video.url,
            videoId: video.videoId, // <-- DATA PENTING INI DITAMBAHKAN
            audioUrl: mp3Result.status ? mp3Result.download.url : null,
            videoUrl: mp4Result.status ? mp4Result.download.url : null,
        };
        
        response.status(200).json(finalResult);

    } catch (error) {
        console.error("Error pada API ytmusic:", error);
        response.status(500).json({ message: error.message || 'Terjadi kesalahan di server.' });
    }
}
