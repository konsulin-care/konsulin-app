import { describe, expect, it } from 'vitest';
import en from '../../messages/en/research.json';
import id from '../../messages/id/research.json';
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
      expect(message.title).not.toMatch(/[—–]/u);
      expect(message.body).not.toMatch(/[—–]/u);
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

  it('matches the exact en and id encouragement strings', () => {
    const bodies = [
      [
        'mid_batch_2',
        MID_BATCH_MESSAGES[1].body,
        '{completed} of {total} done. Each assessment brings the study closer to an answer.',
        '{completed} dari {total} selesai. Setiap asesmen membawa studi ini lebih dekat ke jawabannya.'
      ],
      [
        'mid_batch_4',
        MID_BATCH_MESSAGES[3].body,
        '{completed} of {total} done in this batch. Every answer adds to what the study can learn.',
        '{completed} dari {total} selesai dalam batch ini. Setiap jawaban menambah apa yang dapat dipelajari studi ini.'
      ],
      [
        'mid_batch_5',
        MID_BATCH_MESSAGES[4].body,
        "{completed} of {total} complete. Thank you for sticking with it. You're nearly there.",
        '{completed} dari {total} selesai. Terima kasih sudah bertahan sejauh ini. Anda hampir sampai.'
      ]
    ] as const;
    for (const [key, constant, enText, idText] of bodies) {
      const k = key as 'mid_batch_2' | 'mid_batch_4' | 'mid_batch_5';
      expect(en[k].body).toBe(enText);
      expect(id[k].body).toBe(idText);
      expect(constant).toBe(enText);
    }
    expect(en.batch_complete_body).toBe(
      "That's every assessment in this batch. Thank you for participating. Your responses help the research move forward."
    );
    expect(id.batch_complete_body).toBe(
      'Semua asesmen dalam batch ini telah selesai. Terima kasih telah berpartisipasi. Respons Anda membantu penelitian ini melangkah maju.'
    );
    expect(FINAL_BATCH_MESSAGE.body).toBe(en.batch_complete_body);
    expect(en.standalone_research_body).toBe(
      'Your response helps the research move forward.'
    );
    expect(id.standalone_research_body).toBe(
      'Respons Anda membantu penelitian ini melangkah maju.'
    );
    expect(STANDALONE_RESEARCH_MESSAGE.body).toBe(en.standalone_research_body);
  });

  it('avoids banned phrases', () => {
    const text = JSON.stringify([en, MID_BATCH_MESSAGES, FINAL_BATCH_MESSAGE]);
    expect(text).not.toMatch(/public health care|so we're nearly there/u);
    expect(JSON.stringify(MID_BATCH_MESSAGES)).not.toMatch(/mental health/u);
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
