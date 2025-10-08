import jwt from 'jsonwebtoken';

export interface TokenService {
  createToken(userId: string): Promise<string>;
  verifyToken(token: string): Promise<{ sub: string }>;
}

export function createTokenService(secret: string): TokenService {
  return {
    createToken(userId) {
      return Promise.resolve(jwt.sign({ sub: userId }, secret, { expiresIn: '1h' }));
    },
    verifyToken(token) {
      try {
        const payload = jwt.verify(token, secret);
        if (typeof payload !== 'object' || !payload || typeof payload.sub !== 'string') {
          throw new Error('Invalid token payload');
        }
        return Promise.resolve({ sub: payload.sub });
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
}
