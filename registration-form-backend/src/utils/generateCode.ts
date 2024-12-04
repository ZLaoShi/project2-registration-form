import { randomBytes } from 'crypto';


export const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 生成一个 6 位的随机验证码
  };
  
export function generateQueryKey(): string {
    return randomBytes(8).toString('hex'); // 生成长度为16的随机字符串
  }