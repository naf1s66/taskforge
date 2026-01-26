declare module 'dotenv-flow' {
  interface ConfigOptions {
    node_env?: string;
    default_node_env?: string;
    path?: string;
  }

  export function config(options?: ConfigOptions): void;
}

declare module '@testcontainers/postgresql' {
  import type { StartedTestContainer } from 'testcontainers';

  export interface StartedPostgreSqlContainer extends StartedTestContainer {
    getConnectionUri(): string;
    stop(): Promise<void>;
  }

  export class PostgreSqlContainer {
    constructor(image?: string);
    withTmpFs(path: string): this;
    start(): Promise<StartedPostgreSqlContainer>;
  }
}
