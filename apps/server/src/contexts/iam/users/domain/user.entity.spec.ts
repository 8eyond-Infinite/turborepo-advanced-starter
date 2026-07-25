import { UserDeactivatedEvent } from './events/user-deactivated.event';
import { UserRegisteredEvent } from './events/user-registered.event';
import { UserEntity } from './user.entity';

describe('UserEntity', () => {
  const registerUser = () =>
    UserEntity.register({
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      passwordHash: 'hashed-password',
    });

  it('registers an active user and records one registration event', () => {
    const user = registerUser();

    expect(user.isActive).toBe(true);
    expect(user.isDeleted).toBe(false);
    expect(user.roles).toEqual(['USER']);

    const events = user.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserRegisteredEvent);
    expect(user.pullDomainEvents()).toEqual([]);
  });

  it('deactivates the user and records the domain transition', () => {
    const user = registerUser();
    user.pullDomainEvents();

    user.deactivate('admin-id');

    expect(user.isActive).toBe(false);
    expect(user.updatedBy).toBe('admin-id');
    expect(user.pullDomainEvents()).toEqual([expect.any(UserDeactivatedEvent)]);
  });

  it('updates profile and roles through aggregate behavior', () => {
    const user = registerUser();
    user.pullDomainEvents();

    user.updateInfo('new@example.com', 'new-user', '/avatar.png', 'admin-id');
    user.updateRoles(['ADMIN'], 'admin-id');

    expect(user.email).toBe('new@example.com');
    expect(user.username).toBe('new-user');
    expect(user.avatar).toBe('/avatar.png');
    expect(user.roles).toEqual(['ADMIN']);
    expect(user.updatedBy).toBe('admin-id');
  });

  it('soft deletes and restores the user', () => {
    const user = registerUser();

    user.softDelete('admin-id');
    expect(user.isDeleted).toBe(true);

    user.restore('admin-id');
    expect(user.isDeleted).toBe(false);
  });
});
