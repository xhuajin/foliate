declare module 'foliate-js/epub.js' {
    export interface EPUBMetadata {
        title?: string;
        creator?: string;
        description?: string;
        publisher?: string;
        date?: string;
        language?: string;
        identifier?: string;
    }

    export interface EPUBBook {
        metadata?: EPUBMetadata;
        sections?: any[];
        toc?: any[];
        landmarks?: any[];
        pageList?: any[];
        cover?: string;
    }

    export interface EPUBLoader {
        entries: any[];
        loadText: (name: string) => Promise<string | null>;
        loadBlob: (name: string, type?: string) => Promise<Blob | null>;
        getSize: (name: string) => number;
        sha1?: (data: ArrayBuffer) => Promise<string>;
    }

    export class EPUB {
        constructor(loader: EPUBLoader);
        init(): Promise<EPUBBook>;
        loadDocument(item: any): Promise<Document>;
    }
}

declare module 'foliate-js/vendor/zip.js' {
    export function configure(options: { useWebWorkers: boolean }): void;
    export class BlobReader {
        constructor(blob: Blob);
    }
    export interface ZipEntry {
        bitFlag: {
            level: number;
            dataDescriptor: boolean;
            languageEncodingFlag: boolean;
        };
        comment: string;
        commentUTF8: boolean;
        compressedSize: number;
        compressionMethod: number;
        creationDate: Date | string | undefined;
        directory: boolean;
        diskNumberStart: number;
        encrypted: boolean;
        externalFileAttribute: number;
        entraField: Map<string, string | number>;
        extraFieldAES: string | undefined;
        extraFieldExtendedTimestamp: string | undefined;
        extraFieldNTFS: string | undefined;
        extraFieldUnicodeComment: string | undefined;
        extraFieldUnicodePath: string | undefined;
        extraFieldZip64: string | undefined;
        filename: string;
        filenameUTF8: boolean;
        getData: Function;
        internalFileAttribute: number;
        lastAccessDate: Date | string | undefined;
        lastModDate: Date | string | undefined;
        msDosCompatible: boolean;
        offset: number;
        rawComment: Uint8Array;
        rawExtraField: Uint8Array;
        rawFilename: Uint8Array;
        rawLastModDate: number;
        signature: number;
        uncompressedSize: number;
        version: number;
        versionMadeBy: number;
        zip64: string | undefined;
        zipCrypto: boolean;
    }
    export class ZipReader {
        constructor(reader: BlobReader);
        getEntries(): Promise<ZipEntry[]>;
    }
    export class TextWriter {}
    export class BlobWriter {
        constructor(type?: string);
    }
}

declare module 'foliate-js/view.js' {
    // 声明 foliate-view 自定义元素
    global {
        interface HTMLElementTagNameMap {
            'foliate-view': HTMLElement & {
                open(book: any): Promise<void>;
                goTo(href: string): Promise<void>;
                prev(): void;
                next(): void;
                addEventListener(
                    type: 'relocate',
                    listener: (event: CustomEvent) => void
                ): void;
                addEventListener(
                    type: 'load',
                    listener: (event: Event) => void
                ): void;
            };
        }
    }
}

declare module 'foliate-js/reader.js' {
    export class Reader {
        constructor(element: HTMLElement, book: any, options?: any);
        open(book: any): Promise<void>;
        goTo(href: string): void;
        prev(): void;
        next(): void;
    }
}

declare module 'foliate-js/epubcfi.js' {
    export const isCFI: RegExp;
    export function joinIndir(...xs: string[]): string;
    export function parse(cfi: string): any;
    export function collapse(parts: any, toEnd?: boolean): any;
    export function fromRange(
        range: Range,
        filter?: (n: Node) => number
    ): string;
    export function toRange(
        doc: Document,
        parts: any,
        filter?: (n: Node) => number
    ): Range;
    export function toElement(doc: Document, parts: any): Element;
    export const fake: {
        fromIndex(index: number): string;
        toIndex(parts: any): number;
    };
}
