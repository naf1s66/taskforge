export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserStore {
  create(user: StoredUser): Promise<void>;
  findByEmail(email: string): Promise<StoredUser | undefined>;
  findById(id: string): Promise<StoredUser | undefined>;
  clear(): Promise<void>;
}

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, StoredUser>();

  create(user: StoredUser): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  findByEmail(email: string): Promise<StoredUser | undefined> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(undefined);
  }

  findById(id: string): Promise<StoredUser | undefined> {
    return Promise.resolve(this.users.get(id));
  }

  clear(): Promise<void> {
    this.users.clear();
    return Promise.resolve();
  }
}
