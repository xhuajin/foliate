import type { ZipArchive } from './zip';
import { parseXmlText, attr } from './xml';
import { normalizePath } from './path';

const CONTAINER_NS = 'urn:oasis:names:tc:opendocument:xmlns:container';

/** 从 META-INF/container.xml 解析 OPF 路径；缺失时按常见惯例（OEBPS/content.opf）兜底 */
export function resolveRootfile(zip: ZipArchive): string {
    const text = zip.readText('META-INF/container.xml');
    if (!text) {
        // 某些非标准 EPUB（或 zipped 附档）没有 container.xml，按业界惯例猜测
        const guess = ['OEBPS/content.opf', 'OPS/content.opf', 'content.opf'].find((p) => zip.has(p));
        return guess ?? 'OEBPS/content.opf';
    }
    const doc = parseXmlText(text);
    let best: Element | null = null;
    if (doc) {
        const rootfiles = Array.from(
            doc.getElementsByTagNameNS(CONTAINER_NS, 'rootfile')
        );
        for (const rf of rootfiles) {
            if (attr(rf, 'media-type') === 'application/oebps-package+xml') {
                best = rf;
                break;
            }
        }
        best ??= rootfiles[0] ?? null;
    }
    const fullPath = attr(best, 'full-path') ?? 'OEBPS/content.opf';
    return normalizePath(fullPath.replace(/^\/+/, ''));
}