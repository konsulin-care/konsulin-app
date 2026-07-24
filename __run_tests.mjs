import { execSync } from 'node:child_process'
try {
  const result = execSync(
    'node node_modules/.bin/vitest run --reporter verbose src/app/record/__tests__/record-journal.test.tsx src/app/record/__tests__/record-detail.test.tsx',
    {
      cwd: '/home/lam/data/professional/jobs/company/konsulin/git-repo/frontend',
      encoding: 'utf8',
      timeout: 120000
    }
  )
  console.log(result)
} catch (err) {
  console.log(err.stdout)
  console.log(err.stderr)
}
