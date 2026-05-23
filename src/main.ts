import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

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
  history: createWebHistory(),
  routes
});

// App Initiation
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
