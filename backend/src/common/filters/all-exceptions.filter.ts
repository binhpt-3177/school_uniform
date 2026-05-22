import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

interface ErrorEnvelope {
  error: string;
  message: string;
  statusCode: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const i18n = I18nContext.current(host);

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp
      ? (exception.getResponse() as Record<string, unknown>)
      : { message: 'common.errors.internal' };

    // Determine error code
    const code =
      typeof raw === 'object'
        ? ((raw['error'] ?? raw['code'] ?? exception?.constructor?.name ?? 'ERROR') as string)
        : 'ERROR';

    // Determine message — handle ValidationPipe array messages
    const rawMessage = typeof raw === 'object' ? raw['message'] : raw;
    let message: string;
    if (Array.isArray(rawMessage)) {
      message = rawMessage.join('; ');
    } else {
      const msgKey = String(rawMessage ?? 'common.errors.internal');
      message = i18n?.t(msgKey) ?? msgKey;
    }

    const envelope: ErrorEnvelope = { error: code, message, statusCode: status };
    res.status(status).json(envelope);
  }
}
