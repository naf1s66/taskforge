import bcrypt from 'bcryptjs';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export function createPasswordHasher(rounds = 10): PasswordHasher {
  return {
    async hash(password) {
      return bcrypt.hash(password, rounds);
    },
    async verify(password, hash) {
      return bcrypt.compare(password, hash);
    },
  };
}
