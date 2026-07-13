import { UserEntity } from '../../domain/user.entity';

export class UserPresenter {
    static toResponse(user: UserEntity) {
        const data = user.toPrimitives();
        return {
            id: data.id,
            email: data.email,
            isActive: data.isActive,
            isDeleted: data.isDeleted,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
        };
    }
}
