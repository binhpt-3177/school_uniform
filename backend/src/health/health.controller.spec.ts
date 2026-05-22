import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('returns status ok', () => {
      const result = controller.check();
      expect(result.status).toBe('ok');
    });

    it('returns a numeric uptime', () => {
      const result = controller.check();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('returns db pending until phase-03', () => {
      const result = controller.check();
      expect(result.db).toBe('pending');
    });

    it('returns an ISO timestamp', () => {
      const result = controller.check();
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });
});
