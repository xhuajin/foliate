/**
 * epub-parser 的数据模型。
 * 字段与原项目（foliate-js 时代）的 src/types.ts 保持一致，确保无缝替换。
 */

export interface EpubMetadata {
    author?: string | { name: string; role: string };
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
    coverUrl?: string; // 封面 URL（由插件层生成，解析器不产生）
}

export interface EpubTocItem {
    href: string | undefined;
    label: string | undefined;
    subitems: EpubTocItem[] | undefined;
}

export type EpubSection = {
    cfi: string;
    createDocument: () => Promise<Document | null>;
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
    loadBlob: (path?: string, type?: string) => Promise<Blob | null>;
    loadText: () => Promise<Blob>;
    media: {};
    metadata: EpubMetadata;
    pageList: Array<{ href: string; type: string[]; title: string }> | null;
    parser: DOMParser | {};
    rendition: {};
    resources: EpubResource;
    sections: EpubSection[];
    toc: EpubTocItem[];
    getCover: () => Promise<Blob | undefined>;
    /** 列出归档内的全部文件路径（用于字体/资源扫描） */
    listFiles: () => string[];
}