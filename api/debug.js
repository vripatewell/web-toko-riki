import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(request, response) {
    try {
        const projectRoot = process.cwd();
        const filesInRoot = await fs.readdir(projectRoot);

        // Kode ini akan membaca daftar file di direktori utama
        // dan menampilkannya sebagai JSON
        response.status(200).json({
            message: "Daftar file di direktori utama proyek:",
            directory: projectRoot,
            files: filesInRoot
        });
    } catch (error) {
        response.status(500).json({
            message: "Gagal membaca direktori.",
            error: error.message
        });
    }
}
