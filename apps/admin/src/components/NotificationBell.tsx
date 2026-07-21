import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale/vi';

export const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        setIsOpen(!isOpen);
    };

    const getIcon = (type: string) => {
        const iconClass = "w-4 h-4 mr-2";
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
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Trigger */}
            <button
                onClick={handleBellClick}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none rounded-full hover:bg-white/5"
                title="Thông báo"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Glassmorphic Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-[480px] bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <h4 className="font-bold text-sm text-foreground">Thông báo</h4>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 font-semibold transition-colors duration-200"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto flex-1 divide-y divide-white/5 max-h-[360px] custom-scrollbar">
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
                                            ? 'opacity-65 hover:bg-white/[0.01]'
                                            : 'bg-white/[0.03] hover:bg-white/[0.05]'
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
                                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3 leading-relaxed pl-6">
                                        {n.content}
                                    </p>
                                    <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-between pl-6">
                                        <span>{formatTime(n.createdAt)}</span>
                                        {!n.isRead && (
                                            <span className="text-[9px] text-blue-400 flex items-center gap-0.5 hover:underline">
                                                <Check className="w-2.5 h-2.5" />
                                                Đánh dấu đọc
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
