/** 归档内路径工具 */

/** 规范化路径：解析 . 与 ..，去掉空段，统一为 / 分隔 */
export function normalizePath(p: string): string {
    const parts = p.replace(/\\/g, '/').split('/');
    const out: string[] = [];
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') {
            out.pop();
            continue;
        }
        out.push(part);
    }
    return out.join('/');
}

/** 去掉路径末尾的 / 与文件名，返回目录部分（无目录返回空串） */
export function dirName(p: string): string {
    const i = p.lastIndexOf('/');
    return i >= 0 ? p.slice(0, i) : '';
}

/** 去掉 ?query 与 #fragment */
export function stripFragmentQuery(p: string): string {
    let s = p;
    const q = s.indexOf('?');
    if (q >= 0) s = s.slice(0, q);
    const h = s.indexOf('#');
    if (h >= 0) s = s.slice(0, h);
    return s;
}

/** 判断是否为外部绝对 URL（http:, data:, mailto: 等） */
export function isExternalUrl(u: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(u);
}

/**
 * 在 basePath（归档内某文件路径）基础上解析相对引用 ref。
 * 返回归档内绝对路径（不含 ?/#；外部 URL 原样返回）。
 */
export function resolveRef(basePath: string, ref: string): string {
    const clean = stripFragmentQuery(ref);
    if (!clean) return basePath;
    if (isExternalUrl(clean)) return clean;
    if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
    const dir = dirName(basePath);
    return normalizePath(dir ? `${dir}/${clean}` : clean);
}

/** 同 resolveRef，但保留 #fragment（用于目录等需要跳转锚点的场景） */
export function resolveRefKeepFragment(basePath: string, ref: string): string {
    let clean = ref;
    const q = clean.indexOf('?');
    if (q >= 0) clean = clean.slice(0, q);
    const h = clean.indexOf('#');
    const frag = h >= 0 ? clean.slice(h) : '';
    const noFrag = h >= 0 ? clean.slice(0, h) : clean;
    if (!noFrag) return basePath + frag;
    if (isExternalUrl(noFrag)) return clean;
    if (noFrag.startsWith('/')) return noFrag.replace(/^\/+/, '') + frag;
    const dir = dirName(basePath);
    return normalizePath(dir ? `${dir}/${noFrag}` : noFrag) + frag;
}