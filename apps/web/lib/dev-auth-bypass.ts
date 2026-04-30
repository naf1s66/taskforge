export interface DevAuthBypassEnv {
  NODE_ENV?: string;
  TF_DEV_BYPASS_AUTH?: string;
}

export function isDevAuthBypassEnabled(env: DevAuthBypassEnv = process.env): boolean {
  return (
    (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') &&
    env.TF_DEV_BYPASS_AUTH === 'true'
  );
}
