import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogsManagement } from "./AuditLogsManagement";

const { useAuditLogs } = vi.hoisted(() => ({ useAuditLogs: vi.fn() }));
vi.mock("../hooks/useAuditLogs", () => ({ useAuditLogs }));

const auditLog = {
  id: "audit-1",
  action: "SESSION_REVOKE_OTHERS",
  details: "Revoked every session except the current browser",
  userEmail: "admin@example.com",
  ip: "10.0.0.1",
  userAgent: "Mozilla/5.0 Chrome",
  correlationId: "request-correlation-123",
  createdAt: "2026-07-27T10:00:00.000Z",
};

const renderAudit = (initialEntry = "/audit") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuditLogsManagement />
    </MemoryRouter>,
  );

describe("<AuditLogsManagement />", () => {
  beforeEach(() => {
    useAuditLogs.mockReturnValue({
      logs: [auditLog],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });
  });

  it("uses URL search and pagination as query input", () => {
    renderAudit("/audit?q=session&page=2");

    expect(useAuditLogs).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: "session",
    });
    expect(
      screen.getByRole("textbox", { name: "Tìm kiếm nhật ký hoạt động" }),
    ).toHaveValue("session");
  });

  it("renders structured actor, network, device and timestamp details", () => {
    renderAudit();

    expect(screen.getByText("Thu hồi các phiên khác")).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    expect(screen.getByText("IP: 10.0.0.1")).toBeInTheDocument();
    expect(screen.getByText(/Mozilla\/5.0 Chrome/)).toBeInTheDocument();
    expect(
      screen.getByText("Mã truy vết: request-correlation-123"),
    ).toBeInTheDocument();
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      auditLog.createdAt,
    );
  });

  it("distinguishes an empty search result from an empty audit system", () => {
    useAuditLogs.mockReturnValue({
      logs: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    renderAudit("/audit?q=missing");

    expect(
      screen.getByText("Thử tìm kiếm với từ khóa khác."),
    ).toBeInTheDocument();
  });
});
