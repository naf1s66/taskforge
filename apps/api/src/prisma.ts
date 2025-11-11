import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let client: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    client = new PrismaClient();
  }
  return client;
}
