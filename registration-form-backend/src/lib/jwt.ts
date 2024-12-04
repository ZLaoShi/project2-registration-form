import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export function signToken(userId: number, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    
  } catch (err) {
    return null;
  }
}

export function extractUserIdFromToken(token: string): bigint {
  const secret = JWT_SECRET;
  const decoded = jwt.verify(token, secret) as { userId: string };
  return BigInt(decoded.userId); // 确保返回的是 bigint
}