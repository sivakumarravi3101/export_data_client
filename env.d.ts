/// <reference types="vite/client" />

import 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        /** Routes with the same `page` share one component instance (country <-> product keeps the page mounted). */
        page?: string
    }
}
