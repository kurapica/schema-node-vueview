import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      outDir: 'dist',         // emit index.d.ts to dist/
      insertTypesEntry: true     // adds `export * from './index'` to index.d.ts
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'SchemaView',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'cjs' ? `index.js` : `index.${format}.js`,
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
