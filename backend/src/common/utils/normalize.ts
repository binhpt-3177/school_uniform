/**
 * Normalize a Vietnamese (or any Unicode) string to a plain ASCII lowercase slug.
 * NFD decomposition → strip combining diacritics → map đ/Đ → d/D → lowercase → trim.
 */
export function normalize(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
