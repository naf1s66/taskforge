import jwt, { type SignOptions } from 'jsonwebtoken';

export interface TokenIssue {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  tokenType: 'Bearer';
}

export interface TokenServiceOptions {
  accessSecret: string;
  refreshSecret?: string;
  accessExpiresIn?: string | number;
  refreshExpiresIn?: string | number;
}

export interface TokenService {
  issueTokens(userId: string): Promise<TokenIssue>;
  verifyAccessToken(token: string): Promise<{ sub: string }>;
  verifyRefreshToken(token: string): Promise<{ sub: string }>;
}

function decodeExpiration(token: string): string {
  const payload = jwt.decode(token);
  if (typeof payload !== 'object' || payload === null || typeof payload.exp !== 'number') {
    throw new Error('Unable to decode token expiration');
  }
  return new Date(payload.exp * 1000).toISOString();
}

function verifyToken(token: string, secret: string): { sub: string } {
  const payload = jwt.verify(token, secret);
  if (typeof payload !== 'object' || payload === null || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub: payload.sub };
}

export function createTokenService(options: TokenServiceOptions): TokenService {
  const refreshSecret = options.refreshSecret ?? options.accessSecret;
  const accessExpiresIn = options.accessExpiresIn ?? '1h';
  const refreshExpiresIn = options.refreshExpiresIn ?? '7d';

  return {
    async issueTokens(userId) {
      const accessToken = jwt.sign(
        { sub: userId },
        options.accessSecret,
        { expiresIn: accessExpiresIn as SignOptions['expiresIn'] },
      );
      const refreshToken = jwt.sign(
        { sub: userId },
        refreshSecret,
        { expiresIn: refreshExpiresIn as SignOptions['expiresIn'] },
      );

      return {
        accessToken,
        refreshToken,
        accessTokenExpiresAt: decodeExpiration(accessToken),
        refreshTokenExpiresAt: decodeExpiration(refreshToken),
        tokenType: 'Bearer',
      };
    },
    async verifyAccessToken(token) {
      return verifyToken(token, options.accessSecret);
    },
    async verifyRefreshToken(token) {
      return verifyToken(token, refreshSecret);
    },
  };
}
