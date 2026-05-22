import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      // db ping deferred to phase-03 when TypeORM DataSource is wired
      db: 'pending',
      timestamp: new Date().toISOString(),
    };
  }
}
