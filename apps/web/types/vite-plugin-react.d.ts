declare module '@vitejs/plugin-react' {
  import type { PluginOption } from 'vite';

  export type ReactPluginOptions = {
    babel?: Record<string, unknown>;
    include?: string | RegExp | Array<string | RegExp>;
    exclude?: string | RegExp | Array<string | RegExp>;
    jsxRuntime?: 'classic' | 'automatic';
    jsxImportSource?: string;
  };

  export default function reactPlugin(options?: ReactPluginOptions): PluginOption;
}
