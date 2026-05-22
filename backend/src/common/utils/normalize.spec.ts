import { normalize } from './normalize';

describe('normalize()', () => {
  it("converts 'Đà Nẵng' to 'da nang'", () => {
    expect(normalize('Đà Nẵng')).toBe('da nang');
  });

  it("converts 'Hà Nội' to 'ha noi'", () => {
    expect(normalize('Hà Nội')).toBe('ha noi');
  });

  it('returns empty string for null', () => {
    expect(normalize(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalize(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('passes through plain ASCII unchanged (after lowercase)', () => {
    expect(normalize('hello world')).toBe('hello world');
  });

  it('lowercases mixed-case ASCII', () => {
    expect(normalize('Hello World')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalize('  ha noi  ')).toBe('ha noi');
  });

  it('handles đ (lowercase) correctly', () => {
    expect(normalize('đường')).toBe('duong');
  });

  it('handles a mixed Vietnamese sentence', () => {
    expect(normalize('Thành Phố Hồ Chí Minh')).toBe('thanh pho ho chi minh');
  });
});
