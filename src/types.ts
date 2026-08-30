// EPUB 解析模型（元数据/目录/章节/资源）由自研的 src/epub-parser 提供
// 结构与旧 foliate-js 时代保持一致，确保插件引用无缝
import type {
    EpubMetadata,
    EpubSection,
    EpubResource,
    EpubTocItem,
    EpubType,
} from '@/epub-parser';
export type {
    EpubMetadata,
    EpubSection,
    EpubResource,
    EpubTocItem,
    EpubType,
};


export interface EpubReadingProgress {
    filePath: string;
    fileName: string;
    sectionIndex: number;
    scrollPosition: number;
    lastRead: number; // timestamp
    totalSections: number;
    metadata?: EpubMetadata; // 新增元数据字段
}

export type ExportStorageMode = 'daily-note' | 'per-note' | 'per-book' | 'single-note';

export interface FoliateSettings {
    // 通用设置
    fontSize: number;
    lineHeight: number;
    pageWidth: number;
    theme: 'light' | 'dark' | 'auto';

    // 字体偏好：是否优先使用书籍自带字体
    preferBookFont: boolean;

    // 阅读设置
    enableKeyboardNavigation: boolean;
    enableMouseSideButtonNavigation: boolean;
    recentBooks: EpubReadingProgress[];
    maxRecentBooks: number;

    // 摘录
    excerptSuccessNotification: boolean;
    // daily-note: 摘录存储在日记中
    // per-note: 每个摘录一个摘录文件
    // per-book: 每本书一个摘录文件
    // single-note: 所有摘录存储在一个文件中
    excerptStorageMode: ExportStorageMode;
    // per-book: 每本书的摘录文件路径映射（key 可用书的标识符或文件路径）
    perBookExcerptMap?: Record<string, string>;
    // single-note: 全部摘录存储的单一文件路径
    singleExcerptPath?: string;

    // 书架设置
    bookshelfType: 'grid' | 'cover';

    // 其他设置
    autoSaveProgress: boolean;
    showReadingProgress: boolean;
}
