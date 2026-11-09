import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/country/:countryId(\\d+)', name: 'country', component: () => import('@/views/CountryView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
