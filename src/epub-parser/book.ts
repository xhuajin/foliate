import { ZipArchive } from './zip';
import { NS, parseXmlText } from './xml';
import { resolveRef, stripFragmentQuery } from './path';
import { resolveRootfile } from './container';
import { parseOpf, type OpfInfo, type OpfManifestItem, type OpfSpineRef } from './opf';
import { parseNavDocument, parseNcx } from './nav';
import type { EpubResource, EpubSection, EpubTocItem, EpubType } from './types';

/**
 * 解析 EPUB 文件。
 *
 * @param input Blob / ArrayBuffer / Uint8Array（Obsidian 中由 vault.readBinary 得到 ArrayBuffer）
 * @returns 与插件扩展点兼容的 EpubType（章节懒加载）
 */
export async function parseEpub(input: Blob | ArrayBuffer | Uint8Array): Promise<EpubType> {
    let u8: Uint8Array;
    if (input instanceof Uint8Array) {
        u8 = input;
    } else if (input instanceof ArrayBuffer) {
        u8 = new Uint8Array(input);
    } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
        u8 = new Uint8Array(await input.arrayBuffer());
    } else {
        // 不可达：类型已穷尽（无 Blob 环境也不可能传入 Blob 实例）
        throw new Error('不支持的输入类型');
    }
    const zip = new ZipArchive(u8);
    const opfPath = resolveRootfile(zip);
    const info = parseOpf(zip, opfPath);
    return buildEpubBook(zip, opfPath, info);
}

function buildEpubBook(zip: ZipArchive, opfPath: string, info: OpfInfo): EpubType {
    // ---- 目录 / 地标 / 页列表 ----
    const navInfo = info.navPath ? parseNavDocument(zip, info.navPath) : null;
    const ncxInfo = !navInfo && info.ncxPath ? parseNcx(zip, info.ncxPath) : null;

    const toPageList = (items: EpubTocItem[]): EpubType['pageList'] =>
        items.length
            ? items.map((item) => ({ href: item.href ?? '', type: [] as string[], title: item.label ?? '' }))
            : null;

    let tocItems: EpubType['toc'] = [];
    let landmarks: EpubType['landmarks'] = [];
    let pageList: EpubType['pageList'] = null;
    if (navInfo) {
        tocItems = navInfo.toc;
        landmarks = navInfo.landmarks.map((item) => ({
            href: item.href ?? '',
            type: [] as string[],
            label: item.label ?? '',
        }));
        pageList = toPageList(navInfo.pageList);
    } else if (ncxInfo) {
        tocItems = ncxInfo.toc;
        pageList = toPageList(ncxInfo.pageList);
    }

    // ---- 章节（按 spine 顺序）----
    const sections = buildSections(zip, info);

    // ---- resources（兼容原 foliate-js 结构）----
    const resources: EpubResource = {
        cfis: [],
        cover: info.coverPath ?? '',
        guide: info.guide,
        manifest: Array.from(info.manifest.values()).map((m) => {
            const entry: EpubResource['manifest'][number] = {
                href: m.resolved,
                id: m.id,
                mediaOverlay: m.mediaOverlay,
                mediaType: m.mediaType,
            };
            if (m.properties.length > 0) entry.properties = m.properties;
            return entry;
        }),
        properties: undefined,
        navPath: info.navPath ?? undefined,
        ncxPath: info.ncxPath ?? undefined,
        opf: parseOrEmpty(zip.readText(opfPath) ?? ''),
        pageProgressionDirection: info.pageProgressionDirection,
        spine: info.spine.map((s) => ({
            id: s.id,
            idref: s.idref,
            linear: s.linear,
            properties: s.properties,
        })),
    };

    const dirValue: EpubType['dir'] =
        info.pageProgressionDirection === 'rtl' ? 'rtl' : info.pageProgressionDirection === 'ltr' ? 'ltr' : null;

    return {
        metadata: info.metadata,
        sections,
        toc: tocItems,
        landmarks,
        pageList,
        resources,
        dir: dirValue,
        media: {},
        parser: typeof DOMParser !== 'undefined' ? new DOMParser() : {},
        rendition: {},
        getSize: () => {
            const sizeSum = Array.from(info.manifest.values()).reduce(
                (sum, m) => sum + (zip.size(m.resolved) ?? 0),
                0
            );
            return sizeSum || zip.totalSize();
        },
        loadBlob: async (path?: string, type?: string) => {
            if (!path) return null;
            const clean = cleanArchivePath(path);
            let resolved = zip.resolveName(clean);
            // 插件层可能传入相对 OPF 的路径，这里兜底解析一次
            if (resolved === null) resolved = zip.resolveName(resolveRef(opfPath, clean));
            if (resolved === null) return null;
            return zip.readBlob(resolved, type ?? guessMediaType(resolved, info));
        },
        loadText: async () => new Blob([''], { type: 'text/plain' }),
        getCover: async () => {
            const coverPath = info.coverPath;
            if (!coverPath) return undefined;
            const resolved = zip.resolveName(coverPath);
            if (resolved === null) return undefined;
            return zip.readBlob(resolved, guessMediaType(resolved, info)) ?? undefined;
        },
        listFiles: () => zip.list(),
    };
}

/** 清理调用方传入的路径：去 query/fragment、前导 /、./ */
function cleanArchivePath(p: string): string {
    return stripFragmentQuery(p).replace(/^\/+/, '').replace(/^\.\//, '');
}

/** 构建 EpubSection[]，章节内容懒加载 */
function buildSections(zip: ZipArchive, info: OpfInfo): EpubSection[] {
    const sections: EpubSection[] = [];
    let index = 0;
    for (const ref of info.spine) {
        const item = info.manifest.get(ref.idref);
        if (!item) continue;
        sections.push(createSection(zip, item, ref, index));
        index++;
    }
    return sections;
}

function createSection(
    zip: ZipArchive,
    item: OpfManifestItem,
    ref: OpfSpineRef,
    index: number
): EpubSection {
    const path = item.resolved;

    return {
        id: path,
        linear: ref.linear,
        size: zip.size(path) ?? 0,
        cfi: `epubcfi(/6/${(index + 1) * 2}!/)`,
        mediaOverlay: item.mediaOverlay,
        pageSpread: undefined,
        resolveHref: (href: string) => resolveRef(path, href),
        load: () => loadSectionDocument(zip, path, item.mediaType),
        // 与 foliate-js 一致：每次调用都重新解析，返回全新 Document。
        // 插件渲染时会把 body 子节点 appendChild 进容器（节点被移走），
        // 若缓存同一个 Document，二次渲染会拿到空 body 导致空白。
        createDocument: () => loadSectionDocument(zip, path, item.mediaType),
        unload: () => {
            // 不缓存文档，无需卸载
        },
    };
}

async function loadSectionDocument(
    zip: ZipArchive,
    path: string,
    mediaType: string
): Promise<Document | null> {
    const text = zip.readText(path);
    if (text === null) return null;
    let mime = 'application/xhtml+xml';
    if (mediaType === 'text/html') mime = 'text/html';
    const doc = parseXmlText(text, mime);
    if (!doc) return null;
    // 浏览器中 XHTML 解析得到 XMLDocument（没有 body 属性），
    // 而插件渲染依赖 sectionDoc.body。这里主动用 text/html 再解析一次以拿到 HTMLDocument。
    if (!hasBody(doc)) {
        const htmlDoc = parseXmlText(text, 'text/html');
        if (htmlDoc && hasBody(htmlDoc)) return htmlDoc;
    }
    return ensureBody(doc);
}

function hasBody(doc: Document): boolean {
    return ((doc as Document & { body?: unknown }).body as unknown) != null;
}

/**
 * 保证返回的文档带 body 节点（插件渲染依赖 sectionDoc.body）。
 * XHTML/SVG 经 DOMParser 得到的 XML 文档通常没有 body，这里统一包装进 HTML 容器。
 */
function ensureBody(doc: Document): Document {
    const existingBody = (doc as Document & { body?: HTMLElement | null }).body;
    if (existingBody) return doc;

    const container = parseXmlText(
        '<html xmlns="http://www.w3.org/1999/xhtml"><body/></html>',
        'application/xhtml+xml'
    );
    if (!container) return doc;

    const containerBody = container.getElementsByTagNameNS(NS.XHTML, 'body')[0];
    const sourceRoot = doc.documentElement;
    if (!containerBody || !sourceRoot) return doc;

    for (const child of Array.from(sourceRoot.childNodes)) {
        containerBody.appendChild(container.importNode(child, true));
    }
    return container;
}

/** 解析文本为 Document；实在失败时返回空 XML 文档（此时说明环境缺 DOMParser） */
function parseOrEmpty(text: string): Document {
    const doc = parseXmlText(text);
    if (doc) return doc;
    const empty = parseXmlText('<r/>');
    if (empty) return empty;
    throw new Error('当前环境缺少 DOMParser，无法解析 EPUB');
}

/** 从扩展名 / manifest 推断 MIME 类型 */
function guessMediaType(name: string, info: OpfInfo): string {
    const ext = (name.split('.').pop() ?? '').toLowerCase();
    const byExt: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        css: 'text/css',
        ttf: 'font/ttf',
        otf: 'font/otf',
        woff: 'font/woff',
        woff2: 'font/woff2',
        xhtml: 'application/xhtml+xml',
        html: 'text/html',
        ncx: 'application/x-dtbncx+xml',
    };
    const byExtType = byExt[ext];
    if (byExtType) return byExtType;
    for (const m of info.manifest.values()) {
        if (m.resolved === name) return m.mediaType;
    }
    return 'application/octet-stream';
}