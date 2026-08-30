# AGENTS.md

本文件为 AI 编码助手（pi / Copilot / Cursor 等）提供本项目的开发指引，请先通读再动手改代码。

## 项目简介

**Foliate** —— Obsidian 桌面端插件（`isDesktopOnly: true`），用于在 Obsidian 中直接阅读 EPUB 电子书。

- 技术栈：TypeScript + React 18 + Vite 5 + Tailwind CSS 4
- EPUB 解析：自研 `src/epub-parser`（TypeScript 模块，仅 EPUB 2/3 解析，不含渲染），通过 `@/epub-parser` 引用；ZIP 层自实现，仅依赖 `fflate` 解压
- UI 组件：shadcn 风格（radix-ui + tailwind-merge + cva，`components.json`），另有 framer-motion、tanstack virtual、headless-tree
- 仓库：`https://github.com/xhuajin/readIt`
- 功能：阅读视图、书架视图（网格/封面流）、摘录（per-note 模式）、选中内容生成分享卡片、左侧栏目录、阅读进度持久化

## 常用命令（包管理器为 pnpm）

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | `vite build --mode development` 监听构建，改动自动重建并拷贝到根目录 |
| `pnpm build` | 构建并把 `dist/main.js`、`dist/styles.css` 拷贝到根目录 |
| `pnpm typecheck` | `tsc --noEmit` 类型检查 |
| `pnpm test:epub` | 运行 epub-parser 冒烟测试（tsx 直接执行，用 fflate 现场构造 EPUB 样本） |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm format` | Prettier 格式化 `src/` |

Obsidian 实际加载的是仓库根目录的 `main.js` 与 `styles.css`。修改 `src/` 后必须运行 `pnpm build`（或 `pnpm dev` 的 watch 模式）重新生成这两个文件，插件才会生效。**`dist/`、根目录 `main.js` 均为构建产物，不要手改。**

## 目录结构

```
src/
├── main.ts                # 插件入口 FoliatePlugin：注册视图/扩展名/事件/功能区图标/命令/设置页
├── settings.ts            # 设置面板 FoliateSettingTab + DEFAULT_SETTINGS
├── types.ts               # 核心类型：EpubType、EpubReadingProgress、FoliateSettings、EpubMetadata 等
├── styles.css             # Tailwind 入口（@import tailwindcss）+ 全局样式
├── styles/                # 分模块样式（封面流/分享卡片/目录）
├── lang/                  # 国际化：helpers.ts（t()）+ locale/en.ts、locale/zh-cn.ts
├── view/
│   ├── EpubView.tsx       # FileView 宿主：双击 .epub 打开，负责挂载 React
│   ├── FoliateView.tsx    # ★ 核心阅读器（最大单文件，约 1600 行）
│   ├── BookshelfView.tsx  # 书架视图
│   └── EpubTocView.tsx    # 左侧栏目录视图
├── hooks/                 # React hooks：useRenderSection、useExcerpts、useShareSelection、
│                          #   useSectionNav、useTocSync
├── components/
│   ├── bookshelf/         # coverflow.tsx、grid.tsx
│   ├── ui/                # shadcn 风格基础组件（button、tabs、tree 等）
│   └── SharePreviewModal.ts  # 分享卡片预览弹窗（非 React 组件，用原生 modal 实现）
├── lib/                   # metadata.ts（进度元数据合并）、utils.ts（cn()）
└── types/                 # 补充类型声明（obsidian-ex.d.ts）
└── epub-parser/           # ★ 自研 EPUB 解析器（见下方注意事项）
    ├── index.ts            # 公共出口（parseEpub + 类型 re-export）
    ├── zip.ts / xml.ts / path.ts
    ├── container.ts / opf.ts / nav.ts / book.ts / types.ts
    └── test/               # epub.test.ts 冒烟测试（pnpm test:epub）
```

## 架构要点

- **视图生命周期**：`EpubView extends FileView` 负责 Obsidian 侧生命周期（`onOpen`/`onLoadFile`/`setState`/`onClose`），内部用 `createRoot` 挂载 React 组件 `FoliateView`；React 层通过 props 拿到 `app`/`plugin`/`file`。
- **阅读内核**：`FoliateView` 用自研 `parseEpub()`（`@/epub-parser`）解析 EPUB 得到 `EpubType`，走 `useRenderSection` 渲染章节，`useSectionNav` 处理翻页与键盘/侧键导航；章节文档懒加载（`createDocument()` 按需解析）。
- **状态持久化**：阅读进度存于 `data.json`（Obsidian `loadData/saveData`），`EpubReadingProgress` 以 `filePath` 为键；文件重命名/移动时在 `main.ts` 的 `rename` 事件里同步更新。
- **摘录**：`useExcerpts` + `useShareSelection`，当前仅支持 `per-note` 存储模式，摘录其他模式未完善（见 `settings.ts` 注释）。
- **国际化**：所有用户可见文案必须走 `t('key')`，key 需同时加到 `src/lang/locale/en.ts` 和 `zh-cn.ts`。

## 编码约定

- **风格**：Prettier 配置为 4 空格缩进、单引号、分号、printWidth 120、trailingComma es5。提交前建议 `pnpm format` + `pnpm lint`。
- **严格 TS**：`tsconfig.json` 开启大量严格项，特别注意：
  - `noUncheckedIndexedAccess`：数组/对象索引访问可能为 `undefined`，要判空；
  - `exactOptionalPropertyTypes`：可选字段赋值 `undefined` 会报错，用 `delete` 或条件赋值；
  - `noImplicitOverride`：覆盖 Obsidian 基类方法必须写 `override`。
- **ESLint**：未使用变量报错（`^_` 开头的参数忽略），`no-explicit-any` 仅警告。
- **导入**：源码内使用带扩展名的导入（`from './view/EpubView.tsx'`），tsconfig 已开 `allowImportingTsExtensions`。
- **路径别名**：`@/*` → `src/*`；epub-parser 已并入 src（`@/epub-parser`），不再需要单独 alias。
- **注释语言**：项目内注释为中文，新代码沿用中文注释。
- 阅读器样式、Obsidian 变量（如 `var(--font-text)`、主题色等）直接复用，不要硬编码颜色。

## 注意事项（坑）

1. **`src/epub-parser` 是本仓库自研的 EPUB 解析器**（TypeScript 源码，vite 打包时内联）。只做 EPUB 2/3 解析：ZIP 中央目录 + fflate 解压、container.xml → OPF → nav/NCX、章节懒加载。`src/types.ts` 的 EPUB 模型类型（EpubType 等）由它 re-export，改动模型时需同步两处。测试：`pnpm test:epub`（tsx 直接运行，内部用 fflate 现场构造 EPUB 样本）。
2. **`data.json`**（vault 中的插件数据，含真实阅读进度）已被 `.gitignore` 忽略，是运行时数据，**不要删除、不要提交**。根目录同名 `data.json`（约 5MB）就是这份数据。
3. **版本号不同源**：`package.json` 的 `1.0.0` 是脚手架初始值；发布版本以 `manifest.json` 和 git tag 为准。
4. **根目录 `styles.css` 已被提交到仓库**（与 `main.js` 不同，后者被忽略）。修改样式后重新构建会覆盖它，构建产物与源码（`src/styles.css`）需保持同步。
5. 全局规则：**禁止批量删除文件或目录**（不得使用 `del /s`、`rm -rf`、`Remove-Item -Recurse` 等）；删除单文件时给出明确路径，批量删除需停下征得用户同意。
6. 不修改 `dist/`、根 `main.js`、`epub-*.cjs` 等构建产物；如需调整产物需改 `vite.config.ts` 或 `src/epub-parser` 的源码。
7. **pnpm overrides**：`package.json` 中 `pnpm.overrides.obsidian = "1.8.7"`，用于统一 obsidian 类型版本（`obsidian-daily-notes-interface` 等依赖 git tarball 形式的 obsidian，会导致 TFile 等类型双副本不兼容）；改动 obsidian 版本前先确认 override 是否需要同步更新。