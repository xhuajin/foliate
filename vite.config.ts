import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// 强制生产版 React 等依赖（dev 只是 watch 模式，产物与 build 保持一致）
process.env.NODE_ENV = 'production';

/** 每次构建完成后把 dist/main.js、dist/styles.css 拷贝到项目根目录（Obsidian 实际加载的位置） */
function copyDistToRoot(): void {
    for (const file of ['main.js', 'styles.css']) {
        copyFileSync(resolve(__dirname, 'dist', file), resolve(__dirname, file));
    }
}

export default defineConfig(({ mode }) => {
    // dev 脚本使用 `vite build --mode development` 进入监听模式（不用 CLI 的 --watch，
    // 因为 --watch 会把 build.watch 覆盖成 true，导致下面的 exclude 失效）
    const isWatch = mode === 'development';

    return {
        plugins: [
            react(),
            tailwindcss(),
            {
                name: 'copy-dist-to-root',
                writeBundle() {
                    copyDistToRoot();
                },
            },
        ],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        build: {
            watch: isWatch
                ? {
                      // 排除构建产物，避免 @tailwindcss/vite 扫描器把根目录 main.js/styles.css
                      // 加入 watch 导致重建死循环（rollup 的 createFilter 匹配绝对路径，必须用绝对路径模式）
                      exclude: [resolve(__dirname, 'main.js'), resolve(__dirname, 'styles.css'), resolve(__dirname, 'dist') + '/**'],
                  }
                : null,
            // watch 模式下每次重建都会清空 outDir，进程被中断会留下空 dist；固定文件名输出无残留风险，故仅正式构建时清空
            emptyOutDir: !isWatch,
            lib: {
                entry: resolve(__dirname, 'src/main.ts'),
                name: 'FoliatePlugin',
                fileName: () => 'main.js',
                formats: ['cjs'],
            },
            rollupOptions: {
                external: ['obsidian'],
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
            sourcemap: false,
        },
        define: {
            global: 'globalThis',
        },
    };
});
