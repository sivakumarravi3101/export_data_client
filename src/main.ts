import './assets/main.css'

import Toast from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import { createHead } from '@unhead/vue/client'
import { createApplication } from './app'
import { applyPreloadCaches } from './ssr/preload'

// Prerendered pages ship their data in window.__PRELOAD__ and are hydrated; in `npm run dev` there is none and the app mounts normally.
const preload = window.__PRELOAD__ ?? {}
applyPreloadCaches(preload)

const { app, router } = createApplication({ server: false, hydrate: window.__PRELOAD__ !== undefined, head: createHead(), preload })
app.use(Toast)

router.isReady().then(() => {
    app.mount('#app')
    // Seeds are consumed while the first view sets up; drop them so later navigations always fetch fresh data.
    for (const k of Object.keys(preload)) delete (preload as Record<string, unknown>)[k]
    delete window.__PRELOAD__
})
