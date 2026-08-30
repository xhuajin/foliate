/** XML 解析与命名空间工具（基于运行时 DOMParser，Obsidian/Electron 与测试环境均可用） */

export const NS = {
    DC: 'http://purl.org/dc/elements/1.1/',
    OPF: 'http://www.idpf.org/2007/opf',
    XHTML: 'http://www.w3.org/1999/xhtml',
    EPUB: 'http://www.idpf.org/2007/ops',
    NCX: 'http://www.daisy.org/z3986/2005/ncx/',
} as const;

/**
 * 解析 XML 字符串；优先使用传入 mime，失败时回退 application/xml。
 * 返回 null 表示环境不支持 DOMParser 或内容明显非法。
 */
export function parseXmlText(text: string, mime = 'application/xml'): Document | null {
    if (typeof DOMParser === 'undefined') return null;
    const dp = new DOMParser();
    for (const m of [mime, 'application/xml']) {
        try {
            const doc = dp.parseFromString(text, m as DOMParserSupportedType);
            const docEl = doc.documentElement;
            if (docEl && docEl.localName === 'parsererror') continue;
            return doc;
        } catch {
            // 尝试下一个 mime（部分实现不认 xhtml/svg mime）
        }
    }
    return null;
}

/** 按命名空间取元素列表 */
export function elsByNS(doc: Document, ns: string, local: string): Element[] {
    return Array.from(doc.getElementsByTagNameNS(ns, local));
}

/** 按命名空间取第一个元素 */
export function firstByNS(doc: Document, ns: string, local: string): Element | null {
    return doc.getElementsByTagNameNS(ns, local)[0] ?? null;
}

/** 元素的直接子元素（只取 Element，忽略文本/注释） */
export function childEls(e: Element): Element[] {
    return Array.from(e.children);
}

/** 带命名空间/本地名过滤的直接子元素 */
export function childElsByNS(e: Element, ns: string, local: string): Element[] {
    return Array.from(e.children).filter((c) => c.namespaceURI === ns && c.localName === local);
}

/** 读取属性，缺失返回 undefined */
export function attr(e: Element | null | undefined, name: string): string | undefined {
    if (!e) return undefined;
    const v = e.getAttribute(name);
    return v ?? undefined;
}

/** 读取 epub:type 属性（先走命名空间，再退化为字面量 'epub:type'） */
export function epubTypeAttr(e: Element): string | undefined {
    return e.getAttributeNS(NS.EPUB, 'type') ?? e.getAttribute('epub:type') ?? undefined;
}

/** 元素文本（去首尾空白） */
export function textOf(e: Element | undefined | null): string {
    if (!e) return '';
    return (e.textContent ?? '').trim();
}

/** 按空格拆分属性值列表 */
export function splitWords(v: string | undefined): string[] {
    if (!v) return [];
    return v.split(/\s+/).filter(Boolean);
}