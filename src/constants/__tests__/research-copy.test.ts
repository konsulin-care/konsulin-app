import { describe, expect, it } from 'vitest';
import {
  FINAL_BATCH_MESSAGE,
  LAST_MID_BATCH_MESSAGE,
  MID_BATCH_FALLBACK_MESSAGE,
  MID_BATCH_MESSAGES,
  STANDALONE_MESSAGE,
  STANDALONE_RESEARCH_MESSAGE,
  fillProgress
} from '../research-copy';

describe('research-copy', () => {
  it('never uses em-dashes or en-dashes in any copy', () => {
    const allCopy = [
      ...MID_BATCH_MESSAGES,
      LAST_MID_BATCH_MESSAGE,
      MID_BATCH_FALLBACK_MESSAGE,
      FINAL_BATCH_MESSAGE,
      STANDALONE_MESSAGE,
      STANDALONE_RESEARCH_MESSAGE
    ];
    for (const message of allCopy) {
      expect(message.title).not.toMatch(/[—–]/);
      expect(message.body).not.toMatch(/[—–]/);
    }
  });

  it('defines five mid-batch variations with progress placeholders', () => {
    expect(MID_BATCH_MESSAGES).toHaveLength(5);
    for (const message of MID_BATCH_MESSAGES) {
      expect(message.title.length).toBeGreaterThan(0);
      expect(message.body).toContain('{completed}');
      expect(message.body).toContain('{total}');
    }
  });

  it('uses a dedicated last-mid-batch message', () => {
    expect(LAST_MID_BATCH_MESSAGE.title).toBe('Almost there!');
    expect(LAST_MID_BATCH_MESSAGE.body).toContain('assessment left');
  });

  it('provides a count-less fallback for missing batch progress', () => {
    expect(MID_BATCH_FALLBACK_MESSAGE.title.length).toBeGreaterThan(0);
    expect(MID_BATCH_FALLBACK_MESSAGE.body).not.toContain('{completed}');
    expect(MID_BATCH_FALLBACK_MESSAGE.body).not.toContain('{total}');
  });

  it('final batch message confirms completion', () => {
    expect(FINAL_BATCH_MESSAGE.title).toBe("You've completed this batch!");
    expect(FINAL_BATCH_MESSAGE.body).toContain('Thank you');
  });

  it('standalone messages are English completion copy', () => {
    expect(STANDALONE_MESSAGE.title).toBe("You've completed the test!");
    expect(STANDALONE_RESEARCH_MESSAGE.title).toBe(
      'Thank you for completing this assessment!'
    );
  });

  it('fillProgress interpolates the completed and total placeholders', () => {
    const filled = fillProgress(
      "You've completed {completed} of {total} assessments in this batch",
      2,
      4
    );
    expect(filled).toBe("You've completed 2 of 4 assessments in this batch");
  });
});
