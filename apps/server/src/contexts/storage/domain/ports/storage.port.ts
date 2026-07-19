export abstract class StoragePort {
    /**
     * Uploads a file and returns its public URL or unique storage key.
     */
    abstract upload(file: Express.Multer.File, folder?: string): Promise<string>;

    /**
     * Deletes a file from storage by its key or URL.
     */
    abstract delete(key: string): Promise<void>;
}
