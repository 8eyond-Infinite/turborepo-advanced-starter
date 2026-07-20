export interface ICacheInvalidationEvent {
    getCacheKeysToInvalidate(): string[];
    getCachePatternsToInvalidate(): string[];
}
