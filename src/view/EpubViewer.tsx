import React, { useState, useEffect, useRef } from 'react';
import { App, Notice, TFile } from 'obsidian';
import {
    appHasDailyNotesPluginLoaded,
    createDailyNote,
    getAllDailyNotes,
    getDailyNote,
} from 'obsidian-daily-notes-interface';
import { EPUB } from 'foliate-js/epub.js';
import type FoliatePlugin from '../main';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from '../components/ui/context-menu';
import {
    Copy,
    Search,
    FileText,
    Quote,
    ArrowLeft,
    ArrowRight,
    ExternalLink,
    Trash2,
    List,
    RefreshCcw,
    Share,
    SquarePen,
} from 'lucide-react';
import moment from 'moment';
import { useExcerpts } from '../hooks/useExcerpts';
import { useTocSync } from '../hooks/useTocSync';
import { useRenderSection } from '../hooks/useRenderSection';
import { useSectionNav } from '../hooks/useSectionNav';
import { EPUB_VIEW_TYPE, EpubReaderView } from './EpubReaderView';
import { ShareStyle, useShareSelection } from '../hooks/useShareSelection';
import { cn } from '@/lib/utils';
import { t } from '@/lang/helpers';
import { normalizeAuthor } from '@/lib/metadata';
import { EpubMetadata, EpubType } from '@/types';
import { ZipEntry } from 'foliate-js/vendor/zip.js';

interface EpubViewerProps {
    file: TFile;
    app: App; // 添加 app 参数以访问 Obsidian API
    plugin: FoliatePlugin; // 添加插件实例
}

const EpubViewer: React.FC<EpubViewerProps> = ({
    file,
    app, // 接收 app 参数
    plugin, // 接收插件实例
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [book, setBook] = useState<EpubType | null>(null);
    const entriesRef = useRef<ZipEntry[] | null>(null);
    const injectedFontRef = useRef<boolean>(false);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const scrollToTopRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    // 章节标题与可见性跟踪
    const [sectionTitle, setSectionTitle] = useState<string>('');
    const [isHeadVisible, setIsHeadVisible] = useState<boolean>(false);
    const headObserverRef = useRef<IntersectionObserver | null>(null);
    const observedHeadElRef = useRef<Element | null>(null);

    // 使用摘录/高亮 hook（用于渲染章节后高亮摘录）
    const { applyHighlightsForSection } = useExcerpts(
        app,
        plugin,
        file,
        book,
        viewerRef
    );

    // 保存阅读进度
    const saveProgress = async (sectionIndex: number) => {
        if (file && plugin.settings.autoSaveProgress) {
            // 提取书籍元数据
            let metadata: EpubMetadata = {};
            if (book?.metadata) {
                // 安全地提取作者信息
                const author = normalizeAuthor(
                    book.metadata.author ?? book.metadata.creator
                );

                // 获取封面
                let coverUrl = undefined;
                try {
                    const coverBlob = await book.getCover();
                    if (coverBlob) {
                        // 将 Blob 转换为 base64 字符串
                        const reader = new FileReader();
                        coverUrl = await new Promise<string>(
                            (resolve, reject) => {
                                reader.onload = () =>
                                    resolve(reader.result as string);
                                reader.onerror = reject;
                                reader.readAsDataURL(coverBlob);
                            }
                        );
                    }
                } catch (err) {
                    console.warn('获取封面失败:', err);
                }

                metadata = {};
                const assign = (
                    k: string,
                    v: string | string[] | undefined
                ) => {
                    if (
                        v !== undefined &&
                        v !== null &&
                        (!(typeof v === 'string') || v.trim() !== '') &&
                        (!Array.isArray(v) || v.length > 0)
                    )
                        Object.assign(metadata, { [k]: v });
                };
                assign('title', book.metadata.title || file.basename);
                assign('author', author);
                assign('publisher', book.metadata.publisher);
                assign('language', book.metadata.language);
                assign('description', book.metadata.description);
                assign('subject', book.metadata.subject);
                assign('date', book.metadata.date);
                assign('identifier', book.metadata.identifier);
                assign('coverUrl', coverUrl);
            }

            await plugin.saveReadingProgress({
                filePath: file.path,
                fileName: file.basename,
                sectionIndex,
                scrollPosition: 0, // TODO: 实现滚动位置跟踪
                lastRead: Date.now(),
                totalSections: book?.sections?.length || 0,
                ...(metadata && { metadata }), // 只在有元数据时添加字段
            });
        }
    };

    useEffect(() => {
        const loadEpub = async () => {
            try {
                setIsLoading(true);

                // 在加载新书前清理旧书遗留的字体与章节样式（如果 viewerRef 仍存在）
                if (viewerRef.current) {
                    try {
                        const container = viewerRef.current.querySelector(
                            '.epub-reader-content'
                        ) as HTMLElement | null;
                        if (container) {
                            // 移除字体样式
                            container
                                .querySelectorAll(
                                    'style[data-epub-fonts="true"]'
                                )
                                .forEach((el) => el.remove());
                            // 移除章节样式
                            container
                                .querySelectorAll(
                                    'style[data-epub-section-style="true"]'
                                )
                                .forEach((el) => el.remove());
                        }
                    } catch {}
                }
                // 重置字体注入标记（新书可以重新注入）
                injectedFontRef.current = false;

                // 使用静态导入的 EPUB

                // 使用 Obsidian API 读取文件

                // 获取 TFile 实例
                // const tfile = app.vault.getFileByPath(filePath);

                if (!file) {
                    throw new Error(`${t('file')} ${t('notFound')}`);
                }

                console.log('open file: ', file);
                // 使用 vault.readBinary 读取二进制文件
                const arrayBuffer = await app.vault.readBinary(file);
                // 创建 ZIP loader（EPUB 文件是 ZIP 格式）
                const {
                    configure,
                    ZipReader,
                    BlobReader,
                    TextWriter,
                    BlobWriter,
                } = await import('foliate-js/vendor/zip.js');
                configure({ useWebWorkers: false });

                // 将 ArrayBuffer 转换为 Blob
                const blob = new Blob([arrayBuffer], {
                    type: 'application/epub+zip',
                });
                const reader = new ZipReader(new BlobReader(blob));
                const entries = await reader.getEntries();
                entriesRef.current = entries;
                const map = new Map(
                    entries.map((entry: ZipEntry) => [entry.filename, entry])
                );

                const loadText = (name: string) => {
                    const entry = map.get(name);
                    if (entry) {
                        return entry.getData(new TextWriter());
                    } else {
                        return null;
                    }
                };

                const loadBlob = (name: string, type?: string) => {
                    const entry = map.get(name);
                    if (entry) {
                        return entry.getData(new BlobWriter(type));
                    } else {
                        return null;
                    }
                };

                const getSize = (name: string) =>
                    (map.get(name) as ZipEntry)?.uncompressedSize ?? 0;

                // 创建 SHA-1 函数（用于解密字体）
                const sha1 = async (data: ArrayBuffer) => {
                    const hashBuffer = await crypto.subtle.digest(
                        'SHA-1',
                        data
                    );
                    return Array.from(new Uint8Array(hashBuffer))
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join('');
                };

                const loader = { entries, loadText, loadBlob, getSize, sha1 };

                // 使用正确的 API 创建 EPUB 实例
                const epubInstance = new EPUB(loader);
                const epub = (await epubInstance.init()) as EpubType;
                setBook(epub);

                // 在EPUB加载完成后立即加载保存的进度
                const progress = plugin.getReadingProgress(file.path);
                if (progress && progress.sectionIndex) {
                    setCurrentSectionIndex(progress.sectionIndex);
                }

                setIsLoading(false);
            } catch (err) {
                console.error('Error loading EPUB:', err);
                setError(
                    `${t('failedToLoadEpub')}${err instanceof Error ? err.message : String(err)}`
                );
                setIsLoading(false);
            }
        };

        if (file && file.path && app) {
            loadEpub();
        }
    }, [file, app]);

    useEffect(() => {
        if (book && viewerRef.current) {
            // 初始化 foliate-js 阅读器
            initializeReader();
        }
    }, [book]);

    // 书籍加载完成或章节索引变化时，若 TOC 视图已打开，则自动切换为当前书籍的目录（静默，不切 tab）
    useTocSync(app, book, currentSectionIndex, (index) => {
        goToSection(index);
    });

    const toggleTOC = async () => {
        if (book && plugin.openEpubTocView) {
            // 确保左侧面板是打开的
            const leftSplit = app.workspace.leftSplit;
            if (leftSplit && leftSplit.collapsed) {
                // 如果左侧面板是关闭的，先打开它
                leftSplit.expand();
            }

            // 打开左侧边栏的目录视图
            await plugin.openEpubTocView(
                book,
                currentSectionIndex,
                (sectionIndex: number) => {
                    // 目录中选择页面的回调
                    goToSection(sectionIndex);
                }
            );
        } else {
            console.warn('无法打开目录：书籍或插件方法不可用');
        }
    };

    // 章节渲染 hook
    const { renderSection } = useRenderSection(
        book,
        viewerRef,
        applyHighlightsForSection,
        plugin.settings.preferBookFont
    );

    // 在每次章节渲染后，抽取 h2.head 作为章节标题，并建立可见性监听
    const updateHeadingTracking = React.useCallback(() => {
        const getScrollRoot = (startEl: Element | null): Element | null => {
            let el: Element | null = startEl as Element | null;
            while (el && el !== document.documentElement) {
                const style = window.getComputedStyle(el as Element);
                const overflowY = style.overflowY;
                const canScrollY =
                    (overflowY === 'auto' || overflowY === 'scroll') &&
                    (el as HTMLElement).scrollHeight >
                        (el as HTMLElement).clientHeight;
                if (canScrollY) return el;
                el = el.parentElement;
            }
            return null; // 回退到视口
        };
        // 清理之前的观察器
        if (headObserverRef.current) {
            headObserverRef.current.disconnect();
            headObserverRef.current = null;
        }
        observedHeadElRef.current = null;

        const container = viewerRef.current?.querySelector(
            '.epub-reader-content'
        ) as HTMLElement | null;
        if (!container) {
            setSectionTitle('');
            setIsHeadVisible(false);
            return;
        }

        const headEl = container.querySelector('h2.head');
        observedHeadElRef.current = headEl;

        if (headEl) {
            const text = (headEl.textContent || '').trim();
            setSectionTitle(text);

            // 寻找就近可滚动祖先作为观察根（root）
            const rootEl =
                getScrollRoot(headEl) || getScrollRoot(container) || null;

            // 先同步计算一次初始可见性，降低闪烁
            try {
                const headRect = headEl.getBoundingClientRect();
                let visible = false;
                if (!rootEl) {
                    const vh =
                        window.innerHeight ||
                        document.documentElement.clientHeight;
                    const vw =
                        window.innerWidth ||
                        document.documentElement.clientWidth;
                    const vRect = {
                        top: 0,
                        left: 0,
                        bottom: vh,
                        right: vw,
                    } as const;
                    visible =
                        headRect.bottom > vRect.top &&
                        headRect.top < vRect.bottom;
                } else {
                    const rRect = rootEl.getBoundingClientRect();
                    visible =
                        headRect.bottom > rRect.top &&
                        headRect.top < rRect.bottom;
                }
                setIsHeadVisible(visible);
            } catch {}

            // 观察该标题是否在可视范围内可见
            const observer = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];
                    setIsHeadVisible(!!entry?.isIntersecting);
                },
                {
                    root: rootEl, // 根据实际滚动根选择容器或视口
                    threshold: [0, 0.01, 1],
                }
            );
            observer.observe(headEl);
            headObserverRef.current = observer;
        } else {
            // 未找到章节内标题，回退为显示头部并使用书名/文件名
            setSectionTitle('');
            setIsHeadVisible(false);
        }
    }, []);

    // 包装 renderSection：渲染后刷新标题与可见性跟踪
    const renderSectionWithUpdate = React.useCallback(
        async (index: number) => {
            await renderSection(index);
            updateHeadingTracking();
        },
        [renderSection, updateHeadingTracking]
    );

    // 导航 hook
    const { goToSection } = useSectionNav(
        app,
        book,
        scrollToTopRef,
        viewerRef,
        renderSectionWithUpdate,
        saveProgress,
        setCurrentSectionIndex
    );

    // 本地 renderSection 已由 useRenderSection 提供

    const [selectedText, setSelectedText] = useState<string>('');
    const [contextHighlight, setContextHighlight] = useState<{
        node: HTMLElement | null;
        sourceFile?: string;
    } | null>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            setSelectedText(selection ? selection.toString().trim() : '');
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener(
                'selectionchange',
                handleSelectionChange
            );
        };
    }, []);

    const goToPrevSection = async () => {
        if (currentSectionIndex > 0) {
            const newIndex = currentSectionIndex - 1;
            await goToSection(newIndex);
        }
    };

    const goToNextSection = async () => {
        if (book?.sections && currentSectionIndex < book.sections.length - 1) {
            const newIndex = currentSectionIndex + 1;
            await goToSection(newIndex);
        }
    };

    const refreshSection = async () => {
        // 使用 obsidian 的 api，重新打开这个 epub
        // if (!file || !(file instanceof TFile)) {
        //     new Notice(`${t('file')} ${t('notFound')}: ${file.path}`);
        //     return;
        // }
        if (file && file.path) {
            // 检查是否已经有这个特定文件的视图打开
            const existingLeaf = app.workspace
                .getLeavesOfType(EPUB_VIEW_TYPE)
                .find((leaf) => {
                    const view = leaf.view as EpubReaderView;
                    return view && view.file?.path === file.path;
                });

            if (existingLeaf) {
                // 如果已经打开了相同文件，就关闭这个视图，然后重新打开
                existingLeaf.detach();
            }

            // 创建新的叶子节点并打开视图
            const leaf = app.workspace.getLeaf('tab');

            // 设置叶子节点的视图类型
            await leaf.setViewState({
                type: EPUB_VIEW_TYPE,
                active: true,
            });

            // 获取创建的视图并设置文件信息
            // const view = leaf.view as EpubReaderView;
            // if (view && view.setFileInfo) {
            //     view.setFileInfo({ filePath: file.path, fileName: file.name });
            // } else {
            //     console.error('视图创建失败或没有 setFileInfo 方法');
            // }
        }
    };

    // 上下文菜单操作函数 - 直接获取当前选中的文本
    const getCurrentSelectedText = () => {
        const selection = window.getSelection();
        return selection ? selection.toString().trim() : '';
    };

    const copyText = () => {
        const selectedText = getCurrentSelectedText();
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
        }
    };

    const searchText = () => {
        const selectedText = getCurrentSelectedText();
        if (selectedText) {
            // 调用 obsidian commands 搜索
            app.commands.executeCommandById('global-search:open');
        }
    };

    // 右键菜单：若针对高亮，解析并缓存目标信息
    const onContainerContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        if (!target) {
            setContextHighlight(null);
            return;
        }
        const hl = target.closest('.epub-highlight') as HTMLElement | null;
        if (hl) {
            const sourceFile = hl.getAttribute('data-source-file');
            if (sourceFile) setContextHighlight({ node: hl, sourceFile });
            else setContextHighlight({ node: hl });
        } else {
            setContextHighlight(null);
        }
    };

    const copyHighlightFileContent = async () => {
        const path = contextHighlight?.sourceFile;
        if (!path) return;
        const f = app.vault.getAbstractFileByPath(path);
        if (f && f instanceof TFile) {
            const content = await app.vault.read(f);
            // 去除文件开头的 YAML frontmatter（如果存在）
            const stripped = (() => {
                // 常见形式：---\n...\n---\n 置于文件最前
                if (content.startsWith('---')) {
                    // 可以通过正则排除frontmatter中包含 --- 的情况
                    const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);

                    if (match) return content.slice(match[0].length);
                }
                // 兼容分隔法：split('---')
                if (content.startsWith('---')) {
                    const parts = content.split(/\n---\s*\n/);
                    if (parts.length > 1) {
                        // parts[0] 仍含起始 '---' 行，截去头两段
                        const after = content.replace(
                            /^---[\s\S]*?\n---\s*\n?/,
                            ''
                        );
                        return after;
                    }
                }
                return content;
            })();
            await navigator.clipboard.writeText(stripped);
            new Notice(t('copiedExcerptFile'));
        } else {
            new Notice(t('excerptFileNotFound'));
        }
    };

    const openHighlightFile = async () => {
        const path = contextHighlight?.sourceFile;
        if (!path) return;
        const f = app.vault.getAbstractFileByPath(path);
        if (f && f instanceof TFile) {
            app.workspace.openLinkText(path, '', false);
        } else {
            new Notice(t('excerptFileNotFound'));
        }
    };

    const unwrapNode = (el: HTMLElement) => {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    };

    const isSingleExcerptNote = (path: string) =>
        /\s摘录\s\d{8}-\d{6}\.md$/i.test(path);

    const deleteHighlightAndFile = async () => {
        const node = contextHighlight?.node;
        const path = contextHighlight?.sourceFile;
        if (!node) return;

        // 先去掉所有同源高亮，保持一致性
        const container = viewerRef.current?.querySelector(
            '.epub-reader-content'
        ) as HTMLElement | null;
        if (container) {
            const escaped =
                window.CSS && typeof window.CSS.escape === 'function'
                    ? window.CSS.escape(path || '')
                    : (path || '').replace(/"/g, '\\"');
            const selector = path
                ? `.epub-highlight[data-source-file="${escaped}"]`
                : '.epub-highlight';
            const all = Array.from(
                container.querySelectorAll(selector)
            ) as HTMLElement[];
            for (const el of all) unwrapNode(el);
        } else {
            unwrapNode(node);
        }

        // 删除摘录文件，仅针对“单摘录文件”安全执行
        if (path) {
            if (!isSingleExcerptNote(path)) {
                new Notice(t('removeHighlightOnly'));
                return;
            }
            const f = app.vault.getAbstractFileByPath(path);
            if (f && f instanceof TFile) {
                try {
                    await app.fileManager.trashFile(f);
                    new Notice(t('deletedExcerptFile'));
                } catch (err) {
                    console.error(t('failedToDeleteExcerptFile'), err);
                    new Notice(t('failedToDeleteExcerptFile'));
                }
            }
        }
    };

    // 立即高亮当前在阅读区域内的选区
    const highlightSelectionInViewer = (targetFilePath?: string) => {
        const container = viewerRef.current?.querySelector(
            '.epub-reader-content'
        ) as HTMLElement | null;
        if (!container) return false;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
        const range = sel.getRangeAt(0);

        // 仅在选区位于阅读容器内时处理
        const isInside = (node: Node | null): boolean => {
            if (!node || !container) return false;
            const el =
                node.nodeType === Node.TEXT_NODE
                    ? (node as Text).parentElement
                    : (node as HTMLElement);
            return !!el && container.contains(el);
        };
        if (!isInside(range.startContainer) || !isInside(range.endContainer))
            return false;

        // 创建统一的 wrapper（附带来源与点击跳转）
        const createWrapper = () => {
            const wrapper = document.createElement('span');
            wrapper.className = 'epub-highlight';
            if (targetFilePath) {
                wrapper.setAttribute('data-source-file', targetFilePath);
                wrapper.onclick = (e) => {
                    e.stopPropagation();
                    const f = app.vault.getAbstractFileByPath(targetFilePath);
                    if (f && f instanceof TFile) {
                        app.workspace.openLinkText(targetFilePath, '', false);
                    }
                };
            }
            return wrapper;
        };

        // 在选区公共祖先下遍历文本节点，按交集拆分包裹，避免跨 block
        const root: Node =
            range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
                ? range.commonAncestorContainer
                : (range.commonAncestorContainer.parentElement ?? container);

        const walker = document.createTreeWalker(
            root as Node,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node: Node) => {
                    if (!node?.nodeValue || !node.nodeValue.trim())
                        return NodeFilter.FILTER_REJECT;
                    // 限定必须在阅读容器内
                    if (!container.contains((node as Text).parentElement!))
                        return NodeFilter.FILTER_REJECT;
                    // 仅处理与选区相交的文本节点
                    try {
                        return range.intersectsNode(node)
                            ? NodeFilter.FILTER_ACCEPT
                            : NodeFilter.FILTER_REJECT;
                    } catch {
                        // 某些环境下 intersectsNode 不存在，退化为范围判断
                        const nodeRange = document.createRange();
                        nodeRange.selectNodeContents(node);
                        const intersects =
                            range.compareBoundaryPoints(
                                Range.END_TO_START,
                                nodeRange
                            ) < 0 &&
                            range.compareBoundaryPoints(
                                Range.START_TO_END,
                                nodeRange
                            ) > 0;
                        nodeRange.detach?.();
                        return intersects
                            ? NodeFilter.FILTER_ACCEPT
                            : NodeFilter.FILTER_REJECT;
                    }
                },
            }
        );

        type Piece = { node: Text; start: number; end: number };
        const pieces: Piece[] = [];
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            let start = 0;
            let end = node.nodeValue!.length;

            if (node === range.startContainer) start = range.startOffset;
            if (node === range.endContainer) end = range.endOffset;

            if (start < end) pieces.push({ node, start, end });
        }

        if (pieces.length === 0) return false;

        // 从后往前拆分替换，避免索引失效
        for (let i = pieces.length - 1; i >= 0; i--) {
            const piece = pieces[i];
            if (!piece) continue;

            const { node, start, end } = piece;
            const text = node.nodeValue || '';
            const before = text.slice(0, start);
            const middle = text.slice(start, end);
            const after = text.slice(end);

            const frag = document.createDocumentFragment();
            if (before) frag.appendChild(document.createTextNode(before));
            const span = createWrapper();
            span.appendChild(document.createTextNode(middle));
            frag.appendChild(span);
            if (after) frag.appendChild(document.createTextNode(after));

            node.parentNode!.replaceChild(frag, node);
        }

        // 清理选区，避免残留蓝色选中态
        try {
            sel.removeAllRanges();
        } catch {}
        return true;
    };

    // 摘录创建文件
    const createNote = async () => {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
            return;
        const range = selection.getRangeAt(0);
        if (!text) return;

        const mode = plugin.settings.excerptStorageMode;
        switch (mode) {
            // 使用日记模式
            case 'daily-note': {
                if (appHasDailyNotesPluginLoaded()) {
                    const date = moment();
                    const allDailyNotes = getAllDailyNotes();
                    let dailyNote = getDailyNote(date, allDailyNotes);
                    const head = `\n- ${date.format('HH:mm')} `;
                    const content = text.split('\n').join('\n    ');
                    const footer = `\n    摘录 · 《${book?.metadata?.title || file.basename}》第${currentSectionIndex + 1}页 #摘录/${book?.metadata?.title || ''}\n`;
                    const appendText = head + content + footer;
                    if (dailyNote) {
                        await app.vault.append(dailyNote, appendText);
                        highlightSelectionInViewer(dailyNote.path);
                        if (plugin.settings.excerptSuccessNotification) {
                            new Notice(
                                `${t('createdExcerpt')}${dailyNote.name}`
                            );
                        }
                    } else {
                        dailyNote = await createDailyNote(date);
                        if (dailyNote) {
                            await app.vault.append(dailyNote, appendText);
                            highlightSelectionInViewer(dailyNote.path);
                            if (plugin.settings.excerptSuccessNotification) {
                                new Notice(
                                    `${t('createdAndAppended')}${dailyNote.name}`
                                );
                            }
                        } else {
                            new Notice(t('failedToCreateExcerpt'));
                        }
                    }
                }
                break;
            }
            // 每个摘录单独一个文件
            case 'per-note': {
                const baseName = file.basename || '摘录';
                const dir = file.path.includes('/')
                    ? file.path.substring(0, file.path.lastIndexOf('/'))
                    : '';
                const date = moment();
                const noteFolderPath = `${dir ? dir + '/' : ''}${baseName}`;
                const noteFileName = `${baseName} 摘录 ${date.format('YYYYMMDD-HHmmss')}.md`;
                const notePath = `${noteFolderPath}/${noteFileName}`;
                const metadata = {
                    book: book?.metadata?.title || baseName,
                    section: currentSectionIndex + 1,
                    date: date.format('YYYY-MM-DD HH:mm'),
                    source: file.basename,
                    range: range,
                    tags: `[摘录, ${book?.metadata?.title || baseName}]`,
                };
                const metaLines = Object.entries(metadata).map(
                    ([key, value]) => `${key}: ${value}`
                );
                const frontMatter = `---\n${metaLines.join('\n')}\n---\n`;
                const content =
                    frontMatter +
                    text +
                    `\n\n> 《${metadata.book}》 · 第${metadata.section}页 #摘录/${metadata.book}\n`;

                try {
                    if (!(await app.vault.adapter.exists(noteFolderPath))) {
                        await app.vault.createFolder(noteFolderPath);
                    }
                    await app.vault.create(notePath, content);
                    highlightSelectionInViewer(notePath);
                    if (plugin.settings.excerptSuccessNotification) {
                        new Notice(`${t('createdExcerpt')}${noteFileName}`);
                    }
                    return notePath;
                } catch (err) {
                    console.error('创建摘录失败:', err);
                    new Notice(t('failedToCreateExcerpt'));
                }
                break;
            }

            case 'per-book': {
                // 构建同目录、同名的 Markdown 文件路径
                const baseName = file.basename || '摘录';
                const dir = file.path.includes('/')
                    ? file.path.substring(0, file.path.lastIndexOf('/'))
                    : '';
                const mdPath = `${dir ? dir + '/' : ''}${baseName}.md`;

                // 生成追加内容（带时间与相关信息）
                const now = new Date();
                const timeStr = `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(
                    2,
                    '0'
                )}-${String(now.getDate()).padStart(2, '0')} ${String(
                    now.getHours()
                ).padStart(
                    2,
                    '0'
                )}:${String(now.getMinutes()).padStart(2, '0')}`;

                const header = `\n\n> [!note] ${book?.metadata?.title} · 第${currentSectionIndex + 1}页 · ${timeStr} \n`;
                const entry = `\n\n> [!note] ${book?.metadata?.title} · 第${currentSectionIndex + 1}页 · ${timeStr} \n> ${text.split('\n').join('\n> ')}\n> #摘录/${book?.metadata?.title}`;

                try {
                    const existing = app.vault.getAbstractFileByPath(mdPath);
                    if (existing && existing instanceof TFile) {
                        await app.vault.append(existing, entry);
                        highlightSelectionInViewer(mdPath);
                        if (plugin.settings.excerptSuccessNotification) {
                            new Notice(`${t('appendToExcerpt')}${baseName}.md`);
                        }
                    } else {
                        await app.vault.create(mdPath, header + entry + '\n');
                        highlightSelectionInViewer(mdPath);
                        if (plugin.settings.excerptSuccessNotification) {
                            new Notice(
                                `${t('createdAndAppended')}${baseName}.md`
                            );
                        }
                    }

                    // 保存映射到 settings（按 filePath 标识该书）
                    const map = plugin.settings.perBookExcerptMap || {};
                    map[file.path] = mdPath;
                    plugin.settings.perBookExcerptMap = map;
                    await plugin.saveSettings();
                } catch (err) {
                    console.error('写入摘录失败:', err);
                    new Notice(t('failedToWriteExcerpt'));
                }
                break;
            }

            case 'single-note': {
                // 使用单一文件收集所有摘录；默认放在库根目录下 _Foliate_摘录.md
                let notePath =
                    plugin.settings.singleExcerptPath || '_Foliate_摘录.md';

                const now = new Date();
                const timeStr = `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2, '0')}-${String(now.getDate()).padStart(
                    2,
                    '0'
                )} ${String(now.getHours()).padStart(2, '0')}:${String(
                    now.getMinutes()
                ).padStart(2, '0')}`;

                const header = `\n\n> [!note] ${book?.metadata?.title} · 第${currentSectionIndex + 1}页 · ${timeStr} \n`;
                const entry = `\n\n> [!note] ${book?.metadata?.title} · 第${currentSectionIndex + 1}页 · ${timeStr} \n> ${text.split('\n').join('\n> ')}\n> #摘录/${book?.metadata?.title}`;

                try {
                    const existing = app.vault.getAbstractFileByPath(notePath);
                    if (existing && existing instanceof TFile) {
                        await app.vault.append(existing, entry);
                        highlightSelectionInViewer(notePath);
                    } else {
                        await app.vault.create(notePath, header + entry + '\n');
                        highlightSelectionInViewer(notePath);
                    }
                    // 持久化路径
                    if (!plugin.settings.singleExcerptPath) {
                        plugin.settings.singleExcerptPath = notePath;
                        await plugin.saveSettings();
                    }
                    if (plugin.settings.excerptSuccessNotification) {
                        new Notice(t('appendedToUnifiedExcerpt'));
                    }
                } catch (err) {
                    console.error('写入摘录失败:', err);
                    new Notice(t('failedToWriteExcerpt'));
                }
                break;
            }
        }
        return;
    };

    const addToQuickCapture = () => {
        const selectedText = getCurrentSelectedText();
        if (selectedText) {
            // 添加到快速捕获（如果有相关插件）
            const quote = `"${selectedText}" - 《${book?.metadata?.title || file.basename}》第${currentSectionIndex + 1}页`;

            // 尝试写入剪贴板，用户可以手动粘贴
            navigator.clipboard.writeText(quote);

            // 显示通知
            new Notice(t('excerptCopiedToClipboard'));
        }
    };

    // 鼠标侧键导航，键盘左右按键导航
    useEffect(() => {
        if (!viewerRef.current) return;

        const readerContainer =
            app.workspace.getActiveViewOfType(EpubReaderView)?.containerEl;
        if (!readerContainer) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 只在阅读器容器内处理
            if (!readerContainer) return;

            // 左箭头 - 上一页
            if (e.key === 'ArrowLeft' && currentSectionIndex > 0) {
                e.preventDefault();
                goToPrevSection();
            }
            // 右箭头 - 下一页
            else if (
                e.key === 'ArrowRight' &&
                book?.sections &&
                currentSectionIndex < book.sections.length - 1
            ) {
                e.preventDefault();
                goToNextSection();
            }
        };

        const handleMouseSideButtons = (e: MouseEvent) => {
            // 只在阅读器容器内处理
            if (!readerContainer.contains(e.target as Node)) return;

            // 阻止默认的浏览器前进/后退
            if (e.button === 3 || e.button === 4) {
                e.preventDefault();
                e.stopPropagation();
            }

            // 侧键后退（通常是左侧键）- 上一页
            if (e.button === 3 && currentSectionIndex > 0) {
                goToPrevSection();
            }
            // 侧键前进（通常是右侧键）- 下一页
            else if (
                e.button === 4 &&
                book?.sections &&
                currentSectionIndex < book.sections.length - 1
            ) {
                goToNextSection();
            }
        };

        // 注册监听器
        const abortController = new AbortController();

        if (plugin.settings.enableKeyboardNavigation) {
            document.addEventListener('keydown', handleKeyDown, {
                capture: true,
                signal: abortController.signal,
            });
        }

        if (plugin.settings.enableMouseSideButtonNavigation) {
            document.addEventListener('mousedown', handleMouseSideButtons, {
                capture: true,
                signal: abortController.signal,
            });

            document.addEventListener('mouseup', handleMouseSideButtons, {
                capture: true,
                signal: abortController.signal,
            });
        }

        // 清理
        return () => {
            abortController.abort();
        };
    }, [currentSectionIndex, book, goToPrevSection, goToNextSection]);

    // 分享 Hook
    const { shareText, isSharing } = useShareSelection({
        app,
        plugin,
        viewerRef,
        book,
        fileName: file.basename,
        currentSectionIndex,
    });

    const initializeReader = async () => {
        if (!book || !viewerRef.current) return;

        try {
            // 清空容器
            viewerRef.current.empty();

            // 防御性清理：确保之前潜在残留的字体/章节样式被移除
            try {
                const staleFont = document.querySelectorAll(
                    '.epub-reader-content style[data-epub-fonts="true"]'
                );
                staleFont.forEach((el) => el.remove());
                const staleSections = document.querySelectorAll(
                    '.epub-reader-content style[data-epub-section-style="true"]'
                );
                staleSections.forEach((el) => el.remove());
            } catch {}

            // 检查是否有内容
            if (!book.sections || book.sections.length === 0) {
                viewerRef.current.empty();
                const errEl = document.body.createDiv({
                    text: t('noEpubContent'),
                });
                viewerRef.current.appendChild(errEl);
                return;
            }

            // 创建简单的阅读器容器
            const readerContainer = document.createElement('div');
            readerContainer.className =
                'epub-reader-content epub-reader-dynamic';

            // 使用 CSS 自定义属性设置样式
            readerContainer.style.setProperty('--epub-width', '100%');
            readerContainer.style.setProperty('--epub-height', '100%');
            readerContainer.style.setProperty(
                '--epub-background',
                'transparent'
            );
            readerContainer.style.setProperty(
                '--epub-color',
                'var(--text-normal)'
            );
            readerContainer.style.setProperty(
                '--epub-font-size',
                `${plugin.settings.fontSize}px`
            );
            readerContainer.style.setProperty(
                '--epub-max-width',
                `${plugin.settings.pageWidth}px`
            );
            readerContainer.style.setProperty('--epub-margin', '0 auto');
            readerContainer.style.setProperty('--epub-position', 'relative');
            readerContainer.style.setProperty(
                '--epub-line-height',
                String(plugin.settings.lineHeight)
            );

            // 字体控制：默认使用 Obsidian 字体变量；当 preferBookFont=true 时不强制指定容器字体，允许书籍 CSS 覆盖
            if (!plugin.settings.preferBookFont) {
                readerContainer.style.setProperty(
                    '--epub-font-family',
                    'var(--font-text)'
                );
            }

            viewerRef.current.appendChild(readerContainer);

            // preferBookFont: 注入 OEBPS/Fonts 内嵌字体（仅一次）
            if (plugin.settings.preferBookFont && !injectedFontRef.current) {
                try {
                    await injectEmbeddedFonts(readerContainer);
                    injectedFontRef.current = true;
                } catch (e) {
                    console.warn('注入内嵌字体失败：', e);
                }
            }

            // 渲染当前页面（可能是从保存的进度恢复的）
            await renderSectionWithUpdate(currentSectionIndex);
        } catch (err) {
            console.error('Error initializing reader:', err);
            if (viewerRef.current) {
                viewerRef.current.empty();
                const errEl = document.body.createDiv({
                    text: t('initFailed'),
                });
                viewerRef.current.appendChild(errEl);
            }
            setError(
                'Failed to initialize EPUB reader: ' +
                    (err instanceof Error ? err.message : String(err))
            );
        }
    };

    // 从 EPUB entries 中扫描 OEBPS/Fonts 下字体并注入
    const injectEmbeddedFonts = async (container: HTMLElement) => {
        if (!book || !entriesRef.current || !entriesRef.current.length) return;
        const fontExt = /\.(ttf|otf|woff2?|woff)$/i;
        const fontEntries = entriesRef.current
            .map((e: ZipEntry) => e.filename)
            .filter(
                (name: string) =>
                    /(^|\/)OEBPS\/(Fonts|fonts)\//.test(name) &&
                    fontExt.test(name)
            );
        if (!fontEntries.length) return;

        const faces: string[] = [];
        for (const path of fontEntries) {
            try {
                const blob = await book.loadBlob?.(path);
                if (!blob) continue;
                const url = URL.createObjectURL(blob);
                const familyBase = path.split('/').pop()!.replace(fontExt, '');
                // 基础猜测：斜体/粗体判断（非常粗略，可后续增强）
                const lower = familyBase.toLowerCase();
                let fontStyle = 'normal';
                let fontWeight = '400';
                if (/(italic|oblique)/i.test(lower)) fontStyle = 'italic';
                if (/bold/i.test(lower)) fontWeight = '700';
                else if (/medium/i.test(lower)) fontWeight = '500';
                else if (/light/i.test(lower)) fontWeight = '300';
                const format = /\.woff2$/i.test(path)
                    ? 'woff2'
                    : /\.woff$/i.test(path)
                      ? 'woff'
                      : /\.otf$/i.test(path)
                        ? 'opentype'
                        : 'truetype';
                faces.push(
                    `@font-face { font-family: "${familyBase}"; src: url('${url}') format('${format}'); font-style: ${fontStyle}; font-weight: ${fontWeight}; font-display: swap; }`
                );
            } catch (e) {
                console.debug('字体加载失败，跳过:', path, e);
            }
        }
        if (!faces.length) return;
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-epub-fonts', 'true');
        styleEl.textContent = faces.join('\n');
        // 注入到阅读容器（不加作用域，让字体可被章节 CSS 正常引用）
        container.prepend(styleEl);
    };

    // 组件卸载时清理观察器
    useEffect(() => {
        return () => {
            if (headObserverRef.current) {
                headObserverRef.current.disconnect();
                headObserverRef.current = null;
            }
            observedHeadElRef.current = null;
        };
    }, []);

    if (isLoading) {
        return (
            <div className="epub-content">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <span className="ml-4 text-lg">{t('loadingEpub')}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="epub-viewer-container">
                <div className="epub-header">
                    <h2 className="text-xl font-bold text-red-500">
                        {t('error')}
                    </h2>
                </div>
                <div className="epub-content">
                    <div className="text-center text-red-500 p-8">
                        <p className="text-lg">{error}</p>
                        <p className="text-sm mt-2">
                            {t('file')}: {file.path}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="epub-viewer-container">
            <div className="epub-viewer-header flex h-(--header-height) items-center justify-center">
                <div
                    className={cn(
                        'epub-header-title flex h-full text-center items-center justify-center',
                        'transition-transform duration-300 ease-out',
                        isHeadVisible
                            ? 'transform -translate-y-full'
                            : 'transform translate-y-0'
                    )}
                >
                    {sectionTitle || book?.metadata?.title || file.basename}
                </div>
                <div className="epub-header-controls">
                    <button className="foliate-button" onClick={toggleTOC}>
                        {t('toc')}
                    </button>
                    <button
                        className="foliate-button"
                        onClick={goToPrevSection}
                        disabled={currentSectionIndex === 0}
                    >
                        {t('prevPage')}
                    </button>
                    <button
                        className="foliate-button"
                        onClick={goToNextSection}
                        disabled={
                            !book?.sections ||
                            currentSectionIndex >= book.sections.length - 1
                        }
                    >
                        {t('nextPage')}
                    </button>
                </div>
            </div>

            <div ref={scrollToTopRef} className="epub-content h-full">
                {/* foliate-js 渲染区域 */}
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div
                            ref={viewerRef}
                            className="epub-reader-container h-full select-text relative"
                            onContextMenu={onContainerContextMenu}
                        >
                            {!book && (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-gray-500">
                                        {t('waitingForEpub')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-42">
                        {!selectedText && !contextHighlight && (
                            <>
                                <ContextMenuGroup className="flex justify-evenly items-center">
                                    <ContextMenuItem
                                        title={t('prevPage')}
                                        onClick={goToPrevSection}
                                        disabled={currentSectionIndex === 0}
                                    >
                                        <ArrowLeft />
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        title={t('nextPage')}
                                        onClick={goToNextSection}
                                        disabled={
                                            currentSectionIndex ===
                                            (book?.sections.length || 1) - 1
                                        }
                                    >
                                        <ArrowRight />
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        title={t('jumpToToc')}
                                        onClick={toggleTOC}
                                        disabled={!book?.toc}
                                    >
                                        <List />
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        title={t('refresh')}
                                        onClick={refreshSection}
                                    >
                                        <RefreshCcw />
                                    </ContextMenuItem>
                                </ContextMenuGroup>
                                <ContextMenuSeparator />
                            </>
                        )}
                        {!contextHighlight && (
                            <>
                                <ContextMenuItem
                                    onClick={copyText}
                                    disabled={
                                        !selectedText ||
                                        selectedText.length === 0
                                    }
                                >
                                    <Copy /> {t('copyText')}
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={addToQuickCapture}
                                    disabled={
                                        !selectedText ||
                                        selectedText.length === 0
                                    }
                                >
                                    <Quote /> {t('copyWithQuote')}
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={createNote}
                                    disabled={
                                        !selectedText ||
                                        selectedText.length === 0
                                    }
                                >
                                    <FileText /> {t('excerpt')}
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={async () => {
                                        const notePath = await createNote();
                                        if (notePath) {
                                            // 稍后打开新建的摘录文件
                                            const noteFile =
                                                app.vault.getFileByPath(
                                                    notePath
                                                );
                                            if (noteFile) {
                                                const leaf =
                                                    app.workspace.openPopoutLeaf();
                                                await leaf.openFile(noteFile);
                                            }
                                        }
                                    }}
                                    disabled={
                                        !selectedText ||
                                        selectedText.length === 0
                                    }
                                >
                                    <SquarePen /> {t('excerptAndOpen')}
                                </ContextMenuItem>
                            </>
                        )}
                        {contextHighlight && (
                            <>
                                <ContextMenuItem
                                    onClick={copyHighlightFileContent}
                                    disabled={!contextHighlight.sourceFile}
                                >
                                    <Copy /> {t('copyExcerpt')}
                                </ContextMenuItem>
                                <ContextMenuItem
                                    onClick={openHighlightFile}
                                    disabled={!contextHighlight.sourceFile}
                                >
                                    <ExternalLink /> {t('openFile')}
                                </ContextMenuItem>
                            </>
                        )}

                        {/* 分享：生成分享卡片 */}
                        <ContextMenuSub>
                            <ContextMenuSubTrigger
                                disabled={
                                    isSharing ||
                                    (!selectedText && !contextHighlight)
                                }
                            >
                                <Share />{' '}
                                {isSharing
                                    ? t('sharing')
                                    : selectedText
                                      ? t('shareText')
                                      : t('shareExcerpt')}
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-38">
                                {[
                                    {
                                        key: 'classic',
                                        value: t('style_classic'),
                                    },
                                    {
                                        key: 'minimal',
                                        value: t('style_minimal'),
                                    },
                                    {
                                        key: 'image-left',
                                        value: t('style_image_left'),
                                    },
                                ].map(({ key, value }) => (
                                    <ContextMenuItem
                                        key={key}
                                        onClick={async () => {
                                            let text = selectedText;
                                            if (text) {
                                                shareText(
                                                    text,
                                                    key as ShareStyle
                                                );
                                            } else if (
                                                contextHighlight &&
                                                contextHighlight.sourceFile
                                            ) {
                                                text = await app.vault.adapter
                                                    .read(
                                                        contextHighlight.sourceFile
                                                    )
                                                    .then((content) => {
                                                        if (
                                                            content.startsWith(
                                                                '---'
                                                            )
                                                        ) {
                                                            return content
                                                                .replace(
                                                                    /^---[\s\S]*?\n---\s*\n?/,
                                                                    ''
                                                                )
                                                                .trim();
                                                        } else {
                                                            return content.trim();
                                                        }
                                                    });

                                                if (text)
                                                    shareText(
                                                        text,
                                                        key as ShareStyle
                                                    );
                                            } else {
                                                new Notice(
                                                    t('noShareableContent')
                                                );
                                                return;
                                            }
                                        }}
                                    >
                                        {value}
                                    </ContextMenuItem>
                                ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>

                        {selectedText && (
                            <ContextMenuItem
                                onClick={searchText}
                                disabled={
                                    !selectedText || selectedText.length === 0
                                }
                            >
                                <Search /> {t('searchInVault')}
                            </ContextMenuItem>
                        )}
                        {contextHighlight && (
                            <ContextMenuItem
                                onClick={deleteHighlightAndFile}
                                disabled={
                                    !contextHighlight.sourceFile ||
                                    !isSingleExcerptNote(
                                        contextHighlight.sourceFile
                                    )
                                }
                                variant="destructive"
                            >
                                <Trash2 /> {t('deleteExcerpt')}
                            </ContextMenuItem>
                        )}
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        </div>
    );
};

export default EpubViewer;
