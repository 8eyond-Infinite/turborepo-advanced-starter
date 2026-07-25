export const CACHE_PORT = Symbol('CACHE_PORT');

export interface ICachePort {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  scan(pattern: string, count?: number): Promise<string[]>;
}
