import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/lib/error-handler";
import { EmptyState } from "./empty-state";

interface QueryErrorStateProps {
  error: unknown;
  onRetry: () => void;
  title?: string;
  className?: string;
  isRetrying?: boolean;
}

export const QueryErrorState = ({
  error,
  onRetry,
  title = "Không thể tải dữ liệu",
  className,
  isRetrying = false,
}: QueryErrorStateProps) => (
  <EmptyState
    title={title}
    description={getFriendlyErrorMessage(error)}
    icon={AlertTriangle}
    className={className}
    action={
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        aria-label="Thử tải lại dữ liệu"
      >
        <RefreshCw
          className={`mr-1.5 h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`}
        />
        {isRetrying ? "Đang tải lại..." : "Thử lại"}
      </Button>
    }
  />
);
