import type { PrismaClient } from '@prisma/client';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string | null;
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
    const normalized = email.toLowerCase();
    const match = Array.from(this.users.values()).find(
      candidate => candidate.email.toLowerCase() === normalized,
    );
    return Promise.resolve(match);
  }

  findById(id: string): Promise<StoredUser | undefined> {
    return Promise.resolve(this.users.get(id));
  }

  clear(): Promise<void> {
    this.users.clear();
    return Promise.resolve();
  }
}

export class PrismaUserStore implements UserStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(user: StoredUser): Promise<void> {
    const normalizedEmail = user.email.toLowerCase();

    await this.prisma.user.create({
      data: {
        id: user.id,
        email: normalizedEmail,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
      },
    });
  }

  async findByEmail(email: string): Promise<StoredUser | undefined> {
    const normalizedEmail = email.toLowerCase();
    const record = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    return record ? this.toStoredUser(record) : undefined;
  }

  async findById(id: string): Promise<StoredUser | undefined> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toStoredUser(record) : undefined;
  }

  async clear(): Promise<void> {
    await this.prisma.user.deleteMany();
  }

  private toStoredUser(record: PrismaUserRecord): StoredUser {
    return {
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash ?? null,
      createdAt: record.createdAt,
    };
  }
}
type PrismaUserRecord = NonNullable<Awaited<ReturnType<PrismaClient['user']['findUnique']>>>;
