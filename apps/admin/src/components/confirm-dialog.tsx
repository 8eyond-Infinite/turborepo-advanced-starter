import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title?: string;
    description?: string | React.ReactNode;
    cancelText?: string;
    confirmText?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
}

export const ConfirmDialog = ({
    trigger,
    open,
    onOpenChange,
    title = 'Bạn có chắc chắn?',
    description = 'Hành động này không thể hoàn tác.',
    cancelText = 'Hủy',
    confirmText = 'Xác nhận',
    onConfirm,
    variant = 'default',
}: ConfirmDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger && (
                <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                    {trigger}
                </AlertDialogTrigger>
            )}
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription asChild={typeof description !== 'string'}>
                        {typeof description === 'string' ? (
                            description
                        ) : (
                            <div>{description}</div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={variant}
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
