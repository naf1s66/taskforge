import type { JSX, SVGProps } from 'react';
import type { Metadata } from 'next';
import { Github } from 'lucide-react';

import { DevSignInButton } from '@/components/auth/dev-signin';
import { OAuthSignIn } from '@/components/auth/oauth-signin';
import {
  configuredOAuthProviders,
  devSignInProfile,
  hasOAuthProviders,
  isDevSignInEnabled,
  type OAuthProviderId,
} from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign in • TaskForge',
  description: 'Authenticate with GitHub or Google to access TaskForge.',
};

const providerCopy: Record<OAuthProviderId, { label: string; description: string; icon: JSX.Element }> = {
  github: {
    label: 'Continue with GitHub',
    description: 'Uses your GitHub developer identity.',
    icon: <Github className="h-4 w-4" />,
  },
  google: {
    label: 'Continue with Google',
    description: 'Works with Workspace and personal accounts.',
    icon: <GoogleIcon className="h-4 w-4" />,
  },
};

type LoginPageProps = {
  searchParams?: {
    from?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const providers = configuredOAuthProviders.map((providerId) => ({
    id: providerId,
    label: providerCopy[providerId].label,
    icon: providerCopy[providerId].icon,
  }));
  const fromParam = searchParams?.from;
  const fromPath = fromParam && fromParam.startsWith('/') ? fromParam : '/';

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-border/70 bg-card/40 p-8 shadow-xl shadow-black/20 backdrop-blur">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          TaskForge uses OAuth via Auth.js. Sign in with a connected provider to continue.
        </p>
      </header>
      <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-xs text-primary-foreground/80">
        Redirected from <code>{fromPath}</code>. Authenticate to unlock protected pages.
      </div>
      {hasOAuthProviders ? (
        <div className="space-y-6">
          <OAuthSignIn providers={providers} />
          <ul className="space-y-2 text-xs text-muted-foreground">
            {configuredOAuthProviders.map((providerId) => (
              <li key={providerId} className="flex items-center gap-2">
                <span className="text-muted-foreground/70">•</span>
                {providerCopy[providerId].description}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-yellow-500/60 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            OAuth not configured. Add GitHub and Google client credentials to <code>.env.local</code> or the Docker env file.
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3 text-xs text-muted-foreground">
            Required variables: <code>GITHUB_ID</code>, <code>GITHUB_SECRET</code>, <code>GOOGLE_ID</code>, <code>GOOGLE_SECRET</code>,
            <code> NEXTAUTH_URL</code>, <code> NEXTAUTH_SECRET</code>.
          </div>
          {isDevSignInEnabled && devSignInProfile && (
            <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
              <p className="text-sm text-primary-foreground/80">
                Need to preview the app locally? Use the development login below to simulate an authenticated session.
              </p>
              <DevSignInButton
                callbackPath={fromPath}
                email={devSignInProfile.email}
                label={`Continue as ${devSignInProfile.name}`}
              />
              <p className="text-xs text-primary-foreground/70">
                Replace this flow with GitHub/Google OAuth before deploying.
              </p>
            </div>
          )}
        </div>
      )}
      <footer className="text-xs text-muted-foreground">
        OAuth apps should use callback URL <code>http://localhost:3000/api/auth/callback/&lt;provider&gt;</code>. Production URLs come next.
      </footer>
    </div>
  );
}

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5c-.2 1-.8 1.9-1.7 2.5v2.1h2.8c1.6-1.5 2.5-3.7 2.5-6.5Z"
        fill="#4285F4"
      />
      <path d="M12 22c2.3 0 4.2-.8 5.6-2.3l-2.8-2.1c-.8.5-1.8.8-2.8.8-2.2 0-4-1.5-4.7-3.5H4.4v2.2C5.8 20.4 8.7 22 12 22Z" fill="#34A853" />
      <path d="M7.3 14.9c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V9.3H4.4C3.9 10.3 3.6 11.4 3.6 12.5s.3 2.2.8 3.2l2.9-2.3Z" fill="#FBBC05" />
      <path d="M12 7.6c1.2 0 2.3.4 3.1 1.2l2.3-2.3C16.2 4.7 14.3 4 12 4 8.7 4 5.8 5.6 4.4 8.3l2.9 2.2c.7-2 2.5-2.9 4.7-2.9Z" fill="#EA4335" />
    </svg>
  );
}
