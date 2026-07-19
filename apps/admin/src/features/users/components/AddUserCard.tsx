import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleSelect } from '@/components';
import { AvatarUpload } from './AvatarUpload';
import { Loader2 } from 'lucide-react';

import type { Role } from '@repo/types';

interface AddUserCardProps {
    onClose: () => void;
    onCreateUser: (data: any) => any;
    isCreating: boolean;
    roles: Role[];
}

export const AddUserCard: React.FC<AddUserCardProps> = ({ onClose, onCreateUser, isCreating, roles }) => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState('USER');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !username.trim() || !password.trim()) return;

        try {
            await onCreateUser({
                email: email.trim(),
                username: username.trim(),
                password: password.trim(),
                avatar,
                roles: [selectedRole],
            });
            setEmail('');
            setUsername('');
            setPassword('');
            setAvatar(null);
            setSelectedRole('USER');
            onClose();
        } catch (error) {
            // Error is handled in useUsers hook
        }
    };

    return (
        <Card className="border-border bg-card p-5 max-w-xl transition-all">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="text-sm font-bold">Tạo tài khoản Người dùng</CardTitle>
                <CardDescription className="text-xs">
                    Đăng ký tài khoản người dùng trực tiếp và gán vai trò tương ứng trên hệ thống.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <AvatarUpload value={avatar} onChange={setAvatar} username={username || 'AV'} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground">Tên người dùng (Username)</label>
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="john_doe"
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
                            placeholder="john.doe@example.com"
                            className="mt-1 bg-transparent border-input"
                            required
                        />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground">Mật khẩu khởi tạo</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="mt-1 bg-transparent border-input"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground block">
                            Vai trò (Role)
                        </label>
                        <SingleSelect
                            options={roles.map((r) => ({ label: r.name, value: r.name }))}
                            value={selectedRole}
                            onChange={setSelectedRole}
                            placeholder="Chọn vai trò"
                            className="w-full bg-card"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
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
                        disabled={isCreating}
                        className="cursor-pointer text-xs"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Đang tạo...
                            </>
                        ) : (
                            'Tạo người dùng'
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    );
};
