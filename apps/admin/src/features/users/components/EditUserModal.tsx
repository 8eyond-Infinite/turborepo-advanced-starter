import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleSelect } from '@/components';
import { AvatarUpload } from './AvatarUpload';
import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import type { Role } from '@repo/types';

interface EditUserModalProps {
    user: any;
    onClose: () => void;
    onUpdateUser: (data: any) => any;
    isUpdating: boolean;
    roles: Role[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUpdateUser, isUpdating, roles }) => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [role, setRole] = useState('USER');

    useEffect(() => {
        if (user) {
            setEmail(user.email || '');
            setUsername(user.username || '');
            setAvatar(user.avatar || null);
            setRole(user.roles?.[0] || 'USER');
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !username.trim()) return;

        try {
            await onUpdateUser({
                id: user.id,
                email: email.trim(),
                username: username.trim(),
                avatar,
                roles: [role],
            });
            onClose();
        } catch (error) {
            // Error is handled in hook
        }
    };

    return (
        <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold">Chỉnh sửa tài khoản</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Cập nhật email và vai trò truy cập của người dùng trên hệ thống.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <AvatarUpload value={avatar} onChange={setAvatar} username={username || 'AV'} />

                    <div>
                        <label className="text-xs font-semibold text-muted-foreground">Tên người dùng (Username)</label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 bg-transparent border-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground">Địa chỉ Email</label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 bg-transparent border-input"
                            required
                        />
                    </div>
                    <div className="space-y-2 max-w-xs">
                        <label className="text-xs font-semibold text-muted-foreground block">
                            Vai trò (Role)
                        </label>
                        <SingleSelect
                            options={roles.map((r) => ({ label: r.name, value: r.name }))}
                            value={role}
                            onChange={setRole}
                            placeholder="Chọn vai trò"
                            className="w-full bg-card"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="cursor-pointer text-xs"
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={isUpdating}
                            className="cursor-pointer text-xs"
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu thay đổi'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
