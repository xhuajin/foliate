import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import { createElement, useEffect, useMemo } from 'react';
import type ReadItPlugin from '../main';

import { useTree } from '@headless-tree/react';
import { Tree, TreeItem, TreeItemLabel } from '../components/ui/tree';
import {
    hotkeysCoreFeature,
    syncDataLoaderFeature,
    expandAllFeature,
} from '@headless-tree/core';
import { cn } from '../lib/utils';
import { ChevronsDownUp, ChevronsUpDown, Focus } from 'lucide-react';

export const EPUB_TOC_VIEW_TYPE = 'epub-toc-view';

interface BookItem {
    href: string | undefined;
    label: string | undefined;
    subitems: BookItem[] | undefined;
}

interface TocItem {
    id: string;
    href: string;
    label: string;
    // 父节点ID（用于快速查找路径）
    parentId?: string | undefined;
    // 子章节ID列表（用于扁平化存储）
    childrenIds?: string[] | undefined;
    level: number | 0;
}

// TOC 组件属性
interface EpubTocProps {
    book: any;
    tocItems: Record<string, TocItem>;
    currentSectionIndex: number;
    onSectionSelect: (sectionIndex: number) => void;
    plugin: ReadItPlugin;
}

// TOC 组件属性
interface EpubTocProps {
    book: any;
    currentSectionIndex: number;
    onSectionSelect: (sectionIndex: number) => void;
    plugin: ReadItPlugin;
}

// React TOC 组件
const EpubToc: React.FC<EpubTocProps> = ({
    book,
    tocItems,
    currentSectionIndex,
    onSectionSelect,
}) => {
    const indent = 20;

    // 统一处理 href 的工具方法：去掉 hash/query，并规范化相对前缀
    const stripFragmentAndQuery = (href?: string): string => {
        if (!href) return '';
        const noHash = href.split('#')[0] ?? '';
        const noQuery = noHash.split('?')[0] ?? '';
        return noQuery;
    };

    const normalizeHref = (href?: string): string => {
        const base = stripFragmentAndQuery(href);
        // 去除开头的 ./
        return base.replace(/^\.\//, '');
    };

    const hrefMatches = (a?: string, b?: string): boolean => {
        const na = normalizeHref(a);
        const nb = normalizeHref(b);
        if (!na || !nb) return false;
        return na === nb || na.endsWith(nb) || nb.endsWith(na);
    };

    // 获取当前章节对应的TOC项（性能优化：只计算一次）
    const currentTocItem = useMemo(() => {
        if (!book?.sections || currentSectionIndex < 0) return null;

        const currentSection = book.sections[currentSectionIndex];
        if (!currentSection) return null;

        // 通过href匹配找到对应的TOC项
        return (
            Object.values(tocItems).find(
                (tocItem) =>
                    hrefMatches(tocItem.href, currentSection.href) ||
                    hrefMatches(tocItem.href, currentSection.id) ||
                    hrefMatches(tocItem.href, currentSection.src)
            ) || null
        );
    }, [book, tocItems, currentSectionIndex]);

    // 自动滚动到当前项
    useEffect(() => {
        if (currentTocItem) {
            // 使用 setTimeout 确保 DOM 已更新
            setTimeout(() => {
                const currentElement =
                    document.querySelector('.current-toc-item');
                if (currentElement) {
                    currentElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
            }, 100);
        }
    }, [currentTocItem, currentSectionIndex]);

    if (!book) {
        return (
            <div className="toc-empty-state">
                <p>没有加载的书籍</p>
                <p className="text-xs">等待书籍数据...</p>
            </div>
        );
    }

    if (!book.toc) {
        return (
            <div className="toc-empty-state">
                <p>书籍没有目录数据</p>
                <p className="text-xs">book.toc 为空</p>
            </div>
        );
    }

    if (!tocItems || Object.keys(tocItems).length === 0) {
        return (
            <div className="toc-empty-state">
                <p>没有找到目录信息</p>
                <p className="text-xs">处理后的目录为空</p>
                <p className="text-xs">原始目录项数: {book.toc?.length || 0}</p>
            </div>
        );
    }

    // 使用parentId快速构建到根节点的路径
    const getPathToRoot = (itemId: string): string[] => {
        const path: string[] = [];
        let currentId: string | undefined = itemId;

        while (currentId) {
            const currentItem: TocItem | undefined = tocItems[currentId];
            if (!currentItem) break;

            path.unshift(currentId); // 添加到数组开头
            currentId = currentItem.parentId;
        }

        return path;
    };

    // 获取需要展开的项目列表
    const getExpandedItems = (): string[] => {
        if (!currentTocItem) {
            // 如果找不到当前项，只展开根节点
            return ['root'];
        }

        const pathToRoot = getPathToRoot(currentTocItem.id);

        // 展开路径上的所有父级项（不包括当前项本身，除非它有子项）
        const expandedItems = pathToRoot.slice(0, -1);

        // 如果当前项有子项，也展开它
        if (
            currentTocItem.childrenIds &&
            currentTocItem.childrenIds.length > 0
        ) {
            expandedItems.push(currentTocItem.id);
        }

        return expandedItems;
    };

    const handleTocItemClick = (tocItem: TocItem) => {
        if (tocItem.href && book?.sections) {
            // 去除锚点/查询字符串后进行匹配
            const targetHref = normalizeHref(tocItem.href);

            // 尝试找到对应的章节索引（考虑 href/id/src 与 endsWith 退化匹配）
            const sectionIndex = book.sections.findIndex(
                (section: any) =>
                    hrefMatches(section.href, targetHref) ||
                    hrefMatches(section.id, targetHref) ||
                    hrefMatches(section.src, targetHref)
            );

            if (sectionIndex >= 0) {
                onSectionSelect(sectionIndex);
            } else {
                console.warn('Could not find section for:', tocItem.href);
            }
        }
    };

    const tree = useTree<TocItem>({
        initialState: {
            expandedItems: getExpandedItems(),
        },
        indent,
        rootItemId: 'root',
        getItemName: (item) => item.getItemData().label || '未命名章节',
        isItemFolder: (item) =>
            (item.getItemData()?.childrenIds?.length ?? 0) > 0,
        dataLoader: {
            // 返回安全的兜底，避免 undefined 触发 Headless Tree 报错
            getItem: (itemId) =>
                tocItems[itemId] ?? {
                    id: itemId,
                    href: '',
                    label: '未知',
                    level: 0,
                    childrenIds: [],
                },
            getChildren: (itemId) => tocItems[itemId]?.childrenIds || [],
        },
        features: [syncDataLoaderFeature, hotkeysCoreFeature, expandAllFeature],
    });

    return (
        <div className="epub-toc-container">
            <div className="toc-toolbar">
                <div
                    className="toc-btn clickable-icon nav-action-button"
                    onClick={() => tree.collapseAll()}
                    title="折叠所有"
                >
                    <ChevronsDownUp size={18} />
                </div>
                <div
                    className="toc-btn clickable-icon nav-action-button"
                    onClick={() => tree.expandAll()}
                    title="展开所有"
                >
                    <ChevronsUpDown size={18} />
                </div>
                <div
                    className={cn(
                        'toc-btn clickable-icon nav-action-button',
                        !currentTocItem ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                    onClick={() => {
                        if (currentTocItem) {
                            // 首先展开到当前项的路径
                            const pathToRoot = getPathToRoot(currentTocItem.id);
                            // 展开路径上的所有父级项
                            const expandedItems = pathToRoot.slice(0, -1); // 不包括当前项本身

                            // 更新展开状态
                            tree.applySubStateUpdate(
                                'expandedItems',
                                expandedItems
                            );
                            tree.rebuildTree();

                            // 等待DOM更新后再滚动
                            setTimeout(() => {
                                const currentElement =
                                    document.querySelector('.current-toc-item');
                                if (currentElement) {
                                    currentElement.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center',
                                    });
                                }
                            }, 150); // 增加延迟确保DOM重建完成
                        }
                    }}
                    title="聚焦当前章节"
                >
                    <Focus size={18} />
                </div>
            </div>

            {/* <div className="toc-header">
                {book?.metadata?.title && <h3>{book.metadata.title}</h3>}
            </div> */}

            <div className="toc-content">
                <Tree
                    className="relative before:absolute before:inset-0 before:-ms-1 "
                    indent={indent}
                    tree={tree}
                >
                    {tree.getItems().map((item) => {
                        const itemData = item.getItemData();
                        const isCurrentItem =
                            currentTocItem && currentTocItem.id === itemData.id;

                        return (
                            <TreeItem
                                key={item.getId()}
                                item={item}
                                className={
                                    isCurrentItem
                                        ? 'current-toc-item'
                                        : undefined
                                }
                            >
                                <TreeItemLabel
                                    className={cn(
                                        'hover:bg-(--nav-item-background-hover) hover:text-(--nav-item-color-hover) transition-all duration-150',
                                        'before:bg-background relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10 cursor-pointer',
                                        'py-[3px]',
                                        isCurrentItem
                                            ? 'bg-(--nav-item-background-active) text-(--nav-item-color-active)'
                                            : ''
                                    )}
                                    onClick={() => handleTocItemClick(itemData)}
                                />
                            </TreeItem>
                        );
                    })}
                </Tree>
            </div>
            <div className="toc-footer">
                {book?.sections && (
                    <p>
                        当前: {currentSectionIndex + 1} / {book.sections.length}
                    </p>
                )}
            </div>
        </div>
    );
};

// Obsidian 视图类
export class EpubTocView extends ItemView {
    private root: Root | null = null;
    private plugin: ReadItPlugin;
    private book: any = null;
    private currentSectionIndex: number = 0;
    private onSectionSelect: ((sectionIndex: number) => void) | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ReadItPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return EPUB_TOC_VIEW_TYPE;
    }

    getDisplayText(): string {
        return '目录';
    }

    override getIcon(): string {
        return 'list';
    }

    // 设置书籍数据和回调
    setBookData(
        book: any,
        currentSectionIndex: number,
        onSectionSelect: (sectionIndex: number) => void
    ): void {
        this.book = book;
        this.currentSectionIndex = currentSectionIndex;
        this.onSectionSelect = onSectionSelect;

        if (this.root) {
            this.renderComponent();
        }
    }

    // 更新当前章节索引（不重新渲染整个组件）
    updateCurrentSection(sectionIndex: number): void {
        this.currentSectionIndex = sectionIndex;
        if (this.root) {
            this.renderComponent();
        }
    }

    private renderComponent(): void {
        if (!this.root) return;
        let tocItems: Record<string, TocItem> | null = null;

        if (this.book && this.book.toc) {
            // 扁平化存储所有节点
            const flatItems: Record<string, TocItem> = {};
            const rootChildren: string[] = [];

            const processTocItem = (
                item: BookItem,
                level = 0,
                parentId?: string
            ): string => {
                // 使用 href 或 label 作为 ID，确保唯一性
                const id =
                    item.href ||
                    item.label ||
                    Math.random().toString(36).substr(2, 9);

                // 先处理子项，获取子项ID列表
                const childIds: string[] = [];
                if (item.subitems && item.subitems.length > 0) {
                    item.subitems.forEach((subitem) => {
                        const childId = processTocItem(subitem, level + 1, id);
                        childIds.push(childId);
                    });
                }

                // 创建当前项，添加parentId
                const tocItem: TocItem = {
                    id,
                    href: item.href || '',
                    label: item.label || '未命名',
                    level,
                    parentId,
                    childrenIds: childIds.length > 0 ? childIds : undefined,
                };

                // 存储到扁平化记录中
                flatItems[id] = tocItem;

                return id;
            };

            // 处理顶级项目
            this.book.toc.forEach((item: BookItem) => {
                const itemId = processTocItem(item, 0, 'root'); // 顶级项的父级是root
                rootChildren.push(itemId);
            });

            // 创建虚拟根节点
            const rootItem: TocItem = {
                id: 'root',
                href: '',
                label: this.book?.metadata?.title || '目录',
                level: -1,
                parentId: undefined, // 根节点没有父级
                childrenIds: rootChildren,
            };

            tocItems = {
                root: rootItem,
                ...flatItems,
            };
        }

        if (!tocItems) {
            return;
        }

        const key =
            this.book?.metadata?.identifier ||
            this.book?.metadata?.title ||
            this.book?.sections?.[0]?.href ||
            'toc';

        this.root.render(
            createElement(EpubToc, {
                key,
                book: this.book,
                tocItems,
                currentSectionIndex: this.currentSectionIndex,
                onSectionSelect: this.onSectionSelect || (() => {}),
                plugin: this.plugin,
            })
        );
    }

    override async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('epub-toc-view-container');

        this.root = createRoot(container);
        this.renderComponent();
    }

    override async onClose(): Promise<void> {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }
}
