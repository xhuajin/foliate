/**
 * epub-parser —— 极简 EPUB 解析器（Obsidian Foliate 插件专用）。
 *
 * 只做 EPUB 2/3 的静态解析：
 *  - ZIP 层（中央目录 + fflate 解压，按需读取）
 *  - META-INF/container.xml → OPF
 *  - OPF metadata / manifest / spine / guide / cover
 *  - 目录：EPUB3 nav 文档 或 EPUB2 NCX
 *  - 章节懒加载（createDocument / resolveHref）
 *
 * 与 foliate-js 不同：不做任何渲染、不解析 mobi/pdf/fb2 等其它格式。
 */

export { parseEpub } from './book';
export { ZipArchive } from './zip';
export type { ZipEntryInfo } from './zip';
export type { EpubMetadata, EpubTocItem, EpubSection, EpubResource, EpubType } from './types';
export type { OpfInfo, OpfManifestItem, OpfSpineRef } from './opf';
export { NS } from './xml';
export { normalizePath, resolveRef, stripFragmentQuery } from './path';