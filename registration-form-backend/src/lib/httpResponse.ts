import { Context } from 'hono';
import { HTTP_STATUS } from '../utils/httpStatus';


interface BaseResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

interface Pagination<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface Success<T> {
  type: 'success';
  value: T;
}

interface Failure {
  type: 'error';
  error: string;
}

type Result<T> = Success<T> | Failure;

class ResponseWrapper {
  // 统一处理 BigInt 转换为字符串
  static sanitizeData<T>(data: T): T {
    if (!data) return data;
    return JSON.parse(
      JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
  }

  // 创建响应基础格式
  static createResponse<T>(statusCode: number, message: string, data?: T): BaseResponse<T> {
    return {
      statusCode,
      message,
      data: this.sanitizeData(data), // 对数据进行 BigInt 转换处理
    };
  }

  // 将响应对象转化为 JSON 格式
  static jsonResponse<T>(context: Context, statusCode: number, message: string, data?: T) {
    const responseBody = this.createResponse(statusCode, message, data);
    const responseInit = {
      status: statusCode,
    };
    return context.json(responseBody, responseInit); // 传递 ResponseInit 对象
  }

  // 返回成功响应
  static success<T>(context: Context, data?: T, message = 'Success') {
    return this.jsonResponse(context, HTTP_STATUS.OK, message, data);
  }

  // 返回错误响应
  static error(context: Context, statusCode: number, message: string) {
    return this.jsonResponse(context, statusCode, message);
  }

  // 根据结果类型处理响应
  static handleResult<T>(context: Context, result: Result<T>) {
    if (result.type === 'success') {
      return this.success(context, result.value);
    } else {
      // 根据 service 返回的 statusCode 和 error 信息，生成错误响应
      return this.error(
        context,
        (result as any).statusCode || HTTP_STATUS.BAD_REQUEST, 
        result.error
      );
    }
  }

}

export default ResponseWrapper;
