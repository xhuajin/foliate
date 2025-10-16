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
    override allowNoFile: boolean = true;
    override navigation: boolean = true;

    constructor(leaf: WorkspaceLeaf, plugin: FoliatePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.app = plugin.app;
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

    override getState() {
        const state = super.getState();
        return {
            ...state,
            file: this.file?.path || null,
        };
    }
    // 处理视图状态变化
    // state 存储的 file 只能是 file path string
    override async setState(
        state: { file?: string | null },
        result: ViewStateResult
    ): Promise<void> {
        // 如果传入的state包含空文件路径，但我们已经有文件信息，就不要覆盖
        if (state && state.file) {
            const file = this.app.vault.getAbstractFileByPath(state.file);
            if (
                file &&
                file instanceof TFile &&
                file.extension === EPUB_FILE_EXTENSION
            ) {
                // 如果组件已经渲染，重新渲染
                await this.renderComponent(file);
            }
        }

        return super.setState(state, result);
    }

    override async onOpen(): Promise<void> {
        this.isClosing = false;
        this.root = createRoot(this.contentEl as HTMLElement);
    }

    override async onLoadFile(file: TFile): Promise<void> {
        await this.renderComponent(file);
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

    private async renderComponent(file: TFile): Promise<void> {
        this.file = file;
        if (!this.root) return;
        // 渲染 Editor 组件
        this.root.render(
            React.createElement(FoliateView, {
                file: this.file,
                app: this.app,
                plugin: this.plugin,
            })
        );
    }
}
