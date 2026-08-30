import type { ZipArchive } from './zip';
import { NS, parseXmlText, childElsByNS, attr, textOf, epubTypeAttr } from './xml';
import { resolveRefKeepFragment } from './path';
import type { EpubTocItem } from './types';

export interface NavInfo {
    toc: EpubTocItem[];
    landmarks: EpubTocItem[];
    pageList: EpubTocItem[];
}

/** 解析 EPUB3 导航文档（toc / landmarks / page-list） */
export function parseNavDocument(zip: ZipArchive, navPath: string): NavInfo | null {
    const text = zip.readText(navPath);
    if (text === null) return null;
    const doc = parseXmlText(text);
    if (!doc) return null;

    const navs = Array.from(doc.getElementsByTagNameNS(NS.XHTML, 'nav'));
    let toc: EpubTocItem[] = [];
    let landmarks: EpubTocItem[] = [];
    let pageList: EpubTocItem[] = [];
    let found = false;

    for (const nav of navs) {
        const type = epubTypeAttr(nav);
        if (type === 'toc') {
            toc = parseNavList(nav, navPath);
            found = true;
        } else if (type === 'landmarks') {
            landmarks = parseNavList(nav, navPath);
            found = true;
        } else if (type === 'page-list') {
            pageList = parseNavList(nav, navPath);
            found = true;
        }
    }

    // 兜底：没有 epub:type 的导航文档当作目录使用
    if (!found) {
        const firstNav = navs[0];
        if (firstNav) {
            toc = parseNavList(firstNav, navPath);
            found = true;
        }
    }

    return found ? { toc, landmarks, pageList } : null;
}

/** 解析 *仅* NCX（EPUB2 目录），无 nav 文档时的回退 */
export function parseNcx(
    zip: ZipArchive,
    ncxPath: string
): { toc: EpubTocItem[]; pageList: EpubTocItem[] } | null {
    const text = zip.readText(ncxPath);
    if (text === null) return null;
    const doc = parseXmlText(text);
    if (!doc) return null;

    const navMapEl = doc.getElementsByTagNameNS(NS.NCX, 'navMap')[0] ?? null;
    const toc = navMapEl ? parseNavPoints(navMapEl, ncxPath) : [];

    const pageList: EpubTocItem[] = [];
    const pageListEl = doc.getElementsByTagNameNS(NS.NCX, 'pageList')[0] ?? null;
    if (pageListEl) {
        const targets = Array.from(pageListEl.getElementsByTagNameNS(NS.NCX, 'pageTarget'));
        for (const t of targets) {
            const navLabelEl = childElsByNS(t, NS.NCX, 'navLabel')[0];
            const textEl = navLabelEl ? childElsByNS(navLabelEl, NS.NCX, 'text')[0] : undefined;
            const contentEl = childElsByNS(t, NS.NCX, 'content')[0];
            const src = contentEl ? attr(contentEl, 'src') : undefined;
            pageList.push({
                href: src ? resolveRefKeepFragment(ncxPath, src) : undefined,
                label: textOf(textEl) || undefined,
                subitems: undefined,
            });
        }
    }

    return { toc, pageList };
}

/** 解析 <ol> 导航列表（nav 文档） */
function parseNavList(nav: Element, basePath: string): EpubTocItem[] {
    const ol = nav.getElementsByTagNameNS(NS.XHTML, 'ol')[0];
    if (!ol) return [];
    return parseOl(ol, basePath);
}

function parseOl(ol: Element, basePath: string): EpubTocItem[] {
    const result: EpubTocItem[] = [];
    for (const li of childElsByNS(ol, NS.XHTML, 'li')) {
        const links = Array.from(li.getElementsByTagNameNS(NS.XHTML, 'a'));
        let anchor: Element | undefined;
        for (const a of links) {
            if (attr(a, 'href') !== undefined) {
                anchor = a;
                break;
            }
        }
        const href = anchor ? attr(anchor, 'href') : undefined;
        const label = anchor ? textOf(anchor) : textOf(li);

        let subitems: EpubTocItem[] = [];
        const innerOl =
            childElsByNS(li, NS.XHTML, 'ol')[0] ??
            li.getElementsByTagNameNS(NS.XHTML, 'ol')[0];
        if (innerOl) subitems = parseOl(innerOl, basePath);

        result.push({
            href: href !== undefined ? resolveRefKeepFragment(basePath, href) : undefined,
            label: label || undefined,
            subitems: subitems.length ? subitems : undefined,
        });
    }
    return result;
}

/** 解析单个 navPoint（支持直接嵌套的子 navPoint） */
function parseNavPoint(np: Element, basePath: string): EpubTocItem {
    const navLabelEl = childElsByNS(np, NS.NCX, 'navLabel')[0];
    const textEl = navLabelEl ? childElsByNS(navLabelEl, NS.NCX, 'text')[0] : undefined;
    const contentEl = childElsByNS(np, NS.NCX, 'content')[0];
    const src = contentEl ? attr(contentEl, 'src') : undefined;

    const nested = childElsByNS(np, NS.NCX, 'navPoint');
    const innerMap = childElsByNS(np, NS.NCX, 'navMap')[0];
    let subitems: EpubTocItem[] = [];
    if (nested.length > 0) {
        subitems = nested.map((n) => parseNavPoint(n, basePath));
    } else if (innerMap) {
        subitems = parseNavPoints(innerMap, basePath);
    }

    return {
        href: src !== undefined ? resolveRefKeepFragment(basePath, src) : undefined,
        label: textOf(textEl) || undefined,
        subitems: subitems.length ? subitems : undefined,
    };
}
function parseNavPoints(el: Element, basePath: string): EpubTocItem[] {
    const result: EpubTocItem[] = [];
    for (const np of childElsByNS(el, NS.NCX, 'navPoint')) {
        const navLabelEl = childElsByNS(np, NS.NCX, 'navLabel')[0];
        const textEl = navLabelEl ? childElsByNS(navLabelEl, NS.NCX, 'text')[0] : undefined;
        const contentEl = childElsByNS(np, NS.NCX, 'content')[0];
        const src = contentEl ? attr(contentEl, 'src') : undefined;

        // NCX 子条目可以直接嵌套 navPoint，也可能套一层 navMap（宽松兼容两种）
        const nested = childElsByNS(np, NS.NCX, 'navPoint');
        const innerMap = childElsByNS(np, NS.NCX, 'navMap')[0];
        let subitems: EpubTocItem[] = [];
        if (nested.length > 0) {
            subitems = nested.map((n) => parseNavPoint(n, basePath));
        } else if (innerMap) {
            subitems = parseNavPoints(innerMap, basePath);
        }

        result.push({
            href: src !== undefined ? resolveRefKeepFragment(basePath, src) : undefined,
            label: textOf(textEl) || undefined,
            subitems: subitems.length ? subitems : undefined,
        });
    }
    return result;
}