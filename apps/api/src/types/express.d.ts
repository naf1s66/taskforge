import type { AuthUserDTO } from '@taskforge/shared';

declare global {
  namespace Express {
    interface Locals {
      user?: AuthUserDTO;
      token?: string;
    }
  }
}

export {};
