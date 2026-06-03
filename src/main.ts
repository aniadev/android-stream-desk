import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { initOfflineIcons } from './icons-bundle';

// Initialize pre-bundled offline icons
initOfflineIcons();

// Styles loading
import './assets/tailwind.css';
import { isValidTheme } from './lib/themes';

// Apply saved theme synchronously before first render to avoid flash-of-cyber
try {
  const saved = localStorage.getItem('theme');
  if (saved && isValidTheme(saved)) {
    document.documentElement.setAttribute('data-theme', saved);
  }
} catch (_) {}

// Components & Views imports
import App from './App.vue';
import ClientView from './views/ClientView.vue';

// Setup Routing
const isClientOnlyBuild = import.meta.env.MODE === 'client';
const routes: RouteRecordRaw[] = [
  { path: '/', component: ClientView, name: 'client' },
];

if (!isClientOnlyBuild) {
  routes.push({
    path: '/dashboard',
    component: () => import('./views/DashboardView.vue'),
    name: 'dashboard',
  });
}

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// Tự động điều hướng Dashboard trên Desktop Companion, Pad trên di động
if (!isClientOnlyBuild) {
  router.beforeEach((to, _from, next) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (to.path === '/' && !isMobile) {
      next('/dashboard');
    } else {
      next();
    }
  });
}

// App Initiation
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
