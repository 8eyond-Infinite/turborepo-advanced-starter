import { AsyncLocalStorage } from 'node:async_hooks';

// Mang correlation ID đi theo toàn bộ chuỗi xử lý bất đồng bộ mà không phải
// truyền tham số qua từng lớp. Nhờ vậy repository ghi outbox và router đẩy job
// đều biết request nào đã sinh ra chúng.
const storage = new AsyncLocalStorage<{ correlationId: string }>();

export const runWithCorrelationId = <T>(
  correlationId: string,
  callback: () => T,
): T => storage.run({ correlationId }, callback);

export const getCorrelationId = (): string | undefined =>
  storage.getStore()?.correlationId;
