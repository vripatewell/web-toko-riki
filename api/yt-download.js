// /api/yt-download.js
import ytdl from '@vreden/youtube_scraper';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metode tidak diizinkan.' });
  }

  try {
    const { url, format } = req.body || {};
    if (!url || !format || !['ytmp3', 'ytmp4'].includes(format)) {
      return res.status(400).json({ message: 'Parameter URL dan format tidak valid.' });
    }

    // Panggil library
    const downloadResult = format === 'ytmp3' ? await ytdl.ytmp3(url) : await ytdl.ytmp4(url);

    if (!downloadResult || downloadResult.status !== 'ok' && !downloadResult.download?.url) {
      // beberapa versi library bisa mengembalikan struktur beda, kita cek aman
      throw new Error('Gagal mendapatkan link download dari sumber.');
    }

    const titleRaw = (downloadResult.title || 'youtube_download').toString();
    // sanitize filename
    const title = titleRaw.replace(/[\\\/:*?"<>|]+/g, '').trim() || 'youtube_download';
    const ext = format === 'ytmp3' ? 'mp3' : 'mp4';
    const filename = `${title}.${ext}`;

    const externalUrl = downloadResult.download?.url || downloadResult.url || null;
    if (!externalUrl) throw new Error('URL file eksternal tidak ditemukan.');

    const externalRes = await fetch(externalUrl);
    if (!externalRes.ok) throw new Error(`Gagal mengambil file: Status ${externalRes.status}`);

    // Set headers supaya browser mengunduh file
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    const contentType = externalRes.headers.get('content-type') || (ext === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Type', contentType);

    // stream body ke response (node-fetch Readable stream)
    if (externalRes.body && typeof externalRes.body.pipe === 'function') {
      externalRes.body.pipe(res);
    } else {
      // fallback: buffer seluruh konten (untuk lingkungan yang tidak support streaming)
      const buffer = await externalRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Error pada API yt-download:', err);
    res.status(500).json({ message: err.message || 'Terjadi kesalahan di server.' });
  }
}