import fetch from 'node-fetch';

export default async function handler(request, response) {
    const { url, filename } = request.query;

    if (!url) {
        return response.status(400).json({ message: 'URL parameter is required.' });
    }

    try {
        // Validasi untuk keamanan: hanya izinkan download dari domain TikTok
        const allowedDomain = 'tiktokcdn.com';
        const urlHost = new URL(url).hostname;
        if (!urlHost.endsWith(allowedDomain)) {
            return response.status(403).json({ message: 'Domain tidak diizinkan.' });
        }

        const externalResponse = await fetch(url);

        if (!externalResponse.ok) {
            throw new Error(`Gagal mengambil file: Status ${externalResponse.status}`);
        }
        
        // Atur header agar browser melakukan download
        response.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
        
        // Ambil tipe konten dari respons asli (misal: video/mp4)
        const contentType = externalResponse.headers.get('content-type');
        if (contentType) {
            response.setHeader('Content-Type', contentType);
        }
        
        // Alirkan file langsung ke pengguna
        externalResponse.body.pipe(response);

    } catch (error) {
        console.error("Error pada proxy download:", error);
        response.status(500).json({ message: 'Gagal memproses download.' });
    }
}