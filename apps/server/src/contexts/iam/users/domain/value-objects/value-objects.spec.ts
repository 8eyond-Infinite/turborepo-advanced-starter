import { InvalidEmailException } from '../exceptions/invalid-email.exception';
import { InvalidPasswordException } from '../exceptions/invalid-password.exception';
import { InvalidUserIdException } from '../exceptions/invalid-user-id.exception';
import { InvalidUsernameException } from '../exceptions/invalid-username.exception';
import { Email } from './email.value-object';
import { Password } from './password.value-object';
import { UserId } from './user-id.value-object';
import { Username } from './username.value-object';

describe('User value objects', () => {
  it('creates valid values', () => {
    expect(new Email('user@example.com').value).toBe('user@example.com');
    expect(new Username('user').value).toBe('user');
    expect(new Password('hashed-password').value).toBe('hashed-password');
    expect(new UserId('user-id').value).toBe('user-id');
  });

  it.each(['', 'invalid-email'])('rejects invalid email "%s"', (value) => {
    expect(() => new Email(value)).toThrow(InvalidEmailException);
  });

  it.each(['', 'ab', 'a'.repeat(51)])(
    'rejects invalid username "%s"',
    (value) => {
      expect(() => new Username(value)).toThrow(InvalidUsernameException);
    },
  );

  it('rejects empty passwords and user identifiers', () => {
    expect(() => new Password('')).toThrow(InvalidPasswordException);
    expect(() => new UserId('')).toThrow(InvalidUserIdException);
  });
});
