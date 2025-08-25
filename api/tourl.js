import { promises as fs } from 'fs';
import { IncomingForm } from 'formidable';
import { ImageUploadService } from 'node-upload-images';
import path from 'path'; // <-- Tambahkan import ini

// Menonaktifkan bodyParser bawaan Vercel
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Metode tidak diizinkan.' });
    }

    try {
        const form = new IncomingForm();
        const [fields, files] = await form.parse(request);
        const imageFile = files.image?.[0];

        if (!imageFile) {
            return response.status(400).json({ message: 'Tidak ada file gambar yang diunggah.' });
        }

        const fileContent = await fs.readFile(imageFile.filepath);
        
        // --- ▼▼▼ LOGIKA NAMA KUSTOM DIMULAI DI SINI ▼▼▼ ---

        // 1. Ambil ekstensi file asli (misalnya .jpg, .png)
        const fileExtension = path.extname(imageFile.originalFilename);
        
        // 2. Buat nama file baru yang Anda inginkan
        const newFilename = `by_rikishopreal${fileExtension}`;
        
        // 3. Unggah dengan nama file baru
        const service = new ImageUploadService('pixhost.to');
        const { directLink } = await service.uploadFromBinary(fileContent, newFilename);
        
        // --- ▲▲▲ LOGIKA NAMA KUSTOM SELESAI ▲▲▲ ---

        await fs.unlink(imageFile.filepath);

        response.status(200).json({ link: directLink });

    } catch (error) {
        console.error("Error pada API tourl:", error);
        response.status(500).json({ message: 'Terjadi kesalahan saat mengunggah gambar.' });
    }
}