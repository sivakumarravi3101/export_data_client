import { createApp, createSSRApp, type Plugin } from 'vue'
import App from './App.vue'
import { createAppRouter } from './router'
import { PRELOAD_KEY, type Preload } from './ssr/preload'

/** Shared by the browser entry (main.ts) and the prerender entry (entry-server.ts). A fresh app/router per call. */
export function createApplication(o: { server: boolean; hydrate?: boolean; head: Plugin; preload: Preload }) {
  const app = o.server || o.hydrate ? createSSRApp(App) : createApp(App)
  const router = createAppRouter(o.server)
  app.provide(PRELOAD_KEY, o.preload)
  app.use(router)
  app.use(o.head)
  return { app, router }
}
