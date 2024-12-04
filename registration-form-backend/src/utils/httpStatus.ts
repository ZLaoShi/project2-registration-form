// src/utils/httpStatus.ts

export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  } as const;
  
  // 导出类型，用于限制状态码的值
  export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
  