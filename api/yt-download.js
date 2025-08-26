import ytdl from '@vreden/youtube_scraper';
import fetch from 'node-fetch';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    const { url, format } = request.body;
    if (!url || !format || !['ytmp3', 'ytmp4'].includes(format)) {
        return response.status(400).json({ message: 'Parameter URL dan format tidak valid.' });
    }

    try {
        const downloadResult = format === 'ytmp3' ? await ytdl.ytmp3(url) : await ytdl.ytmp4(url);

        if (!downloadResult.status || !downloadResult.download.url) {
            throw new Error('Gagal mendapatkan link download dari server sumber.');
        }

        const title = downloadResult.title || 'youtube_download';
        const filename = `${title}.${format.replace('ytm', '')}`;
        const externalFileUrl = downloadResult.download.url;
        const externalResponse = await fetch(externalFileUrl);

        if (!externalResponse.ok) {
            throw new Error(`Gagal mengambil file: Status ${externalResponse.status}`);
        }

        response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        const contentType = externalResponse.headers.get('content-type');
        if (contentType) {
            response.setHeader('Content-Type', contentType);
        }

        externalResponse.body.pipe(response);

    } catch (error) {
        console.error("Error pada API yt-download:", error);
        response.status(500).json({ message: error.message || 'Terjadi kesalahan di server.' });
    }
}