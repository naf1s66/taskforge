declare module 'dotenv-flow' {
  interface ConfigOptions {
    node_env?: string;
    default_node_env?: string;
    path?: string;
    purge_dotenv?: boolean;
    silent?: boolean;
  }

  export function config(options?: ConfigOptions): void;
}

declare module 'dotenv-flow/config';
