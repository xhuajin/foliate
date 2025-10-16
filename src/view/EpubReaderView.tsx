import { FileView, TFile, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import EpubViewer from './EpubViewer';
import type FoliatePlugin from '../main';
import { t } from '@/lang/helpers';

export const EPUB_FILE_EXTENSION = 'epub';
export const EPUB_VIEW_TYPE = 'epub-reader-view';

export class EpubReaderView extends FileView {
    private root: Root | null = null;
    public plugin: FoliatePlugin;
    private isClosing: boolean = false;
    override navigation: boolean = true;

    constructor(leaf: WorkspaceLeaf, plugin: FoliatePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.app = plugin.app;
    }

    // 添加方法来设置文件信息
    // setFileInfo({
    //     file,
    //     filePath,
    //     fileName,
    // }: {
    //     file?: TFile | null;
    //     filePath?: string;
    //     fileName?: string;
    // }): void {
    //     const oldFileName = this.fileName;
    //     this.filePath = filePath || this.filePath;
    //     this.fileName = fileName || this.extractFileName(this.filePath);
    //     this.file = file || this.file;

    //     // 如果文件名改变了，重新设置视图状态以触发标题更新
    //     if (oldFileName !== this.fileName) {
    //         // 通过设置新的视图状态来触发Obsidian更新标题
    //         this.leaf.setViewState({
    //             type: EPUB_VIEW_TYPE,
    //             state: { file: this.file },
    //             active: true,
    //         });
    //     }

    //     // 如果视图已经打开，重新渲染
    //     if (this.root) {
    //         this.renderComponent();
    //     }
    // }

    private renderComponent(): void {
        if (!this.root || !this.file) return;
        // 渲染 Editor 组件
        this.root.render(
            React.createElement(EpubViewer, {
                file: this.file,
                app: this.app,
                plugin: this.plugin,
            })
        );
    }

    getViewType(): string {
        return EPUB_VIEW_TYPE;
    }

    override getDisplayText() {
        if (this.file) {
            return this.file.basename;
        } else {
            return 'No File';
        }
    }

    override getIcon(): string {
        return 'book-open';
    }

    // 处理视图状态变化
    override async setState(
        state: {
            file?: TFile | null;
            filePath?: string;
            fileName?: string;
        } | null,
        result: ViewStateResult
    ): Promise<void> {
        // 如果传入的state包含空文件路径，但我们已经有文件信息，就不要覆盖
        if (state && state.file instanceof TFile) {
            // this.filePath = state.filePath || this.filePath;
            // this.fileName =
            //     state.fileName || this.extractFileName(this.filePath);
            this.file = state.file || this.file;

            // 如果组件已经渲染，重新渲染
            if (this.root) {
                this.renderComponent();
            }
        }

        return super.setState(state, result);
    }

    override getState() {
        const state = super.getState();
        return {
            ...state,
            file: this.file,
        };
    }

    override async onLoadFile(file: TFile): Promise<void> {
        this.file = file;
        this.contentEl.empty();
        // 创建 React 根容器
        this.root = createRoot(this.contentEl as HTMLElement);
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

    override canAcceptExtension(extension: string) {
        return extension == EPUB_FILE_EXTENSION;
    }

    override async onunload(): Promise<void> {
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
