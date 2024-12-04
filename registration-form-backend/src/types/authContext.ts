export interface AuthContextVariables {
  userId: bigint; // 修改为 BigInt
  role: string;
}

export interface AuthEnv {
  Variables: AuthContextVariables;
}
