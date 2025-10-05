import { useState } from 'react';
import type { App } from 'obsidian';
import { Notice } from 'obsidian';
import { SharePreviewModal } from '../components/SharePreviewModal';
import { snapdom } from '@zumer/snapdom';

type UseShareSelectionParams = {
    app: App;
    plugin: any;
    viewerRef: React.RefObject<HTMLDivElement>;
    book: any;
    fileName: string;
    currentSectionIndex: number;
};

export type ShareStyle = 'classic' | 'minimal' | 'image-left';

export function useShareSelection({
    app,
    plugin,
    viewerRef,
    book,
    fileName,
    currentSectionIndex,
}: UseShareSelectionParams) {
    const [isSharing, setIsSharing] = useState(false);

    async function getCoverDataUrl(): Promise<string | undefined> {
        try {
            if (!book?.getCover) return undefined;
            const coverBlob: Blob | undefined = await book.getCover();
            if (!coverBlob) return undefined;
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(coverBlob);
            });
            return dataUrl;
        } catch (_) {
            return undefined;
        }
    }

    function buildCard(text: string, style: ShareStyle, coverUrl?: string) {
        const title =
            (book?.metadata?.title as string) ||
            fileName.replace(/\.epub$/i, '') ||
            '未命名';
        const author = (() => {
            const md = book?.metadata;
            if (!md) return '';
            if (typeof md.creator === 'string') return md.creator;
            if (md?.creator?.name) return md.creator.name;
            if (Array.isArray(md?.creator))
                return md.creator
                    .map((c: any) =>
                        typeof c === 'string' ? c : c?.name || ''
                    )
                    .filter(Boolean)
                    .join(', ');
            if (typeof md.author === 'string') return md.author;
            if (md?.author?.name) return md.author.name;
            return '';
        })();
        const pageLabel = `第${currentSectionIndex + 1}页`;
        const bg =
            getComputedStyle(document.body)
                .getPropertyValue('--background-primary')
                .trim() || '#fff';

        const card = document.createElement('div');
        card.setAttribute('data-share-card', 'true');
        card.className = 'foliate-share-card';

        // Header
        const header = document.createElement('div');
        header.className = 'foliate-share-card-header';
        const left = document.createElement('div');
        left.className = 'foliate-share-card-head-left';
        const titleEl = document.createElement('div');
        titleEl.className = 'foliate-share-card-title';
        titleEl.textContent = title;
        const metaEl = document.createElement('div');
        metaEl.className = 'foliate-share-card-meta';
        metaEl.textContent = [author, pageLabel].filter(Boolean).join(' · ');
        left.appendChild(titleEl);
        left.appendChild(metaEl);

        const right = document.createElement('div');
        right.className = 'foliate-share-card-badge';
        right.textContent = 'Foliate · Obsidian';
        header.appendChild(left);
        header.appendChild(right);

        // Body
        const body = document.createElement('div');
        body.className = 'foliate-share-card-body';
        body.style.fontSize = `${plugin?.settings?.fontSize ? Math.max(14, Math.min(20, Number(plugin.settings.fontSize))) : 16}px`;
        body.style.lineHeight = `${plugin?.settings?.lineHeight || 1.6}`;
        body.textContent = text;

        // Style variants
        if (style === 'classic') {
            body.classList.add('classic');
        } else if (style === 'minimal') {
            body.classList.add('minimal');
        } else if (style === 'image-left') {
            const row = document.createElement('div');
            row.className = 'foliate-share-card-row';
            const leftImgWrap = document.createElement('div');
            leftImgWrap.className = 'foliate-share-card-left';
            if (coverUrl) {
                const img = document.createElement('img');
                img.setAttribute('draggable', 'false');
                img.className = 'foliate-share-cover-lg';
                img.src = coverUrl;
                img.alt = 'cover';
                img.referrerPolicy = 'no-referrer';
                leftImgWrap.appendChild(img);
            }
            const textWrap = document.createElement('div');
            textWrap.className = 'foliate-share-card-textwrap';
            textWrap.appendChild(body);
            row.appendChild(leftImgWrap);
            row.appendChild(textWrap);
            card.appendChild(header);
            card.appendChild(row);
        }

        if (style !== 'image-left') {
            card.appendChild(header);
            card.appendChild(body);
        }

        // Footer
        const footer = document.createElement('div');
        footer.className = 'foliate-share-card-footer';
        const time = new Date();
        const ts = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
        const leftFoot = document.createElement('div');
        leftFoot.textContent = ts;
        const rightFoot = document.createElement('div');
        rightFoot.className = 'foliate-share-card-footer-right';
        if (coverUrl && style !== 'image-left') {
            const img = document.createElement('img');
            img.className = 'foliate-share-cover-sm';
            img.src = coverUrl;
            img.alt = 'cover';
            img.referrerPolicy = 'no-referrer';
            rightFoot.appendChild(img);
        }
        const fromEl = document.createElement('span');
        fromEl.className = 'foliate-share-card-footer-from';
        fromEl.textContent = `来源：${title}`;
        rightFoot.appendChild(fromEl);
        footer.appendChild(leftFoot);
        footer.appendChild(rightFoot);
        card.appendChild(footer);

        return { card, meta: { title, bg } } as const;
    }

    // 直接分享给定文本（用于高亮摘录等场景）
    const shareText = async (text: string, style: ShareStyle = 'classic') => {
        if (isSharing) return;
        let wrapperEl: HTMLDivElement | null = null;
        try {
            setIsSharing(true);

            const trimmed = (text || '').trim();
            if (!trimmed) {
                new Notice('没有可分享的文本');
                return;
            }

            // 离屏容器（保持到 Modal 关闭，避免截图空白）
            wrapperEl = document.createElement('div');
            wrapperEl.classList.add('foliate-share-wrapper');
            document.body.appendChild(wrapperEl);

            // 根据样式构造卡片
            const coverUrl = await getCoverDataUrl();
            let { card, meta } = buildCard(
                trimmed,
                style,
                coverUrl || undefined
            );
            wrapperEl.appendChild(card);

            // 预览并提供下载/复制
            const makeCapture = async () => {
                return await snapdom(card, {
                    embedFonts: true,
                    scale: 2,
                    backgroundColor: meta.bg || '#fff',
                    cache: 'auto',
                    fast: true,
                });
            };

            const short = trimmed.slice(0, 24).replace(/\s+/g, '');
            const safe = (s: string) => s.replace(/[\\/:*?\"<>|\r\n]+/g, '_');
            const filename = `${safe(meta.title)}_${safe(short)}`;

            new SharePreviewModal(app, {
                cardEl: card,
                title: '分享预览',
                styleKey: style,
                onChangeStyle: (newStyle: string) => {
                    // 重建卡片并替换 wrapperEl 内的节点，保证截图目标存在
                    const next = buildCard(
                        trimmed,
                        newStyle as any,
                        coverUrl || undefined
                    );
                    const newCard = next.card;
                    if (card.parentElement)
                        card.parentElement.replaceChild(newCard, card);
                    card = newCard;
                    meta = next.meta as any;
                    return newCard;
                },
                onDownload: async () => {
                    const result = await makeCapture();
                    await result.download({ format: 'png', filename });
                },
                onCopy: async () => {
                    const result = await makeCapture();
                    const blob = await result.toBlob({ type: 'png' });
                    if (
                        blob &&
                        (navigator as any).clipboard &&
                        (window as any).ClipboardItem
                    ) {
                        const item = new (window as any).ClipboardItem({
                            'image/png': blob,
                        });
                        await (navigator as any).clipboard.write([item]);
                    } else {
                        throw new Error('Clipboard API not available');
                    }
                },
                cleanup: () => {
                    if (wrapperEl && wrapperEl.parentElement) {
                        wrapperEl.parentElement.removeChild(wrapperEl);
                    }
                },
            }).open();
        } catch (err) {
            console.error('分享图片生成失败:', err);
            new Notice('分享失败，请重试');
        } finally {
            // 清理推迟到 Modal close 的 cleanup 回调
            setIsSharing(false);
        }
    };

    const shareSelection = async (style: ShareStyle = 'classic') => {
        if (isSharing) return;
        try {
            const containerEl = viewerRef.current;
            if (!containerEl) throw new Error('阅读器尚未就绪');

            const selection = window.getSelection();
            if (
                !selection ||
                selection.rangeCount === 0 ||
                selection.isCollapsed
            ) {
                new Notice('请先选中文本');
                return;
            }
            const range = selection.getRangeAt(0);

            // 只允许在阅读区域内的选择
            const isInside = (node: Node | null): boolean => {
                if (!node || !containerEl) return false;
                const el =
                    node.nodeType === Node.TEXT_NODE
                        ? (node as Text).parentElement
                        : (node as HTMLElement);
                return !!el && containerEl.contains(el);
            };
            if (
                !isInside(range.startContainer) ||
                !isInside(range.endContainer)
            ) {
                new Notice('请选择阅读区域中的文本');
                return;
            }

            const text = selection.toString().trim();
            if (!text) {
                new Notice('没有可分享的文本');
                return;
            }
            // 复用 shareText 流程
            await shareText(text, style);
        } catch (err) {
            console.error('分享图片生成失败:', err);
            new Notice('分享失败，请重试');
        } finally {
            // 状态由 shareText 管理，这里不处理
        }
    };

    return { shareSelection, shareText, isSharing } as const;
}
