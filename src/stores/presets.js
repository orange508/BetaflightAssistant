// Presets store - temporarily disabled for build
import { defineStore } from 'pinia'

export const usePresetsStore = defineStore('presets', {
  state: () => ({
    presets: [],
    loading: false
  }),
  actions: {
    async loadPresets() {
      console.warn('Presets feature temporarily disabled')
      return []
    }
  }
})
