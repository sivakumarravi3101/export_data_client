/**
 * End-to-end check that prerendered pages hydrate cleanly.   npm run test:hydration
 * Starts the fixture API, builds the site against it, boots the real client app on the prerendered HTML
 * (fails on hydration mismatches / unexpected API calls), then DELETES dist/ and dist-ssr/ so a build made
 * from fixture data can never be deployed by accident. Run your real `npm run build` afterwards.
 */
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { startMockApi } from '../tests/fixtures/mock-api.mjs'

const PORT = 4010
const env = { ...process.env, MOCK_API_RUNNING: '1', VITE_API_BASE_URL: `http://127.0.0.1:${PORT}`, VITE_SITE_URL: 'https://www.exportdata.test', VITE_SITE_NAME: 'India Export Data', VITE_SITE_INDEXABLE: 'true' }
// Must be async: the fixture API lives in THIS process, so blocking it (spawnSync) would deadlock the build that calls it.
const run = (cmd) => new Promise((resolve) => spawn(cmd, { stdio: 'inherit', shell: true, env }).on('exit', (c) => resolve(c ?? 1)))

const api = await startMockApi(PORT)
let code = 1
try {
  code = (await run('npm run build:site')) || (await run('npm run seo:audit')) || (await run('npx vitest run tests/hydration.test.ts'))
} finally {
  await api.close()
  rmSync('dist', { recursive: true, force: true })
  rmSync('dist-ssr', { recursive: true, force: true })
  console.log('[hydration] removed dist/ and dist-ssr/ (they were built from fixture data). Run `npm run build` for a real build.')
}
process.exit(code)
