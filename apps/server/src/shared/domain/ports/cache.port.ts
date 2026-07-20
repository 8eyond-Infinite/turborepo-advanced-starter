export const CACHE_PORT = Symbol('CachePort');

export interface ICachePort {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    keys(pattern: string): Promise<string[]>;
}
