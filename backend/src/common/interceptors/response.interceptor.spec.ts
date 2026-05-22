import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

jest.mock('nestjs-i18n', () => ({
  I18nContext: {
    current: jest.fn().mockReturnValue({
      t: (key: string) => (key === 'common.success' ? 'Thành công' : key),
    }),
  },
}));

function makeContext(statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeHandler(data: unknown): CallHandler {
  return { handle: () => of(data) };
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps data in envelope with statusCode', (done) => {
    interceptor.intercept(makeContext(200), makeHandler({ id: 1 })).subscribe((result) => {
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({ id: 1 });
      done();
    });
  });

  it('sets message from i18n common.success', (done) => {
    interceptor.intercept(makeContext(200), makeHandler(null)).subscribe((result) => {
      expect(result.message).toBe('Thành công');
      done();
    });
  });

  it('sets data to null when handler returns null', (done) => {
    interceptor.intercept(makeContext(204), makeHandler(null)).subscribe((result) => {
      expect(result.data).toBeNull();
      done();
    });
  });

  it('sets data to null when handler returns undefined', (done) => {
    interceptor.intercept(makeContext(204), makeHandler(undefined)).subscribe((result) => {
      expect(result.data).toBeNull();
      done();
    });
  });

  it('uses OK as fallback when i18n not available', (done) => {
    const { I18nContext } = jest.requireMock('nestjs-i18n') as {
      I18nContext: { current: jest.Mock };
    };
    I18nContext.current.mockReturnValueOnce(null);

    interceptor.intercept(makeContext(200), makeHandler('hello')).subscribe((result) => {
      expect(result.message).toBe('OK');
      done();
    });
  });

  it('reflects the response statusCode in the envelope', (done) => {
    interceptor.intercept(makeContext(201), makeHandler({ created: true })).subscribe((result) => {
      expect(result.statusCode).toBe(201);
      done();
    });
  });
});
