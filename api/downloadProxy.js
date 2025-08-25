import fetch from 'node-fetch';

export default async function handler(request, response) {
    const { url, filename, download } = request.query;

    if (!url) {
        return response.status(400).json({ message: 'Parameter URL diperlukan.' });
    }

    try {
        const allowedDomains = ['tiktokcdn.com', 'googlevideo.com'];
        const urlHost = new URL(url).hostname;

        if (!allowedDomains.some(domain => urlHost.endsWith(domain))) {
            return response.status(403).json({ message: 'Domain tidak diizinkan.' });
        }

        const externalResponse = await fetch(url);
        if (!externalResponse.ok) {
            throw new Error(`Gagal mengambil file: Status ${externalResponse.status}`);
        }
        
        // ▼▼▼ PERUBAHAN UTAMA ADA DI SINI ▼▼▼
        // Hanya atur header 'Content-Disposition' jika permintaan untuk mengunduh
        if (download === 'true') {
            response.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
        }
        // ▲▲▲ AKHIR PERUBAHAN ▲▲▲
        
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