import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import EpubViewer from './EpubViewer';
import type ReadItPlugin from '../main';

export const EPUB_VIEW_TYPE = 'epub-reader-view';

export class EpubReaderView extends ItemView {
    private root: Root | null = null;
    private filePath: string;
    private fileName: string;
    public file: { path: string } | null = null;
    private isClosing: boolean = false;
    private plugin: ReadItPlugin;

    constructor(
        leaf: WorkspaceLeaf,
        plugin: ReadItPlugin,
        filePath: string = '',
        fileName: string = ''
    ) {
        super(leaf);
        this.plugin = plugin;
        // 尝试从 leaf 的状态中获取文件信息
        const viewState = leaf.getViewState();
        if (
            viewState &&
            viewState.state &&
            typeof viewState.state === 'object' &&
            'file' in viewState.state
        ) {
            const fileFromState = (viewState.state as any).file;
            if (
                typeof fileFromState === 'string' &&
                fileFromState.trim() !== ''
            ) {
                this.filePath = fileFromState;
                this.fileName = this.extractFileName(fileFromState);
            } else {
                this.filePath = filePath;
                this.fileName = fileName || this.extractFileName(filePath);
            }
        } else {
            this.filePath = filePath;
            this.fileName = fileName || this.extractFileName(filePath);
        }

        this.file = this.filePath ? { path: this.filePath } : null;
    }

    // 从文件路径提取文件名的辅助方法
    private extractFileName(filePath: string): string {
        if (!filePath || filePath.trim() === '') {
            return '';
        }
        const pathParts = filePath.split(/[/\\]/);
        return pathParts[pathParts.length - 1] || '';
    }

    // 添加方法来设置文件信息
    setFileInfo(filePath: string, fileName: string): void {
        const oldFileName = this.fileName;
        this.filePath = filePath;
        this.fileName = fileName || this.extractFileName(filePath);
        this.file = { path: filePath };

        // 如果文件名改变了，重新设置视图状态以触发标题更新
        if (oldFileName !== this.fileName) {
            // 通过设置新的视图状态来触发Obsidian更新标题
            this.leaf.setViewState({
                type: EPUB_VIEW_TYPE,
                state: { file: filePath },
                active: true,
            });
        }

        // 如果视图已经打开，重新渲染
        if (this.root) {
            this.renderComponent();
        }
    }

    private renderComponent(): void {
        if (!this.root) return;
        // 渲染 Editor 组件
        this.root.render(
            React.createElement(EpubViewer, {
                filePath: this.filePath,
                fileName: this.fileName,
                app: this.app,
                plugin: this.plugin,
            })
        );
    }

    getViewType(): string {
        return EPUB_VIEW_TYPE;
    }

    getDisplayText(): string {
        return `${this.fileName.split('.epub')[0]}`;
    }

    override getIcon(): string {
        return 'book-open';
    }

    // 处理视图状态变化
    override async setState(state: any, result: any): Promise<void> {
        // 如果传入的state包含空文件路径，但我们已经有文件信息，就不要覆盖
        if (state && typeof state.file === 'string') {
            if (state.file && state.file.trim() !== '') {
                this.filePath = state.file;
                this.fileName = this.extractFileName(state.file);
                this.file = { path: state.file };

                // 如果组件已经渲染，重新渲染
                if (this.root) {
                    this.renderComponent();
                }
            } else if (state.file === '' && this.filePath !== '') {
                // 不做任何操作，保持现有的文件信息
                return super.setState(state, result);
            } else {
                console.log('从 setState 获取到文件路径:', state.file);
            }
        }

        return super.setState(state, result);
    }

    override getState(): any {
        const state = super.getState();
        return {
            ...state,
            file: this.filePath,
        };
    }

    override async onOpen(): Promise<void> {
        // 如果没有文件路径，尝试从应用程序状态获取
        if (!this.filePath) {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && activeFile.extension === 'epub') {
                this.filePath = activeFile.path;
                this.fileName = activeFile.name;
                this.file = { path: activeFile.path };
            } else {
                // 尝试查找最近访问的EPUB文件
                const epubFiles = this.app.vault
                    .getFiles()
                    .filter((f) => f.extension === 'epub');
                if (epubFiles.length > 0 && epubFiles[0]) {
                    this.filePath = epubFiles[0].path;
                    this.fileName = epubFiles[0].name;
                    this.file = { path: epubFiles[0].path };
                } else {
                    console.log('没有找到任何EPUB文件');
                }
            }
        }

        // 确保文件名不为空
        if (!this.fileName && this.filePath) {
            this.fileName = this.extractFileName(this.filePath);
        }

        const container = this.containerEl.children[1];
        if (!container) {
            console.error('容器元素未找到');
            return;
        }

        container.empty();
        // 创建 React 根容器
        this.root = createRoot(container as HTMLElement);
        // 渲染 React 组件 - 使用 React.createElement 语法
        this.renderComponent();
    }

    override async onClose(): Promise<void> {
        // 防止重复调用
        if (this.isClosing) return;
        this.isClosing = true;

        // 清理 React 组件
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
    }

    // private handleClose(): void {
    //     // 防止重复调用
    //     if (this.isClosing) return;
    //     this.isClosing = true;

    //     // 先清理 React 组件，然后关闭视图
    //     if (this.root) {
    //         this.root.unmount();
    //         this.root = null;
    //     }
    //     // 关闭当前视图
    //     this.leaf.detach();
    // }
}
