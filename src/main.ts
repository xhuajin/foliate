import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { EpubView, EPUB_VIEW_TYPE } from './view/EpubView.tsx';
import {
    ReadingHistoryView,
    READING_HISTORY_VIEW_TYPE,
} from './view/ReadingHistoryView.tsx';
import { EpubTocView, EPUB_TOC_VIEW_TYPE } from './view/EpubTocView.tsx';
import './styles.css';
import FoliateSettingTab, { DEFAULT_SETTINGS } from './settings.ts';
import { EpubReadingProgress, EpubType, FoliateSettings } from './types.ts';
import { mergeMetadata } from '@/lib/metadata';
import { t } from '@/lang/helpers';

export default class FoliatePlugin extends Plugin {
    settings!: FoliateSettings;

    override async onload(): Promise<void> {
        await this.loadSettings();

        // 注册 EPUB 阅读器视图
        this.registerView(
            EPUB_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new EpubView(leaf, this)
        );

        // 注册 EPUB 目录视图
        this.registerView(EPUB_TOC_VIEW_TYPE, (leaf) => {
            return new EpubTocView(leaf, this);
        });

        // 注册阅读历史视图
        this.registerView(READING_HISTORY_VIEW_TYPE, (leaf) => {
            return new ReadingHistoryView(leaf, this);
        });

        // 注册 EPUB 文件扩展名处理器 - 左键点击时直接打开
        this.registerExtensions(['epub'], EPUB_VIEW_TYPE);

        // 注册文件菜单处理程序 - 右键点击 .epub 文件时显示选项（保留作为备用）
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && file.extension === 'epub') {
                    menu.addItem((item) => {
                        item.setTitle(t('openWithFoliate'))
                            .setIcon('book-open')
                            .onClick(async () => {
                                await this.openEpubFile(file);
                            });
                    });
                }
            })
        );

        // 添加一个功能区图标
        this.addRibbonIcon('library', 'Foliate', (_evt: MouseEvent) => {
            // 当点击功能区图标时打开阅读历史页面
            this.openReadingHistory();
        });

        // 这将在状态栏中添加一个状态栏项目，在桌面上不起作用
        // const statusBarItemEl = this.addStatusBarItem();
        // statusBarItemEl.setText('Foliate Plugin Ready');

        // 设置面板
        this.addSettingTab(new FoliateSettingTab(this.app, this));

        // 添加打开阅读历史的命令
        this.addCommand({
            id: 'open-reading-history',
            name: t('openReadingHistory'),
            callback: () => {
                this.openReadingHistory();
            },
        });

        // 注意：不在布局就绪时自动切换左侧 tab，仅在阅读器加载时（FoliateView）检测并更新已存在的 TOC 视图。

        // epub 文件被重命名/移动时，更新在 data.json 的记录
        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                if (!(file instanceof TFile) || file.extension !== 'epub')
                    return;

                const newPath = file.path;
                const newName = file.name;

                let changed = false;
                // recentBooks 中的路径更新
                this.settings.recentBooks = this.settings.recentBooks.map(
                    (b) => {
                        if (b.filePath === oldPath) {
                            changed = true;
                            return {
                                ...b,
                                filePath: newPath,
                                fileName: newName,
                            };
                        }
                        return b;
                    }
                );

                // perBookExcerptMap 中可能以 filePath 作为 key
                if (this.settings.perBookExcerptMap) {
                    if (this.settings.perBookExcerptMap[oldPath]) {
                        const mdPath = this.settings.perBookExcerptMap[oldPath];
                        delete this.settings.perBookExcerptMap[oldPath];
                        this.settings.perBookExcerptMap[newPath] = mdPath;
                        changed = true;
                    }
                }

                if (changed) {
                    await this.saveSettings();
                }
            })
        );
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    // 保存阅读进度
    async saveReadingProgress(progress: EpubReadingProgress): Promise<void> {
        // 查找是否已存在该文件的进度
        const existingIndex = this.settings.recentBooks.findIndex(
            (readingProgress) => readingProgress.filePath === progress.filePath
        );

        if (existingIndex >= 0) {
            // 合并元数据，避免覆盖用户在 data.json 中的手动修改
            const existing = this.settings.recentBooks[existingIndex]!;
            const mergedMeta = mergeMetadata(
                existing.metadata,
                progress.metadata
            );
            // 更新现有进度（保持其它字段以传入 progress 为准）
            this.settings.recentBooks[existingIndex] = {
                ...existing,
                ...progress,
                ...(mergedMeta ? { metadata: mergedMeta } : {}),
            };
        } else {
            // 添加新进度
            const mergedMeta = mergeMetadata(undefined, progress.metadata);
            this.settings.recentBooks.unshift(
                mergedMeta ? { ...progress, metadata: mergedMeta } : progress
            );
            // 限制最近书籍数量
            if (
                this.settings.recentBooks.length > this.settings.maxRecentBooks
            ) {
                this.settings.recentBooks = this.settings.recentBooks.slice(
                    0,
                    this.settings.maxRecentBooks
                );
            }
        }

        await this.saveSettings();
    }

    // 获取阅读进度
    getReadingProgress(filePath: string): EpubReadingProgress | null {
        return (
            this.settings.recentBooks.find(
                (readingProgress) => readingProgress.filePath === filePath
            ) || null
        );
    }

    // 获取最近阅读的书籍列表
    getRecentBooks(): EpubReadingProgress[] {
        return this.settings.recentBooks.sort(
            (a, b) => b.lastRead - a.lastRead
        );
    }

    // 清理过期的阅读记录
    async cleanupOldProgress(): Promise<void> {
        const now = Date.now();
        const monthInMs = 30 * 24 * 60 * 60 * 1000; // 30天

        this.settings.recentBooks = this.settings.recentBooks.filter(
            (readingProgress) => now - readingProgress.lastRead < monthInMs
        );

        await this.saveSettings();
    }

    // 清空所有阅读记录（不可恢复）
    async clearAllReadingProgress(): Promise<void> {
        this.settings.recentBooks = [];
        await this.saveSettings();
    }

    // 清除指定书籍的阅读记录
    async clearBookProgress(filePath: string): Promise<void> {
        this.settings.recentBooks = this.settings.recentBooks.filter(
            (book) => book.filePath !== filePath
        );
        await this.saveSettings();
    }

    async openEpubFile(file: TFile): Promise<void> {
        // 检查是否已经有这个特定文件的视图打开
        const existingLeaf = this.app.workspace
            .getLeavesOfType(EPUB_VIEW_TYPE)
            .find((leaf) => {
                const view = leaf.view as EpubView;
                return view && view.file?.path === file.path;
            });

        if (existingLeaf) {
            // 如果已经打开了相同文件，就激活这个标签页
            this.app.workspace.setActiveLeaf(existingLeaf);
            return;
        }

        // 创建新的叶子节点并打开视图
        this.app.workspace.getLeaf('tab').openFile(file);
    }

    // 打开阅读历史页面
    async openReadingHistory(): Promise<void> {
        // 检查是否已经有阅读历史视图打开
        const existingLeaf = this.app.workspace.getLeavesOfType(
            READING_HISTORY_VIEW_TYPE
        )[0];

        if (existingLeaf) {
            // 如果已经打开，就激活这个标签页
            this.app.workspace.setActiveLeaf(existingLeaf);
            return;
        }

        // 创建新的叶子节点并打开视图
        const leaf = this.app.workspace.getLeaf('tab');

        // 设置叶子节点的视图类型
        await leaf.setViewState({
            type: READING_HISTORY_VIEW_TYPE,
            active: true,
        });
    }

    // 打开 EPUB 目录视图
    async openEpubTocView(
        book: EpubType,
        currentSectionIndex: number,
        onSectionSelect: (sectionIndex: number) => void
    ): Promise<void> {
        // 检查是否已经有目录视图打开
        let existingLeaf =
            this.app.workspace.getLeavesOfType(EPUB_TOC_VIEW_TYPE)[0];

        if (!existingLeaf) {
            // 在左侧边栏创建新的叶子节点
            const leftLeaf = this.app.workspace.getLeftLeaf(false);
            if (!leftLeaf) {
                console.error(t('cannotCreateSidebarLeaf'));
                return;
            }
            existingLeaf = leftLeaf;

            // 设置视图类型
            await existingLeaf.setViewState({
                type: EPUB_TOC_VIEW_TYPE,
                active: true,
            });
        } else {
            // 激活现有的目录视图
            this.app.workspace.setActiveLeaf(existingLeaf);
        }

        // 设置书籍数据
        const tocView = existingLeaf.view as EpubTocView;
        if (tocView && tocView.setBookData) {
            tocView.setBookData(book, currentSectionIndex, onSectionSelect);
        }
    }
}
