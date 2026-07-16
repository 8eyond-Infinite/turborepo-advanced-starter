import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
} from './ui/empty';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    className?: string;
    variant?: 'simple' | 'dashed';
}

const variantClasses = {
    simple: 'border-0 bg-transparent py-8 min-h-[220px]',
    dashed: 'border border-dashed border-border/60 rounded-xl bg-muted/5 py-8 min-h-[280px]',
};

export const EmptyState = ({
    title,
    description,
    icon: Icon = Inbox,
    action,
    className = '',
    variant = 'simple',
}: EmptyStateProps) => {
    return (
        <Empty className={cn(variantClasses[variant], className)}>
            <EmptyHeader>
                <EmptyMedia variant="icon" className="mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground stroke-[1.8]" />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-semibold text-foreground tracking-tight">
                    {title}
                </EmptyTitle>
                {description && (
                    <EmptyDescription className="text-xs text-muted-foreground max-w-xs mt-0.5 leading-relaxed">
                        {description}
                    </EmptyDescription>
                )}
            </EmptyHeader>
            {action && (
                <EmptyContent className="mt-1">
                    {action}
                </EmptyContent>
            )}
        </Empty>
    );
};
