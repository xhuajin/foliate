import type { ZipArchive } from './zip';
import { NS, parseXmlText, elsByNS, firstByNS, childElsByNS, attr, textOf, splitWords } from './xml';
import { resolveRef } from './path';
import type { EpubMetadata } from './types';

export interface OpfManifestItem {
    id: string;
    /** OPF 中的原始 href */
    href: string;
    /** 解析为归档内绝对路径 */
    resolved: string;
    mediaType: string;
    properties: string[];
    mediaOverlay: string | null;
}

export interface OpfSpineRef {
    idref: string;
    linear: 'yes' | 'no' | null;
    properties: string[];
    id: string | null;
}

export interface OpfInfo {
    metadata: EpubMetadata;
    manifest: Map<string, OpfManifestItem>;
    spine: OpfSpineRef[];
    guide: Array<{ href: string; type: string[]; label: string }>;
    pageProgressionDirection: null | 'ltr' | 'rtl' | 'auto';
    coverPath: string | null;
    navPath: string | null;
    ncxPath: string | null;
    opfPath: string;
}

/** 解析 OPF（package document）：metadata / manifest / spine / guide / cover / nav / ncx */
export function parseOpf(zip: ZipArchive, opfPath: string): OpfInfo {
    const text = zip.readText(opfPath);
    if (text === null) throw new Error(`OPF 文件不存在: ${opfPath}`);
    const doc = parseXmlText(text);
    if (!doc) throw new Error(`OPF 解析失败: ${opfPath}`);
    const root = doc.documentElement;
    const pkgEl = firstByNS(doc, NS.OPF, 'package') ?? root;
    const spineEl = firstByNS(doc, NS.OPF, 'spine');

    // ---- manifest ----
    const manifest = new Map<string, OpfManifestItem>();
    for (const item of elsByNS(doc, NS.OPF, 'item')) {
        const id = attr(item, 'id');
        const href = attr(item, 'href');
        if (!id || !href) continue;
        const mediaType = attr(item, 'media-type') ?? '';
        manifest.set(id, {
            id,
            href,
            resolved: resolveRef(opfPath, href),
            mediaType,
            properties: splitWords(attr(item, 'properties')),
            mediaOverlay: attr(item, 'media-overlay') ?? null,
        });
    }

    // ---- metadata ----
    const metadata = parseMetadata(doc);

    // ---- spine ----
    const spine: OpfSpineRef[] = [];
    if (spineEl) {
        for (const iref of childElsByNS(spineEl, NS.OPF, 'itemref')) {
            const idref = attr(iref, 'idref');
            if (!idref) continue;
            spine.push({
                idref,
                linear: attr(iref, 'linear') === 'no' ? 'no' : 'yes',
                properties: splitWords(attr(iref, 'properties')),
                id: attr(iref, 'id') ?? null,
            });
        }
    }

    // ---- guide（EPUB2）----
    const guide: Array<{ href: string; type: string[]; label: string }> = [];
    const guideEl = firstByNS(doc, NS.OPF, 'guide');
    if (guideEl) {
        for (const ref of childElsByNS(guideEl, NS.OPF, 'reference')) {
            const href = attr(ref, 'href');
            if (!href) continue;
            guide.push({
                href: resolveRef(opfPath, href),
                type: splitWords(attr(ref, 'type')),
                label: attr(ref, 'title') ?? '',
            });
        }
    }

    // ---- cover ----
    const coverPath = findCoverId(doc, manifest);
    const resolvedCover = coverPath ? (manifest.get(coverPath)?.resolved ?? null) : null;

    // ---- nav 文档（EPUB3）----
    let navPath: string | null = null;
    for (const m of manifest.values()) {
        if (m.properties.includes('nav')) {
            navPath = m.resolved;
            break;
        }
    }

    // ---- NCX（EPUB2）----
    let ncxPath: string | null = null;
    const tocId = spineEl ? attr(spineEl, 'toc') : undefined;
    const tocItem = tocId ? manifest.get(tocId) : undefined;
    if (tocItem) {
        ncxPath = tocItem.resolved;
    } else {
        for (const m of manifest.values()) {
            if (m.mediaType === 'application/x-dtbncx+xml') {
                ncxPath = m.resolved;
                break;
            }
        }
    }

    // ---- 页码方向 ----
    const dir = attr(pkgEl, 'page-progression-direction');
    const pageProgressionDirection: OpfInfo['pageProgressionDirection'] =
        dir === 'ltr' || dir === 'rtl' || dir === 'auto' ? dir : null;

    return {
        metadata,
        manifest,
        spine,
        guide,
        pageProgressionDirection,
        coverPath: resolvedCover,
        navPath,
        ncxPath,
        opfPath,
    };
}

function parseMetadata(doc: Document): EpubMetadata {
    const textList = (local: string): string[] =>
        elsByNS(doc, NS.DC, local)
            .map(textOf)
            .filter((s): s is string => s.length > 0);

    const first = (local: string): string | undefined => {
        const list = textList(local);
        return list[0];
    };

    const creators = textList('creator');
    const creator = creators.length ? creators.join(', ') : undefined;

    let modified: string | undefined;
    for (const m of elsByNS(doc, NS.OPF, 'meta')) {
        if (attr(m, 'property') === 'dcterms:modified') {
            modified = textOf(m) || undefined;
            break;
        }
    }

    const title = first('title');
    const description = first('description');
    const publisher = first('publisher');
    const language = first('language');
    const identifier = first('identifier');
    const date = first('date');
    const rights = first('rights');
    const subject = textList('subject');

    const metadata: EpubMetadata = {};
    if (title) metadata.title = title;
    if (creator) {
        metadata.creator = creator;
        metadata.author = creator;
    }
    if (description) metadata.description = description;
    if (publisher) metadata.publisher = publisher;
    if (language) metadata.language = language;
    if (identifier) metadata.identifier = identifier;
    if (date) metadata.date = date;
    if (modified) metadata.modified = modified;
    if (rights) metadata.rights = rights;
    if (subject.length) metadata.subject = subject;
    return metadata;
}

/** 定位封面 manifest id：meta[name=cover] 优先，其次 properties=cover-image */
function findCoverId(doc: Document, manifest: Map<string, OpfManifestItem>): string | undefined {
    for (const m of elsByNS(doc, NS.OPF, 'meta')) {
        if (attr(m, 'name') === 'cover') {
            const content = attr(m, 'content');
            if (content && manifest.has(content)) return content;
        }
    }
    for (const m of manifest.values()) {
        if (m.properties.includes('cover-image')) return m.id;
    }
    return undefined;
}