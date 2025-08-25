import fetch from 'node-fetch';

export default async function handler(request, response) {
    const { url, filename } = request.query;

    if (!url) {
        return response.status(400).json({ message: 'URL parameter is required.' });
    }

    try {
        // ▼▼▼ PERUBAHAN DI SINI ▼▼▼
        // Izinkan download dari TikTok dan Google Video (server YouTube)
        const allowedDomains = ['tiktokcdn.com', 'googlevideo.com'];
        const urlHost = new URL(url).hostname;

        if (!allowedDomains.some(domain => urlHost.endsWith(domain))) {
            return response.status(403).json({ message: 'Domain tidak diizinkan.' });
        }
        // ▲▲▲ AKHIR PERUBAHAN ▲▲▲

        const externalResponse = await fetch(url);
        if (!externalResponse.ok) {
            throw new Error(`Gagal mengambil file: Status ${externalResponse.status}`);
        }
        
        response.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
        const contentType = externalResponse.headers.get('content-type');
        if (contentType) {
            response.setHeader('Content-Type', contentType);
        }
        
        externalResponse.body.pipe(response);

    } catch (error) {
        console.error("Error pada proxy download:", error);
        response.status(500).json({ message: 'Gagal memproses download.' });
    }
}