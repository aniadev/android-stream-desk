import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';

// Styles loading
import './assets/tailwind.css';

// Components & Views imports
import App from './App.vue';
import ClientView from './views/ClientView.vue';
import DashboardView from './views/DashboardView.vue';

// Setup Routing
const routes = [
  { path: '/', component: ClientView, name: 'client' },
  { path: '/dashboard', component: DashboardView, name: 'dashboard' }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// Tự động điều hướng Dashboard trên Desktop Companion, Pad trên di động
router.beforeEach((to, _from, next) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (to.path === '/' && !isMobile) {
    next('/dashboard');
  } else {
    next();
  }
});

// App Initiation
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
