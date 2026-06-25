import { describe, expect, it } from 'vitest';
import { generateAvatarSvgDataUrl } from '../gradientAvatar';

describe('generateAvatarSvgDataUrl', () => {
  it('returns null when seed is empty', () => {
    const result = generateAvatarSvgDataUrl('', 'JD');
    expect(result).toBeNull();
  });

  it('returns null when initials is empty', () => {
    const result = generateAvatarSvgDataUrl('abc-123', '');
    expect(result).toBeNull();
  });

  it('returns null when both are empty', () => {
    const result = generateAvatarSvgDataUrl('', '');
    expect(result).toBeNull();
  });

  it('uses https://www.w3.org/2000/svg as SVG namespace', () => {
    const result = generateAvatarSvgDataUrl('practitioner-123', 'JD');
    expect(result).not.toBeNull();

    // Decode the data URL to inspect SVG content
    const svgContent = decodeURIComponent(
      result.replace('data:image/svg+xml;charset=utf-8,', '')
    );
    // eslint-disable-next-line unicorn/prefer-https
    expect(svgContent).toContain('http://www.w3.org/2000/svg');
    expect(svgContent).not.toContain('https://www.w3.org/2000/svg');
  });

  it('includes teal as the first gradient stop color', () => {
    const result = generateAvatarSvgDataUrl('practitioner-123', 'JD');
    expect(result).not.toBeNull();

    const svgContent = decodeURIComponent(
      result.replace('data:image/svg+xml;charset=utf-8,', '')
    );
    expect(svgContent).toContain('#13c2c2');
  });

  it('includes the initials as text in the SVG', () => {
    const result = generateAvatarSvgDataUrl('practitioner-123', 'AB');
    expect(result).not.toBeNull();

    const svgContent = decodeURIComponent(
      result.replace('data:image/svg+xml;charset=utf-8,', '')
    );
    expect(svgContent).toContain('AB');
  });
});
