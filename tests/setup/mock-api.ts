// @ts-expect-error plain .mjs fixture
import { startMockApi } from '../fixtures/mock-api.mjs'

/** vitest globalSetup: the API the app talks to during tests (see vitest.config.ts env). */
export default async function setup() {
  if (process.env.MOCK_API_RUNNING) return // scripts/test-hydration.mjs already serves the fixture on :4010
  const server = await startMockApi(4010)
  return () => server.close()
}
