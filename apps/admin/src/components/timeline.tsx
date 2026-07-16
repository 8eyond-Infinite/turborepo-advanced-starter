import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TimelineItem {
    id: string | number;
    title: string;
    description?: React.ReactNode;
    timestamp: string;
    icon?: LucideIcon;
    type?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
}

interface TimelineProps {
    items: TimelineItem[];
    className?: string;
}

const colorMap = {
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
    error: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-500/30',
    neutral: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30',
};

const dotColorMap = {
    info: 'bg-blue-500 ring-blue-500/20',
    success: 'bg-emerald-500 ring-emerald-500/20',
    warning: 'bg-amber-500 ring-amber-500/20',
    error: 'bg-red-500 ring-red-500/20',
    neutral: 'bg-zinc-500 ring-zinc-500/20',
};

export const Timeline = ({ items, className = '' }: TimelineProps) => {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div className={`relative pl-6 border-l border-border/80 space-y-6 ml-3 ${className}`}>
            {items.map((item) => {
                const Icon = item.icon;
                const type = item.type || 'neutral';

                return (
                    <div key={item.id} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                            {Icon ? (
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${colorMap[type]} transition-transform duration-200 group-hover:scale-110 shadow-xs`}>
                                    <Icon className="h-3 w-3 stroke-[2]" />
                                </div>
                            ) : (
                                <span className={`h-2.5 w-2.5 rounded-full ${dotColorMap[type]} ring-4`} />
                            )}
                        </div>

                        {/* Content block */}
                        <div className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                    {item.title}
                                </span>
                                <time className="text-[10px] text-muted-foreground font-medium shrink-0">
                                    {item.timestamp}
                                </time>
                            </div>
                            {item.description && (
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    {item.description}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
