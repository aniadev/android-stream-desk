import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import './assets/tailwind.css'

export const createApp = ViteSSG(
  App,
  { routes: [] }
)

