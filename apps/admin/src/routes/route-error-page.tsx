import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getRouteErrorMessage } from "./route-error.presentation";
import { reportError } from "@/lib/observability";

export const RouteErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    reportError(error, {
      source: "route",
      route: window.location.pathname,
      operation: "render-route",
    });
  }, [error]);

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
        <h1 className="text-lg font-bold">Không thể hiển thị trang</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {getRouteErrorMessage(error)}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Quay lại
          </Button>
          <Button type="button" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tải lại
          </Button>
        </div>
      </section>
    </main>
  );
};
