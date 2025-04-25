import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'SchemaNodeVueView',
      fileName: (format) => `schema-node-vue-view.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', 'element-plus', 'schema-node'],
      output: {
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus',
          'schema-node': 'SchemaNode'
        }
      }
    }
  }
})
