import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import type FoliatePlugin from '../main';
import { BentoGrid, ReadingBentoCard } from '../components/ui/bento-grid';
import { CoverFlow, type CoverFlowItem } from '../components/ui/coverflow';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { BringToFront, LayoutPanelLeft } from 'lucide-react';
import { t } from '@/lang/helpers';
import { EpubReadingProgress } from '@/types';

export const READING_HISTORY_VIEW_TYPE = 'reading-history-view';

interface ReadingHistoryProps {
    plugin: FoliatePlugin;
    onOpenBook: (filePath: string) => void;
}

const ReadingHistory: React.FC<ReadingHistoryProps> = ({
    plugin,
    onOpenBook,
}) => {
    const recentBooks = plugin.getRecentBooks();
    const [activeTab, setActiveTab] = React.useState('coverflow');

    const formatLastRead = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return t('today');
        } else if (diffDays === 1) {
            return t('yesterday');
        } else if (diffDays < 7) {
            return `${diffDays}${t('daysAgo_suffix')}`;
        } else {
            const lang = (
                localStorage.getItem('language') || 'en'
            ).toLowerCase();
            const localeStr =
                lang === 'zh' || lang === 'zh-cn' ? 'zh-CN' : 'en-US';
            return date.toLocaleDateString(localeStr);
        }
    };

    const getProgressPercentage = (book: EpubReadingProgress) => {
        if (!book.totalSections || book.totalSections === 0) return 0;
        return Math.round(((book.sectionIndex + 1) / book.totalSections) * 100);
    };

    const getBookStatus = (
        book: EpubReadingProgress
    ): 'reading' | 'completed' | 'not-started' => {
        const progress = getProgressPercentage(book);
        if (progress === 100) return 'completed';
        if (progress > 0) return 'reading';
        return 'not-started';
    };

    // 转换数据为 CoverFlow 格式
    const coverflowItems: CoverFlowItem[] = recentBooks.map((book) => ({
        id: book.filePath,
        title: book.metadata?.title || book.fileName.replace('.epub', ''),
        author: book.metadata?.author
            ? typeof book.metadata.author === 'string'
                ? book.metadata.author
                : book.metadata.author.name || ''
            : '',
        progress: getProgressPercentage(book),
        lastRead: formatLastRead(book.lastRead),
        status: getBookStatus(book),
        metadata: book.metadata
            ? {
                  ...(book.metadata.description && {
                      description: book.metadata.description,
                  }),
                  ...(book.metadata.language && {
                      language: book.metadata.language,
                  }),
                  // 统一 publisher 优先级：publisher > published
                  ...((book.metadata.publisher || book.metadata.published) && {
                      publisher:
                          book.metadata.publisher || book.metadata.published,
                  }),
                  ...(book.metadata.subject && {
                      subject: book.metadata.subject,
                  }),
                  ...(book.metadata.coverUrl && {
                      coverUrl: book.metadata.coverUrl,
                  }),
              }
            : undefined,
        onClick: () => onOpenBook(book.filePath),
    }));

    if (recentBooks.length === 0) {
        return (
            <div className="reading-history-container">
                <div className="reading-history-header">
                    <h1>{t('myReadingHistory')}</h1>
                    <p>{t('noReadingRecord')}</p>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📚</div>
                    <h2>{t('startYourJourney')}</h2>
                    <p>{t('openAnyEpub')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reading-history-container">
            {/* Tab 切换 */}
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full h-full"
            >
                <ScrollArea>
                    <TabsList className="mb-3 gap-1 bg-transparent">
                        <TabsTrigger
                            value="coverflow"
                            className="data-[state=active]:bg-primary! hover:data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! text-muted-foreground/70 hover:text-muted-foreground rounded-full shadow-none!"
                        >
                            <BringToFront
                                className="-ms-0.5 me-1.5 opacity-60 -rotate-45"
                                size={16}
                                aria-hidden="true"
                            />
                            CoverFlow
                        </TabsTrigger>
                        <TabsTrigger
                            value="grid"
                            className="data-[state=active]:bg-primary! hover:data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! text-muted-foreground/70 hover:text-muted-foreground rounded-full shadow-none!"
                        >
                            <LayoutPanelLeft
                                className="-ms-0.5 me-1.5 opacity-60"
                                size={16}
                                aria-hidden="true"
                            />
                            Bento
                        </TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* CoverFlow 视图 */}
                <TabsContent value="coverflow" className="space-y-4">
                    <CoverFlow items={coverflowItems} />
                </TabsContent>

                {/* 网格视图 */}
                <TabsContent value="grid" className="space-y-4">
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
                                        ? typeof book.metadata.author ===
                                          'string'
                                            ? book.metadata.author
                                            : book.metadata.author.name || ''
                                        : ''
                                }
                                progress={getProgressPercentage(book)}
                                lastRead={formatLastRead(book.lastRead)}
                                status={getBookStatus(book)}
                                onClick={() => onOpenBook(book.filePath)}
                                className={
                                    index === 0
                                        ? 'col-span-2 row-span-1'
                                        : 'col-span-1'
                                }
                                metadata={book.metadata}
                            />
                        ))}
                    </BentoGrid>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export class ReadingHistoryView extends ItemView {
    private root: Root | null = null;
    private plugin: FoliatePlugin;

    constructor(leaf: WorkspaceLeaf, plugin: FoliatePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return READING_HISTORY_VIEW_TYPE;
    }

    getDisplayText(): string {
        return t('readingHistory');
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
        const file = this.app.vault.getFileByPath(filePath);
        if (file && file instanceof TFile) {
            await this.plugin.openEpubFile(file);
        } else {
            // 文件可能已被删除或移动
            new Notice(`${t('file')} ${t('notFound')}: ${filePath}`);
        }
    }

    override async onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}
