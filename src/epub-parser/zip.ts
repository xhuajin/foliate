/**
 * 轻量 ZIP 读取器（最小实现）。
 *
 * - 解析 EOCD / 中央目录，支持 ZIP64 与 UTF-8 文件名；
 * - 按需从中央目录解压单个文件（store 原样返回，deflate 用 fflate 解压）；
 * - 不依赖 Web Worker，纯内存操作，适合 Obsidian 插件环境。
 */
import { inflateSync } from 'fflate';

export interface ZipEntryInfo {
    /** 归档内规范化后的路径（无前导 / 与 ./, 不含目录项） */
    name: string;
    /** 原始文件名（未规范化） */
    rawName: string;
    uncompressedSize: number;
    compressedSize: number;
    compressionMethod: number;
    flags: number;
    localHeaderOffset: number;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOC = 0x07064b50;

const decoder = new TextDecoder('utf-8');

/** 归一化 ZIP 内路径：去掉首尾 /、./、重复 // 等噪音 */
function normalizeZipName(name: string): string {
    let n = name.replace(/\\/g, '/');
    n = n.replace(/\/{2,}/g, '/');
    while (n.startsWith('./')) n = n.slice(2);
    n = n.replace(/^\/+/, '');
    n = n.replace(/\/+$/, '');
    return n;
}

function tryDecodeURI(name: string): string {
    try {
        return decodeURI(name);
    } catch {
        return name;
    }
}

export class ZipArchive {
    private data: Uint8Array;
    private view: DataView;
    private exact = new Map<string, ZipEntryInfo>();
    private lower = new Map<string, ZipEntryInfo>();
    private order: string[] = [];

    constructor(data: Uint8Array) {
        this.data = data;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.parseCentralDirectory();
    }

    /** 归档内全部文件名（规范化后的路径） */
    list(): string[] {
        return this.order.slice();
    }

    /** 文件是否存在（自动做大小写回退） */
    has(name: string): boolean {
        return this.resolveName(name) !== null;
    }

    /** 文件解压后的大小，不存在返回 undefined */
    size(name: string): number | undefined {
        const entry = this.lookup(name);
        return entry ? entry.uncompressedSize : undefined;
    }

    /** 全部文件的解压大小之和 */
    totalSize(): number {
        let sum = 0;
        for (const info of this.exact.values()) sum += info.uncompressedSize;
        return sum;
    }

    /**
     * 查找归档中的规范路径：先精确匹配，再做解 URI 编码、大小写回退。
     * 返回规范化路径字符串，找不到返回 null。
     */
    resolveName(name: string): string | null {
        const clean = normalizeZipName(name);
        if (this.exact.has(clean)) return clean;
        const decoded = tryDecodeURI(clean);
        if (decoded !== clean && this.exact.has(decoded)) return decoded;
        const ci = this.lower.get(clean.toLowerCase());
        if (ci) return ci.name;
        if (decoded !== clean) {
            const ci2 = this.lower.get(decoded.toLowerCase());
            if (ci2) return ci2.name;
        }
        return null;
    }

    /** 读取单个文件（同步，返回解压后的字节；解压失败抛错） */
    read(name: string): Uint8Array | null {
        const entry = this.lookup(name);
        if (!entry) return null;
        return this.readCompressed(entry);
    }

    /** 读取并解码为 UTF-8 文本 */
    readText(name: string): string | null {
        const bytes = this.read(name);
        if (bytes === null) return null;
        return decoder.decode(bytes);
    }

    /** 读取为 Blob（用于 loadBlob / getCover 等） */
    readBlob(name: string, type?: string): Blob | null {
        if (typeof Blob === 'undefined') {
            throw new Error('当前环境不支持 Blob');
        }
        const bytes = this.read(name);
        if (bytes === null) return null;
        const blobType = type ?? '';
        // 拷贝为独立 ArrayBuffer（Uint8Array<ArrayBufferLike> 不能直接作为 BlobPart）
        return new Blob([new Uint8Array(bytes)], { type: blobType });
    }

    private lookup(name: string): ZipEntryInfo | null {
        const clean = this.resolveName(name);
        if (!clean) return null;
        return this.exact.get(clean) ?? null;
    }

    private parseCentralDirectory(): void {
        const eocd = this.findEOCD();
        if (eocd < 0) {
            throw new Error('不是有效的 ZIP / EPUB 文件（未找到 EOCD）');
        }
        let count = this.view.getUint16(eocd + 10, true);
        let cdOffset = this.view.getUint32(eocd + 16, true);
        const cdSize = this.view.getUint32(eocd + 12, true);

        if (count === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
            const loc = eocd - 20;
            if (
                loc >= 0 &&
                this.view.getUint32(loc, true) === SIG_EOCD64_LOC &&
                loc + 8 + 8 <= this.data.length
            ) {
                const e64 = this.view.getUint32(loc + 8, true);
                if (e64 + 56 <= this.data.length && this.view.getUint32(e64, true) === SIG_EOCD64) {
                    count = Number(this.view.getBigUint64(e64 + 32, true));
                    cdOffset = Number(this.view.getBigUint64(e64 + 48, true));
                }
            }
        }

        let pos = cdOffset;
        const max = this.data.length;
        for (let i = 0; i < count; i++) {
            if (pos + 46 > max) break;
            if (this.view.getUint32(pos, true) !== SIG_CENTRAL) break;
            const flags = this.view.getUint16(pos + 8, true);
            const method = this.view.getUint16(pos + 10, true);
            let csize = this.view.getUint32(pos + 20, true);
            let usize = this.view.getUint32(pos + 24, true);
            const nameLen = this.view.getUint16(pos + 28, true);
            const extraLen = this.view.getUint16(pos + 30, true);
            const commentLen = this.view.getUint16(pos + 32, true);
            let localOffset = this.view.getUint32(pos + 42, true);

            const nameStart = pos + 46;
            const extraStart = nameStart + nameLen;
            if (extraStart + extraLen + commentLen > max) break;
            const nameBytes = this.data.subarray(nameStart, extraStart);

            if (usize === 0xffffffff || csize === 0xffffffff || localOffset === 0xffffffff) {
                const exView = new DataView(this.data.buffer, this.data.byteOffset + extraStart, extraLen);
                let ex = 0;
                while (ex + 4 <= extraLen) {
                    const id = exView.getUint16(ex, true);
                    const size = exView.getUint16(ex + 2, true);
                    if (id === 0x0001) {
                        let b = ex + 4;
                        const take = (): number => {
                            const v = Number(exView.getBigUint64(b, true));
                            b += 8;
                            return v;
                        };
                        if (usize === 0xffffffff) usize = take();
                        if (csize === 0xffffffff) csize = take();
                        if (localOffset === 0xffffffff) localOffset = take();
                        // disk number start 略过（本项目不涉及分盘）
                    }
                    ex = ex + 4 + size;
                }
            }

            const rawName = decoder.decode(nameBytes);
            const name = normalizeZipName(rawName);
            const isDir = rawName.endsWith('/') || name === '';
            if (!isDir && !this.exact.has(name)) {
                const info: ZipEntryInfo = {
                    name,
                    rawName,
                    uncompressedSize: usize,
                    compressedSize: csize,
                    compressionMethod: method,
                    flags,
                    localHeaderOffset: localOffset,
                };
                this.exact.set(name, info);
                const lowerName = name.toLowerCase();
                if (!this.lower.has(lowerName)) this.lower.set(lowerName, info);
                this.order.push(name);
            }

            pos += 46 + nameLen + extraLen + commentLen;
        }
    }

    private findEOCD(): number {
        const maxBack = Math.min(this.data.length, 22 + 65535);
        for (let len = 22; len <= maxBack; len++) {
            const i = this.data.length - len;
            const commentLen = this.view.getUint16(i + 20, true);
            if (
                this.view.getUint32(i, true) === SIG_EOCD &&
                i + 22 + commentLen === this.data.length
            ) {
                return i;
            }
        }
        return -1;
    }

    private readCompressed(info: ZipEntryInfo): Uint8Array {
        if (info.flags & 0x1) {
            throw new Error(`文件 ${info.name} 已加密，暂不支持`);
        }
        const off = info.localHeaderOffset;
        if (off + 30 > this.data.length || this.view.getUint32(off, true) !== SIG_LOCAL) {
            throw new Error(`文件 ${info.name} 的本地头损坏`);
        }
        const nameLen = this.view.getUint16(off + 26, true);
        const extraLen = this.view.getUint16(off + 28, true);
        const start = off + 30 + nameLen + extraLen;
        if (start + info.compressedSize > this.data.length) {
            throw new Error(`文件 ${info.name} 数据越界`);
        }
        const compressed = this.data.subarray(start, start + info.compressedSize);
        try {
            switch (info.compressionMethod) {
                case 0: // store
                    return compressed;
                case 8: // deflate
                    return inflateSync(compressed);
                default:
                    throw new Error(`不支持的压缩方式: ${info.compressionMethod}`);
            }
        } catch (e) {
            if (e instanceof Error && /不支持的压缩方式/.test(e.message)) throw e;
            throw new Error(`解压 ${info.name} 失败: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
}