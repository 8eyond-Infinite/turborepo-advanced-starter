import type { User } from "@repo/types";
import { Pencil, Shield, Trash2, UserCheck, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfirmDialog,
  EmptyState,
  QueryErrorState,
  TablePagination,
} from "@/components";
import { resolveAvatarUrl } from "../utils/avatar-url";

interface UsersDataTableProps {
  users: User[];
  currentUserId: string | null;
  search: string;
  currentPage: number;
  totalPages: number;
  canUpdate: boolean;
  canDelete: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  isToggling: boolean;
  togglingUserId: string | null;
  isDeleting: boolean;
  deletingUserId: string | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onToggle: (user: User) => void;
  onDelete: (userId: string) => Promise<void>;
}

export const UsersDataTable = ({
  users,
  currentUserId,
  search,
  currentPage,
  totalPages,
  canUpdate,
  canDelete,
  isLoading,
  isError,
  error,
  isFetching,
  isToggling,
  togglingUserId,
  isDeleting,
  deletingUserId,
  onRetry,
  onPageChange,
  onEdit,
  onToggle,
  onDelete,
}: UsersDataTableProps) => {
  const showActions = canUpdate || canDelete;
  const columnCount = showActions ? 5 : 4;

  return (
    <>
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow className="border-border">
            <TableHead className="w-[30%] pl-6">Thành viên</TableHead>
            <TableHead className="w-[20%]">Vai trò</TableHead>
            <TableHead className="w-[15%] text-center">Trạng thái</TableHead>
            <TableHead className="w-[15%]">Ngày đăng ký</TableHead>
            {showActions && (
              <TableHead className="w-[20%] pr-6 text-right">
                Thao tác
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-48 text-center">
                <div
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                  role="status"
                  aria-label="Đang tải danh sách tài khoản"
                >
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                    aria-hidden="true"
                  />
                  Đang tải danh sách tài khoản...
                </div>
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columnCount}>
                <QueryErrorState
                  error={error}
                  onRetry={onRetry}
                  isRetrying={isFetching}
                />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-48">
                <EmptyState
                  title="Không tìm thấy tài khoản nào"
                  description={
                    search
                      ? `Không có kết quả khớp với từ khóa "${search}".`
                      : "Chưa có dữ liệu thành viên trên hệ thống."
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isThisUserToggling =
                isToggling && togglingUserId === user.id;
              const isThisUserDeleting =
                isDeleting && deletingUserId === user.id;

              return (
                <TableRow key={user.id} className="border-border">
                  <TableCell className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage
                          src={resolveAvatarUrl(user.avatar)}
                          alt=""
                        />
                        <AvatarFallback className="text-xs font-semibold uppercase">
                          {user.username?.substring(0, 2) || "US"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">
                          {user.username}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className="px-2 py-0 text-[10px]"
                          >
                            <Shield
                              className="mr-1 h-2 w-2"
                              aria-hidden="true"
                            />
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          Không có vai trò
                        </span>
                      )}
                      {isCurrentUser && (
                        <Badge
                          variant="secondary"
                          className="px-2 py-0 text-[10px]"
                        >
                          Tài khoản của bạn
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {canUpdate && !isCurrentUser && (
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() => onToggle(user)}
                          disabled={isToggling}
                          aria-label={`${user.isActive ? "Khóa" : "Kích hoạt"} tài khoản ${user.email}`}
                        />
                      )}
                      <Badge
                        variant="outline"
                        className="px-2 py-0 text-[10px]"
                      >
                        {user.isActive ? (
                          <UserCheck
                            className="mr-1 h-2.5 w-2.5 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <UserX
                            className="mr-1 h-2.5 w-2.5 text-destructive"
                            aria-hidden="true"
                          />
                        )}
                        {isThisUserToggling
                          ? "Đang cập nhật"
                          : user.isActive
                            ? "Hoạt động"
                            : "Đã khóa"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <time dateTime={user.createdAt}>
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </time>
                  </TableCell>
                  {showActions && (
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(user)}
                            aria-label={`Chỉnh sửa tài khoản ${user.email}`}
                            disabled={isThisUserToggling}
                          >
                            <Pencil
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                        )}
                        {canDelete && !isCurrentUser && (
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:text-destructive"
                                aria-label={`Xóa tài khoản ${user.email}`}
                                disabled={isDeleting}
                              >
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </Button>
                            }
                            title="Xác nhận xóa tài khoản?"
                            description={`Tài khoản ${user.email} sẽ bị đánh dấu xóa và không còn quyền truy cập.`}
                            confirmText="Xác nhận xóa"
                            pendingText="Đang xóa..."
                            variant="destructive"
                            onConfirm={() => onDelete(user.id)}
                          />
                        )}
                        {isThisUserDeleting && (
                          <span className="sr-only">Đang xóa {user.email}</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
};
