import fetch from 'node-fetch';

export default async function handler(request, response) {
    const { url } = request.query;

    if (!url) {
        return response.status(400).send('URL parameter is required.');
    }

    try {
        const allowedDomains = [
            'tiktokcdn.com', 
            'rapidcdn.app', 
            'cdninstagram.com',
            'pixhost.to',           // <-- DOMAIN BARU DITAMBAHKAN
            'replicate.delivery'    // <-- DOMAIN BARU DITAMBAHKAN
        ];
        const urlHost = new URL(url).hostname;
        const isAllowed = allowedDomains.some(domain => urlHost.endsWith(domain));

        if (!isAllowed) {
             return response.status(403).send('Domain not allowed.');
        }

        const externalResponse = await fetch(url, {
            headers: {
                'Referer': 'https://www.instagram.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
            }
        });

        if (!externalResponse.ok) {
            return response.status(externalResponse.status).send('Failed to fetch image.');
        }

        const contentType = externalResponse.headers.get('content-type');
        response.setHeader('Content-Type', contentType || 'image/jpeg');
        
        externalResponse.body.pipe(response);

    } catch (error) {
        console.error("Image Proxy Error:", error);
        response.status(500).send('Error processing image request.');
    }
}