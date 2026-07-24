import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
try {
  // NOSONAR: dev-only lint script, PATH is inherited from CI
  const out = execSync(
    'node node_modules/.bin/eslint --max-warnings 5 src/app/record/',
    {
      cwd: '.',
      timeout: 60000,
      encoding: 'utf8'
    }
  )
  writeFileSync('lint_output.txt', 'PASS: ' + out)
  console.log('LINT OUTPUT WRITTEN')
} catch (e) {
  writeFileSync('lint_output.txt', (e.stdout || '') + '\n---STDERR---\n' + (e.stderr || '') + '\n---CODE---\n' + e.status)
  console.log('LINT OUTPUT WRITTEN (with error)')
}
