import { FileView, TFile, ViewStateResult, WorkspaceLeaf } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import FoliateView from './FoliateView';
import type FoliatePlugin from '../main';

export const EPUB_FILE_EXTENSION = 'epub';
export const EPUB_VIEW_TYPE = 'epub-reader-view';

export class EpubView extends FileView {
    private root: Root | null = null;
    public plugin: FoliatePlugin;
    private isClosing: boolean = false;
    override navigation: boolean = true;

    constructor(leaf: WorkspaceLeaf, plugin: FoliatePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.app = plugin.app;
    }

    private renderComponent(): void {
        if (!this.root || !this.file) return;
        // 渲染 Editor 组件
        this.root.render(
            React.createElement(FoliateView, {
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
        state: { file?: TFile | null },
        result: ViewStateResult
    ): Promise<void> {
        // 如果传入的state包含空文件路径，但我们已经有文件信息，就不要覆盖
        if (state && state.file && state.file.extension === 'epub') {
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
