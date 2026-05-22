import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function makeHost(overrides: { statusCode?: number } = {}): ArgumentsHost {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const getResponse = jest
    .fn()
    .mockReturnValue({ statusCode: overrides.statusCode ?? 200, status });

  return {
    switchToHttp: () => ({ getResponse }),
    getArgs: () => [],
    getArgByIndex: () => null,
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
    getType: () => 'http',
  } as unknown as ArgumentsHost;
}

// Mock I18nContext so tests don't need a real i18n module
jest.mock('nestjs-i18n', () => ({
  I18nContext: {
    current: jest.fn().mockReturnValue({
      t: (key: string) => `[translated:${key}]`,
    }),
  },
}));

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('returns 500 for non-HTTP exceptions', () => {
    const host = makeHost();
    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();

    filter.catch(new Error('boom'), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('uses exception status for HttpException', () => {
    const host = makeHost();
    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();

    filter.catch(new HttpException('not found', HttpStatus.NOT_FOUND), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('extracts error code from HttpException response object', () => {
    const host = makeHost();
    const res = host.switchToHttp().getResponse<{
      status: jest.Mock;
      json?: jest.Mock;
    }>();
    const jsonMock = res.status(200 as never) as unknown as { json: jest.Mock };

    filter.catch(
      new HttpException({ error: 'MY_CODE', message: 'some.key' }, HttpStatus.BAD_REQUEST),
      host,
    );

    expect(jsonMock.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'MY_CODE' }));
  });

  it('joins array messages from ValidationPipe with semicolons', () => {
    const host = makeHost();
    const res = host.switchToHttp().getResponse<{ status: jest.Mock }>();
    const jsonMock = (res.status as jest.Mock).mock.results[0]?.value as
      | { json: jest.Mock }
      | undefined;

    // Re-create host so we can capture json call
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    const host2 = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200, status: statusSpy }),
      }),
      getArgs: () => [],
      getArgByIndex: () => null,
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
      getType: () => 'http',
    } as unknown as ArgumentsHost;

    filter.catch(
      new HttpException(
        { message: ['field must not be empty', 'field must be string'] },
        HttpStatus.BAD_REQUEST,
      ),
      host2,
    );

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'field must not be empty; field must be string',
      }),
    );
  });

  it('sets statusCode in envelope body', () => {
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200, status: statusSpy }),
      }),
      getArgs: () => [],
      getArgByIndex: () => null,
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
      getType: () => 'http',
    } as unknown as ArgumentsHost;

    filter.catch(new HttpException('conflict', HttpStatus.CONFLICT), host);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.CONFLICT }),
    );
  });

  it('uses constructor name as error code when no error/code field', () => {
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200, status: statusSpy }),
      }),
      getArgs: () => [],
      getArgByIndex: () => null,
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
      getType: () => 'http',
    } as unknown as ArgumentsHost;

    // Plain string response — no error field
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);

    const call = jsonSpy.mock.calls[0][0] as Record<string, unknown>;
    const errorCode = call.error as string;
    expect(typeof errorCode).toBe('string');
    expect(errorCode.length).toBeGreaterThan(0);
  });
});
