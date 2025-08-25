import yts from 'yt-search';
import ytdl from '@vreden/youtube_scraper';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    const { query } = request.body;
    if (!query) {
        return response.status(400).json({ message: 'Query pencarian tidak boleh kosong.' });
    }

    try {
        // Cari video berdasarkan query atau URL
        const searchResults = await yts(query);
        const video = searchResults.videos[0];

        if (!video) {
            return response.status(404).json({ message: 'Video tidak ditemukan.' });
        }

        // Ambil link download MP3 dan MP4 secara bersamaan
        const [mp3Result, mp4Result] = await Promise.all([
            ytdl.ytmp3(video.url),
            ytdl.ytmp4(video.url)
        ]);

        if (!mp3Result.status && !mp4Result.status) {
            throw new Error('Gagal mendapatkan link download.');
        }

        // Siapkan data untuk dikirim kembali ke frontend
        const finalResult = {
            title: video.title,
            author: video.author.name,
            thumbnail: video.thumbnail,
            duration: video.timestamp,
            url: video.url,
            audioUrl: mp3Result.status ? mp3Result.download.url : null,
            videoUrl: mp4Result.status ? mp4Result.download.url : null,
        };
        
        response.status(200).json(finalResult);

    } catch (error) {
        console.error("Error pada API ytmusic:", error);
        response.status(500).json({ message: error.message || 'Terjadi kesalahan di server.' });
    }
}