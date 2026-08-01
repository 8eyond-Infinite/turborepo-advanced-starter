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

  it('does not revoke access tokens for a profile-only update', () => {
    const user = registerUser();
    const initialTokenVersion = user.tokenVersion;

    user.updateInfo('new@example.com', 'new-user', '/avatar.png', 'admin-id');

    expect(user.tokenVersion).toBe(initialTokenVersion);
  });

  it('requires verification again when the email address changes', () => {
    const user = UserEntity.register({
      id: 'verified-user',
      email: 'old@example.com',
      username: 'verified',
      passwordHash: 'hash',
      emailVerifiedAt: new Date(),
    });
    user.updateInfo('new@example.com', user.username, user.avatar);
    expect(user.emailVerifiedAt).toBeNull();
  });

  it('revokes access tokens once only when the assigned role set changes', () => {
    const user = registerUser();
    const initialTokenVersion = user.tokenVersion;

    user.updateRoles(['USER'], 'admin-id');
    expect(user.tokenVersion).toBe(initialTokenVersion);

    user.updateRoles(['AUDITOR', 'USER', 'AUDITOR'], 'admin-id');
    expect(user.roles).toEqual(['AUDITOR', 'USER']);
    expect(user.tokenVersion).toBe(initialTokenVersion + 1);

    user.updateRoles(['USER', 'AUDITOR'], 'admin-id');
    expect(user.tokenVersion).toBe(initialTokenVersion + 1);
  });

  it('soft deletes and restores the user', () => {
    const user = registerUser();

    user.softDelete('admin-id');
    expect(user.isDeleted).toBe(true);

    user.restore('admin-id');
    expect(user.isDeleted).toBe(false);
  });
});
