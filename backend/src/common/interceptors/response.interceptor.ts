import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  message: string;
  data: T | null;
  statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(ctx: ExecutionContext, next: CallHandler<T>): Observable<ResponseEnvelope<T>> {
    const res = ctx.switchToHttp().getResponse<{ statusCode: number }>();
    const i18n = I18nContext.current(ctx);

    return next.handle().pipe(
      map((data) => ({
        message: i18n?.t('common.success') ?? 'OK',
        data: data ?? null,
        statusCode: res.statusCode,
      })),
    );
  }
}
