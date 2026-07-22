import { readFileSync, existsSync } from 'fs'
const pkg = JSON.parse(readFileSync('/home/lam/data/professional/jobs/company/konsulin/git-repo/frontend/package.json', 'utf8'))
console.log('axios:', pkg.dependencies.axios)
console.log('cookies-next:', pkg.dependencies['cookies-next'] || 'REMOVED')
console.log('sonner:', pkg.dependencies.sonner || 'REMOVED')
console.log('radix-toast:', pkg.dependencies['@radix-ui/react-toast'] || 'REMOVED')
console.log('shell-quote:', pkg.overrides['shell-quote'])
console.log('overrides count:', Object.keys(pkg.overrides).length);
// Check if files exist
['sonner.tsx', 'toaster.tsx', 'toast.tsx', 'use-toast.ts'].forEach(f => {
  const p = '/home/lam/data/professional/jobs/company/konsulin/git-repo/frontend/src/components/ui/' + f
  console.log(f + ' exists:', existsSync(p))
})
