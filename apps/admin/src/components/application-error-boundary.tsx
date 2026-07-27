import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/observability";

interface ApplicationErrorBoundaryProps {
  children: ReactNode;
}

interface ApplicationErrorBoundaryState {
  error: Error | null;
}

export class ApplicationErrorBoundary extends Component<
  ApplicationErrorBoundaryProps,
  ApplicationErrorBoundaryState
> {
  state: ApplicationErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ApplicationErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      source: "application",
      route: window.location.pathname,
      operation: "render",
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section
          className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm"
          role="alert"
        >
          <AlertTriangle
            className="mx-auto mb-4 h-10 w-10 text-destructive"
            aria-hidden="true"
          />
          <h1 className="text-lg font-bold">Ứng dụng gặp sự cố</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Một lỗi không mong đợi đã xảy ra. Hãy tải lại trang; nếu lỗi tiếp
            diễn, cung cấp thời điểm xảy ra lỗi cho đội vận hành.
          </p>
          <Button
            type="button"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tải lại ứng dụng
          </Button>
        </section>
      </main>
    );
  }
}
