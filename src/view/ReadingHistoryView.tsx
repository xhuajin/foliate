import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import type ReadItPlugin from '../main';
import { BentoGrid, ReadingBentoCard } from '../components/ui/bento-grid';

export const READING_HISTORY_VIEW_TYPE = 'reading-history-view';

interface ReadingHistoryProps {
    plugin: ReadItPlugin;
    onOpenBook: (filePath: string) => void;
}

const ReadingHistory: React.FC<ReadingHistoryProps> = ({
    plugin,
    onOpenBook,
}) => {
    const recentBooks = plugin.getRecentBooks();

    const formatLastRead = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    };

    const getProgressPercentage = (book: any) => {
        if (!book.totalSections || book.totalSections === 0) return 0;
        return Math.round(((book.sectionIndex + 1) / book.totalSections) * 100);
    };

    const getBookStatus = (
        book: any
    ): 'reading' | 'completed' | 'not-started' => {
        const progress = getProgressPercentage(book);
        if (progress === 100) return 'completed';
        if (progress > 0) return 'reading';
        return 'not-started';
    };

    if (recentBooks.length === 0) {
        return (
            <div className="reading-history-container">
                <div className="reading-history-header">
                    <h1>我的阅读历史</h1>
                    <p>还没有阅读记录</p>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h2>开始你的阅读之旅</h2>
                    <p>在Obsidian中打开任意EPUB文件开始阅读</p>
                </div>
            </div>
        );
    }

    // 计算统计数据
    // const totalBooks = recentBooks.length;
    // const completedBooks = recentBooks.filter(
    //     (book) => getProgressPercentage(book) === 100
    // ).length;
    // const readingBooks = recentBooks.filter((book) => {
    //     const progress = getProgressPercentage(book);
    //     return progress > 0 && progress < 100;
    // }).length;

    return (
        <div className="reading-history-container p-6">
            <div className="reading-history-header mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    我的阅读历史
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    共 {recentBooks.length} 本书籍
                </p>
            </div>

            {/* 统计卡片 */}
            {/* <div className="mb-8">
                <BentoGrid className="grid-cols-3 auto-rows-[120px]">
                    <StatsBentoCard
                        title="总书籍数"
                        value={totalBooks}
                        description="我的图书馆"
                        icon="📚"
                        className="col-span-1"
                    />
                    <StatsBentoCard
                        title="已完成"
                        value={completedBooks}
                        description="读完的书籍"
                        icon="✅"
                        className="col-span-1"
                        {...(completedBooks > 0 && {
                            trend: {
                                value: Math.round((completedBooks / totalBooks) * 100),
                                isPositive: true
                            }
                        })}
                    />
                    <StatsBentoCard
                        title="阅读中"
                        value={readingBooks}
                        description="正在阅读"
                        icon="📖"
                        className="col-span-1"
                    />
                </BentoGrid>
            </div> */}

            {/* 书籍网格 */}
            <BentoGrid className="grid-cols-4 auto-rows-[280px]">
                {recentBooks.map((book, index) => (
                    <ReadingBentoCard
                        key={book.filePath}
                        title={
                            book.metadata?.title ||
                            book.fileName.replace('.epub', '')
                        }
                        author={
                            book.metadata?.author
                                ? typeof book.metadata.author === 'string'
                                    ? book.metadata.author
                                    : book.metadata.author.name || ''
                                : ''
                        }
                        progress={getProgressPercentage(book)}
                        lastRead={formatLastRead(book.lastRead)}
                        status={getBookStatus(book)}
                        onClick={() => onOpenBook(book.filePath)}
                        className={
                            index === 0 ? 'col-span-2 row-span-1' : 'col-span-1'
                        }
                        metadata={book.metadata}
                        // {...(book.metadata && {
                        //     metadata: {
                        //         ...(book.metadata.description && {
                        //             description: book.metadata.description,
                        //         }),
                        //         ...(book.metadata.language && {
                        //             language: book.metadata.language,
                        //         }),
                        //         ...(book.metadata.published && {
                        //             publisher: book.metadata.published,
                        //         }),
                        //         ...(book.metadata.subject && {
                        //             subject: book.metadata.subject,
                        //         }),
                        //         ...(book.metadata.coverUrl && {
                        //             subject: book.metadata.subject,
                        //         }),
                        //     },
                        // })}
                    />
                ))}
            </BentoGrid>
        </div>
    );
};

export class ReadingHistoryView extends ItemView {
    private root: Root | null = null;
    private plugin: ReadItPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: ReadItPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return READING_HISTORY_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '阅读历史';
    }

    override getIcon(): string {
        return 'library';
    }

    override async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        if (!container) return;

        container.empty();

        this.root = createRoot(container as HTMLElement);
        this.renderComponent();
    }

    private renderComponent(): void {
        if (!this.root) return;

        this.root.render(
            React.createElement(ReadingHistory, {
                plugin: this.plugin,
                onOpenBook: this.handleOpenBook.bind(this),
            })
        );
    }

    private async handleOpenBook(filePath: string): Promise<void> {
        // 查找对应的TFile
        const file = this.app.vault.getFiles().find((f) => f.path === filePath);
        if (file && file instanceof TFile) {
            await this.plugin.openEpubFile(file);
        } else {
            // 文件可能已被删除或移动
            new Notice('文件未找到: ' + filePath);
        }
    }

    override async onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}
