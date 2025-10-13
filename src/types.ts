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
    publisher?: string; // 出版社
    rights?: string;
    title?: string;
    description?: string;
    creator?: string;
    subject?: string[];
    date?: string;
    coverUrl?: string; // 新增封面 URL 字段
}

export interface EpubTocItem {
    href: string | undefined;
    label: string | undefined;
    subitems: EpubTocItem[] | undefined;
}

export type EpubSection = {
    cfi: string;
    createDocument: () => Document | null;
    id: string;
    linear: 'yes' | 'no' | null;
    load: () => Promise<Document | null>;
    mediaOverlay: string | null;
    pageSpread: string | undefined;
    resolveHref: (href: string) => string;
    size: number;
    unload: () => void;
};

export interface EpubResource {
    cfis: string[];
    cover: string;
    guide: Array<{ href: string; type: string[]; label: string }>;
    manifest: Array<{
        href: string;
        id: string;
        mediaOverlay: string | null;
        mediaType: string;
        properties?: string[];
    }>;
    properties: {} | undefined;
    navPath: string | undefined;
    ncxPath: string | undefined;
    opf: Document;
    pageProgressionDirection: null | 'ltr' | 'rtl' | 'auto';
    spine: Array<{
        id: string | null;
        idref: string;
        linear: string | null;
        properties: string[];
    }>;
}

export interface EpubType {
    dir: string | null;
    getSize: () => number;
    landmarks: Array<{ href: string; type: string[]; label: string }>;
    loadBlob: (path?: string) => Promise<Blob>;
    loadText: () => Promise<Blob>;
    media: {};
    metadata: EpubMetadata;
    pageList: Array<{ href: string; type: string[]; title: string }> | null;
    parser: DOMParser | {};
    rendition: {};
    resources: EpubResource[];
    sections: EpubSection[];
    toc: EpubTocItem[];
    getCover: () => Promise<Blob | undefined>;
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

    // 其他设置
    autoSaveProgress: boolean;
    showReadingProgress: boolean;
}
