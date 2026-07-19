import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from '../../domain/ports/storage.port';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class S3StorageAdapter implements StoragePort {
    private readonly s3Client: S3Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        const region = this.configService.get<string>('S3_REGION', 'us-east-1');
        const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
        const endpoint = this.configService.get<string>('S3_ENDPOINT'); // Optional for MinIO/DigitalOcean

        this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'turbostarter-bucket');

        this.s3Client = new S3Client({
            region,
            credentials:
                accessKeyId && secretAccessKey
                    ? { accessKeyId, secretAccessKey }
                    : undefined,
            endpoint: endpoint || undefined,
            forcePathStyle: endpoint ? true : false, // Required for MinIO/localstack
        });
    }

    async upload(file: Express.Multer.File, folder = ''): Promise<string> {
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        const key = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            })
        );

        // Retrieve public URL (if custom endpoint, use it, else default AWS URL)
        const endpoint = this.configService.get<string>('S3_ENDPOINT');
        if (endpoint) {
            return `${endpoint.replace(/\/$/, '')}/${this.bucketName}/${key}`;
        }
        return `https://${this.bucketName}.s3.${this.configService.get<string>('S3_REGION')}.amazonaws.com/${key}`;
    }

    async delete(key: string): Promise<void> {
        // Resolve target key from full URL if key is a URL
        let storageKey = key;
        const endpoint = this.configService.get<string>('S3_ENDPOINT');

        if (key.startsWith('http')) {
            if (endpoint && key.includes(endpoint)) {
                // MinIO style URL: http://endpoint/bucket/folder/file
                storageKey = key.split(`${this.bucketName}/`)[1] || key;
            } else {
                // AWS style URL: https://bucket.s3.region.amazonaws.com/folder/file
                const parts = key.split('.amazonaws.com/');
                storageKey = parts[1] || key;
            }
        }

        await this.s3Client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: storageKey,
            })
        );
    }
}
