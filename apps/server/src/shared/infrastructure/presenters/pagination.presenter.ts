export interface PaginatedMeta {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
}

export class PaginatedResponsePresenter<T> {
    static toResponse<T>(data: T[], totalItems: number, page: number, limit: number) {
        const totalPages = Math.ceil(totalItems / limit);
        
        return {
            data,
            meta: {
                totalItems,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages,
                currentPage: page,
            },
        };
    }
}
