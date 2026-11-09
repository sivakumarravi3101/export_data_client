import './assets/main.css'

import { createApp } from 'vue'
import Toast from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(Toast)
app.use(router)
app.mount('#app')
