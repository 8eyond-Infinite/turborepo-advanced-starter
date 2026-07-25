import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { Button } from "@/components/ui/button";

const getRouteErrorMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) {
    return error.status === 404
      ? "Trang bạn yêu cầu không tồn tại."
      : `Không thể mở trang này (HTTP ${error.status}).`;
  }
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi không xác định khi tải trang.";
};

export const RouteErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("[RouteErrorBoundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section
        className="w-full max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm"
        role="alert"
      >
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <h1 className="text-lg font-bold">Không thể hiển thị trang</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {getRouteErrorMessage(error)}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button type="button" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tải lại
          </Button>
        </div>
      </section>
    </main>
  );
};
