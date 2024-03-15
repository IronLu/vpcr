import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  if (mode == 'development') {
    return {
      plugins: [],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/lib/index.ts'),
          name: 'vpcr',
          fileName: 'vpcr',
        },
        minify: false,
        sourcemap: true,
      },
      server: {
        watch: {
          ignored: [],
        },
      },
      optimizeDeps: {
        exclude: [],
      },
    }
  }
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/lib/index.ts'),
        name: 'vpcr',
        fileName: 'vpcr',
      },
    },
  }
})
