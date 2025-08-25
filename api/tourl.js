import { promises as fs } from 'fs';
import { IncomingForm } from 'formidable';
// ▼▼▼ INI PERBAIKAN UTAMA: Menggunakan 'import' bukan 'require' ▼▼▼
import { ImageUploadService } from 'node-upload-images';

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

        // --- Logika Unggah dari Kode Anda ---
        const service = new ImageUploadService('pixhost.to');
        const { directLink } = await service.uploadFromBinary(fileContent, imageFile.originalFilename);
        // --- Akhir Logika Unggah ---

        await fs.unlink(imageFile.filepath);

        response.status(200).json({ link: directLink });

    } catch (error) {
        console.error("Error pada API tourl:", error);
        response.status(500).json({ message: 'Terjadi kesalahan saat mengunggah gambar.' });
    }
}