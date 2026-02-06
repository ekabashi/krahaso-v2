import type { Pinia } from 'pinia'
import { defineNuxtPlugin } from 'nuxt/app'
import { useCarStore } from '../app/stores/carStore'

/**
 * Set car list/grid view from viewport as soon as the app runs on client,
 * so desktop shows list (and list button selected) from first paint.
 */
export default defineNuxtPlugin({
  name: 'car-viewmode',
  enforce: 'post',
  setup(nuxtApp) {
    const carStore = useCarStore(nuxtApp.$pinia as Pinia)
    const setFromViewport = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 0
      carStore.setViewMode(w >= 1024 ? 'list' : 'grid')
    }
    setFromViewport()
    nuxtApp.hook('app:created', () => setFromViewport())
  },
})
