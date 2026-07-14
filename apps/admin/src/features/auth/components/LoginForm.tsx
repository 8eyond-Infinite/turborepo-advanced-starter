import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ApiClient } from '@/lib/api-client';
import { Shield, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

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
            navigate('/', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-2xl shadow-2xl relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="h-12 w-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4">
                        <Shield className="h-6 w-6 text-violet-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">Hệ Thống Admin</h2>
                    <p className="text-sm text-zinc-500 mt-1">Đăng nhập tài khoản quản trị viên</p>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 bg-red-950/40 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl py-3 pl-11 pr-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl py-3 pl-11 pr-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Đang xác thực...</span>
                            </>
                        ) : (
                            <span>Đăng Nhập</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
