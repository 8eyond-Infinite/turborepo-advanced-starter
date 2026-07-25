import React from 'react';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale/vi';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const getIcon = (type: string) => {
        const iconClass = "w-4 h-4 mr-2 shrink-0";
        switch (type.toUpperCase()) {
            case 'SUCCESS':
                return <CheckCircle className={`${iconClass} text-green-500`} />;
            case 'WARNING':
                return <AlertTriangle className={`${iconClass} text-amber-500`} />;
            case 'ERROR':
            case 'DANGER':
                return <AlertCircle className={`${iconClass} text-red-500`} />;
            default:
                return <Info className={`${iconClass} text-blue-500`} />;
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
        } catch (e) {
            return 'vừa xong';
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full cursor-pointer"
                    title="Thông báo"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center rounded-full animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 p-0 max-h-[480px] bg-popover text-popover-foreground border-border rounded-xl shadow-xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h4 className="font-bold text-sm text-foreground">Thông báo</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsRead()}
                            className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent flex items-center gap-1 font-semibold transition-colors duration-200 cursor-pointer"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Đọc tất cả
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                <div className="overflow-y-auto flex-1 divide-y divide-border max-h-[360px] custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Không có thông báo nào.
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => !n.isRead && markAsRead(n.id)}
                                className={`p-4 text-left transition-all duration-200 cursor-pointer ${n.isRead
                                        ? 'opacity-60 hover:bg-accent/50'
                                        : 'bg-accent/20 hover:bg-accent'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center">
                                        {getIcon(n.type)}
                                        <h5 className="font-semibold text-xs text-foreground truncate max-w-[180px]">
                                            {n.title}
                                        </h5>
                                    </div>
                                    {!n.isRead && (
                                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-3 leading-relaxed pl-6">
                                    {n.content}
                                </p>
                                <div className="mt-2 text-[10px] text-muted-foreground flex items-center justify-between pl-6">
                                    <span>{formatTime(n.createdAt)}</span>
                                    {!n.isRead && (
                                        <span className="text-[9px] text-primary flex items-center gap-0.5 hover:underline">
                                            <Check className="w-2.5 h-2.5" />
                                            Đánh dấu đọc
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};
