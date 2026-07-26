-- Cho phép lần ngược từ một event (và side effect của nó: email, notification,
-- realtime) về đúng HTTP request đã sinh ra nó. Nullable vì event do job nền
-- hoặc script tạo ra không thuộc request nào.
ALTER TABLE "outbox_events" ADD COLUMN "correlation_id" TEXT;
