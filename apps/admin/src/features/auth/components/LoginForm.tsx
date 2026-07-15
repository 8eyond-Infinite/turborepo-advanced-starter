import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ApiClient } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

export const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const tokens = await ApiClient.post<{ accessToken: string; refreshToken: string }>(
                '/auth/login',
                { email, password },
                { skipAuth: true }
            );

            ApiClient.setToken(tokens.accessToken);
            const user = await ApiClient.get<any>('/users/me');

            setAuth(user, tokens.accessToken, tokens.refreshToken);
            toast.success("Đăng nhập thành công! Chào mừng quay trở lại.");
            navigate('/', { replace: true });
        } catch (err: any) {
            const errMsg = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-border shadow-md">
                <CardHeader className="flex flex-col items-center pb-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                        Administrator Login
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground text-center">
                        Nhập tài khoản để tiếp tục vào trang quản trị
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
                                Email
                            </label>
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="bg-transparent border-input"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
                                Mật khẩu
                            </label>
                            <Input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-transparent border-input"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Xác thực...
                                </>
                            ) : (
                                "Đăng nhập"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
