import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from '../../domain/ports/storage.port';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageAdapter implements StoragePort {
    private readonly uploadDir: string;

    constructor(private readonly configService: ConfigService) {
        // Resolve path to apps/server/public/uploads
        this.uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(file: Express.Multer.File, folder = ''): Promise<string> {
        const targetFolder = path.join(this.uploadDir, folder);
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        const targetPath = path.join(targetFolder, uniqueFilename);

        await fs.promises.writeFile(targetPath, file.buffer);

        // Return the relative URL served by NestJS static assets
        const relativeUrlPath = path.join('/public/uploads', folder, uniqueFilename).replace(/\\/g, '/');
        return relativeUrlPath;
    }

    async delete(key: string): Promise<void> {
        // Strip public prefix if it exists to resolve file on local filesystem
        const relativePath = key.replace(/^\/public\/uploads/, '');
        const filePath = path.join(this.uploadDir, relativePath);

        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }
}
