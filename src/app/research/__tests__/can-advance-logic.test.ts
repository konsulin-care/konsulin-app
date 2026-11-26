import { describe, expect, it } from 'vitest';
import { canAdvanceOnTitlePage } from '../can-advance';

const COMPLETE = {
  title: 'My Study',
  description: 'A description',
  target: 10,
  question: 'Does it work?',
  ethicsStatus: 'applying'
};

describe('canAdvanceOnTitlePage', () => {
  it('returns false when both title and description are empty', () => {
    expect(
      canAdvanceOnTitlePage({ ...COMPLETE, title: '', description: '' })
    ).toBe(false);
  });

  it('returns false when only title is provided', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, description: '' })).toBe(false);
  });

  it('returns false when only description is provided', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, title: '' })).toBe(false);
  });

  it('returns true when title, description, target, question and ethics are set', () => {
    expect(canAdvanceOnTitlePage(COMPLETE)).toBe(true);
  });

  it('returns false when title is whitespace only', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, title: '   ' })).toBe(false);
  });

  it('returns false when description is whitespace only', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, description: '   ' })).toBe(
      false
    );
  });

  it('returns false when the research question is empty', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, question: '' })).toBe(false);
  });

  it('returns false when the research question is whitespace only', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, question: '   ' })).toBe(false);
  });

  it('returns false when the research question is undefined', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, question: undefined })).toBe(
      false
    );
  });

  it('returns false when the ethics status is empty', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, ethicsStatus: '' })).toBe(
      false
    );
  });

  it('returns false when the ethics status is undefined', () => {
    expect(
      canAdvanceOnTitlePage({ ...COMPLETE, ethicsStatus: undefined })
    ).toBe(false);
  });

  it('returns false when target is undefined', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, target: undefined })).toBe(
      false
    );
  });

  it('returns false when target is zero', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, target: 0 })).toBe(false);
  });

  it('returns false when target is negative', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, target: -5 })).toBe(false);
  });

  it('returns false when target is fractional', () => {
    expect(canAdvanceOnTitlePage({ ...COMPLETE, target: 2.5 })).toBe(false);
  });
});
