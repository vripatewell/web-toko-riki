import fetch from 'node-fetch';

export default async function handler(request, response) {
    const { url } = request.query;

    if (!url) {
        return response.status(400).send('URL parameter is required.');
    }

    try {
        // Validasi keamanan dasar: pastikan URL adalah domain TikTok
        const urlHost = new URL(url).hostname;
        if (!urlHost.endsWith('tiktokcdn.com') && !urlHost.endsWith('tiktok.com')) {
             return response.status(403).send('Domain not allowed.');
        }

        const externalResponse = await fetch(url, {
            headers: {
                // Menyamarkan request seolah-olah dari browser biasa
                'Referer': 'https://www.tiktok.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
            }
        });

        if (!externalResponse.ok) {
            return response.status(externalResponse.status).send('Failed to fetch image.');
        }

        const contentType = externalResponse.headers.get('content-type');
        response.setHeader('Content-Type', contentType || 'image/jpeg');
        
        // Alirkan gambar langsung ke browser
        externalResponse.body.pipe(response);

    } catch (error) {
        console.error("Image Proxy Error:", error);
        response.status(500).send('Error processing image request.');
    }
}
