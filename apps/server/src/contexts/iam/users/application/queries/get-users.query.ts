export class GetUsersQuery {
    constructor(
        public readonly page: number = 1,
        public readonly limit: number = 10,
        public readonly search?: string,
        public readonly sortBy?: string,
        public readonly sortOrder: 'asc' | 'desc' = 'desc',
    ) { }
}
