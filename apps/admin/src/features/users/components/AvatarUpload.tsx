import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AvatarUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    username?: string;
}

const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith('http')) return avatarPath;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${baseUrl}${avatarPath}`;
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ value, onChange, username = 'AV' }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await ApiClient.post<{ url: string }>('/storage/upload', formData);
            onChange(res.url);
            toast.success("Tải ảnh đại diện lên thành công!");
        } catch (error: any) {
            toast.error("Không thể tải ảnh lên: " + (error.message || error));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-muted/20 border border-dashed border-border rounded-lg">
            <div className="relative h-12 w-12 rounded-full shrink-0">
                <Avatar className="h-full w-full rounded-full">
                    <AvatarImage src={getAvatarUrl(value)} />
                    <AvatarFallback className="rounded-full bg-muted text-muted-foreground font-bold">
                        {username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">
                    Ảnh đại diện (Avatar)
                </label>
                <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleFileChange}
                    className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
            </div>
        </div>
    );
};
