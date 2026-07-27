import React from "react";
import { Loader2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string | React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  pendingText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
}

export const ConfirmDialog = ({
  trigger,
  open,
  onOpenChange,
  title = "Bạn có chắc chắn?",
  description = "Hành động này không thể hoàn tác.",
  cancelText = "Hủy",
  confirmText = "Xác nhận",
  pendingText = "Đang xử lý...",
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (isPending && !nextOpen) return;
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;

    setIsPending(true);
    try {
      await onConfirm();
      if (!isControlled) setInternalOpen(false);
      onOpenChange?.(false);
    } catch {
      // Mutation owner displays the domain error. Keep the dialog open so the
      // user can retry or cancel without losing context.
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={resolvedOpen} onOpenChange={setOpen}>
      {trigger && (
        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
          {trigger}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild={typeof description !== "string"}>
            {typeof description === "string" ? (
              description
            ) : (
              <div>{description}</div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                {pendingText}
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
