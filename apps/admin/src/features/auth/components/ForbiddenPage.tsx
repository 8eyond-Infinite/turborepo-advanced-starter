import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ForbiddenPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground px-4">
            <div className="flex flex-col items-center text-center max-w-md p-8 rounded-2xl border border-border bg-card/50 backdrop-blur shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6 ring-8 ring-red-500/5">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2">403</h1>
                <h2 className="text-xl font-semibold text-foreground mb-3">Quyền truy cập bị từ chối</h2>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    Tài khoản của bạn không có đủ quyền hạn để truy cập vào trang này. Vui lòng liên hệ Quản trị viên hệ thống nếu bạn nghĩ đây là sự nhầm lẫn.
                </p>
                <Button asChild className="w-full gap-2 cursor-pointer">
                    <Link to="/">
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại Trang chủ
                    </Link>
                </Button>
            </div>
        </div>
    );
}
