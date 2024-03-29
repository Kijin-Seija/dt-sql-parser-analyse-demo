// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DtSqlParserAnalyseEnhancedPlugin',
      fileName: 'dt-sql-parser-analysis-enhanced-plugin',
    },
  },
  plugins: [
    nodePolyfills({
      include: ['util'],
    }),
  ]
})