export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function success<T>(data: T) {
  return { status: 'success' as const, data };
}

export function error(message: string, code?: string) {
  return { status: 'error' as const, error: message, code };
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      body: { error: error.message }
    };
  }

  if (error instanceof Error) {
    // JWT verify errors
    if (error.name === 'JsonWebTokenError') {
      return {
        status: 401,
        body: { error: 'Geçersiz token' }
      };
    }
    if (error.name === 'TokenExpiredError') {
      return {
        status: 401,
        body: { error: 'Token süresi doldu' }
      };
    }
    
    return {
      status: 500,
      body: { error: error.message || 'Dahili Sunucu Hatası' }
    };
  }

  return {
    status: 500,
    body: { error: 'Beklenmeyen bir hata oluştu' }
  };
}
