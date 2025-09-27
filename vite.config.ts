import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            'foliate-js': resolve(__dirname, 'packages/foliate-js'),
            '@': resolve(__dirname, 'src'),
        },
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            name: 'ReadItPlugin',
            fileName: () => 'main.js',
            formats: ['cjs'],
        },
        rollupOptions: {
            external: ['obsidian', 'construct-style-sheets-polyfill'],
            output: {
                globals: {
                    obsidian: 'obsidian',
                },
                entryFileNames: 'main.js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                        return 'styles.css';
                    }
                    return '[name][extname]';
                },
                format: 'cjs',
                // 强制将所有依赖打包到main.js中，不拆分chunk
                manualChunks: undefined,
                inlineDynamicImports: true,
            },
        },
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
    },
    define: {
        global: 'globalThis',
    },
});
