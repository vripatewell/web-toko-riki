import yts from 'yt-search';
import ytdl from 'ytdl-core';

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
        let videoInfo;
        const videoId = getYouTubeID(query);

        if (videoId) {
            videoInfo = await yts({ videoId });
        } else {
            const searchResults = await yts(query);
            videoInfo = searchResults.videos[0];
        }
        
        if (!videoInfo) {
            return response.status(404).json({ message: 'Video tidak ditemukan.' });
        }

        // Dapatkan info lengkap termasuk format download menggunakan ytdl-core
        const info = await ytdl.getInfo(videoInfo.url);

        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
        const videoFormat = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'videoandaudio' });

        const finalResult = {
            title: videoInfo.title,
            author: videoInfo.author.name,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.timestamp,
            url: videoInfo.url,
            videoId: videoInfo.videoId,
            audioUrl: audioFormat ? audioFormat.url : null,
            videoUrl: videoFormat ? videoFormat.url : null,
        };
        
        response.status(200).json(finalResult);

    } catch (error) {
        console.error("Error pada API ytmusic:", error);
        response.status(500).json({ message: 'Gagal memproses permintaan YouTube.' });
    }
}
