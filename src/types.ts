export interface EpubMetadata {
    author?:
        | string
        | {
              name: string;
              role: string;
          };
    identifier?: string;
    language?: string;
    modified?: string;
    published?: string;
    rights?: string;
    title?: string;
    description?: string;
    creator?: string;
    subject?: string[];
    date?: string;
    coverUrl?: string; // 新增封面 URL 字段
}

export interface EpubReadingProgress {
    filePath: string;
    fileName: string;
    sectionIndex: number;
    scrollPosition: number;
    lastRead: number; // timestamp
    totalSections: number;
    metadata?: EpubMetadata; // 新增元数据字段
}

export type ExportStorageMode =
    | 'daily-note'
    | 'per-note'
    | 'per-book'
    | 'single-note';

export interface ReadItSettings {
    // 通用设置
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    pageWidth: number;
    theme: 'light' | 'dark' | 'auto';

    // 阅读进度
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

    // 其他设置
    autoSaveProgress: boolean;
    showReadingProgress: boolean;
}
