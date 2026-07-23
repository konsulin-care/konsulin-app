import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
try {
  const out = execSync(
    'node node_modules/.bin/vitest run --reporter verbose src/app/record/__tests__/record-journal.test.tsx src/app/record/__tests__/record-detail.test.tsx',
    {
      cwd: '.',
      timeout: 120000,
      encoding: 'utf8'
    }
  );
  writeFileSync('test_output.txt', out);
  console.log('TEST OUTPUT WRITTEN');
} catch (e) {
  writeFileSync('test_output.txt', (e.stdout || '') + '\n---STDERR---\n' + (e.stderr || ''));
  console.log('TEST OUTPUT WRITTEN (with error)');
}
