import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';

interface PageCardProps {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export const PageCard = ({
    title,
    description,
    actions,
    children,
    className = '',
}: PageCardProps) => {
    const hasHeader = title || description || actions;

    return (
        <Card className={`border border-border bg-card shadow-xs rounded-xl overflow-hidden py-0 gap-0 ${className}`}>
            {hasHeader && (
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 px-6 py-4">
                    <div className="space-y-1">
                        {title && <CardTitle className="text-sm font-bold text-foreground tracking-tight">{title}</CardTitle>}
                        {description && (
                            <CardDescription className="text-xs text-muted-foreground">
                                {description}
                            </CardDescription>
                        )}
                    </div>
                    {actions && (
                        <div className="flex items-center gap-2 shrink-0">
                            {actions}
                        </div>
                    )}
                </CardHeader>
            )}
            <CardContent className="p-0">
                {children}
            </CardContent>
        </Card>
    );
};
