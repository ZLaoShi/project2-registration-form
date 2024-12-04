import { z } from 'zod';

// 使用 z.coerce 将输入强制转换为 BigInt 类型
export const AuthSchema = z.object({
  userId: z.union([
    z.string().regex(/^[-]?\d+$/).transform((val) => BigInt(val)),  // 支持负数和数字的字符串
    z.bigint()  // 支持 BigInt 类型的值
  ]),
  role: z.string(),
});

// 类型推导 
export type AuthData = z.infer<typeof AuthSchema>;
