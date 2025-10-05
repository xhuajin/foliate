import { App, Modal, Notice, Setting } from 'obsidian';

type Actions = {
    onDownload: () => Promise<void>;
    onCopy: () => Promise<void>;
};

export class SharePreviewModal extends Modal {
    private cardEl: HTMLElement;
    private previewEl: HTMLElement | null = null;
    private actions: Actions;
    private processing = false;
    private titleText: string;
    private cleanup: (() => void) | undefined;

    // style switching
    private styleKey: string;
    private onChangeStyle: ((style: string) => HTMLElement) | undefined;
    private currentWidth: number | undefined;

    constructor(
        app: App,
        opts: {
            cardEl: HTMLElement;
            title?: string;
            cleanup?: () => void;
            styleKey?: string; // initial style key
            onChangeStyle?: (style: string) => HTMLElement; // returns new card element (already attached in DOM)
        } & Actions
    ) {
        super(app);
        this.cardEl = opts.cardEl;
        this.actions = { onDownload: opts.onDownload, onCopy: opts.onCopy };
        this.titleText = opts.title || '分享预览';
        this.cleanup = opts.cleanup;
        this.styleKey = opts.styleKey || 'classic';
        this.onChangeStyle = opts.onChangeStyle;
    }

    override onOpen(): void {
        const { modalEl, contentEl } = this;
        contentEl.empty();
        modalEl.classList.add('foliate-modal-content');
        contentEl.addClass('foliate-share-modal');

        new Setting(contentEl).setName(this.titleText).setHeading();
        // 宽度控制：同时作用于预览容器与真实截图节点
        const initialWidth = 500;
        this.currentWidth = initialWidth;
        new Setting(contentEl).setName('宽度').addSlider((slider) => {
            slider
                .setLimits(300, 1000, 10)
                .setValue(initialWidth)
                .setDynamicTooltip()
                .onChange((value) => {
                    this.currentWidth = value;
                    // 预览容器
                    if (this.previewEl) {
                        this.previewEl.style.width = `${value}px`;
                        this.previewEl.style.maxWidth = `${value}px`;
                    }
                    // 真实截图节点
                    this.cardEl.style.width = `${value}px`;
                    this.cardEl.style.maxWidth = `${value}px`;
                });
        });
        new Setting(contentEl).setName('样式').addDropdown((dropdown) => {
            dropdown
                .addOptions({
                    classic: '经典样式',
                    minimal: '极简样式',
                    'image-left': '左图右文',
                })
                .setValue(this.styleKey)
                .onChange((val) => {
                    if (this.onChangeStyle) {
                        const newCard = this.onChangeStyle(val);
                        // 更新样式key
                        this.styleKey = val;
                        this.cardEl = newCard;
                        // 维持当前宽度到新的真实节点
                        if (this.currentWidth) {
                            this.cardEl.style.width = `${this.currentWidth}px`;
                            this.cardEl.style.maxWidth = `${this.currentWidth}px`;
                        }
                        // 更新预览
                        body.empty();
                        const cloned = newCard.cloneNode(true) as HTMLElement;
                        this.previewEl = cloned;
                        body.appendChild(cloned);
                    }
                });
        });

        const body = contentEl.createEl('div', { cls: 'foliate-share-body' });
        // 放入卡片的克隆，避免引用外部节点
        this.previewEl = this.cardEl.cloneNode(true) as HTMLElement;
        body.appendChild(this.previewEl);
        // 初始化：让预览容器宽度与真实卡片对齐
        this.previewEl.style.width = `${initialWidth}px`;
        this.previewEl.style.maxWidth = `${initialWidth}px`;

        const footer = contentEl.createEl('div', {
            cls: 'foliate-share-footer',
        });

        const downloadBtn = footer.createEl('button', {
            text: '下载图片',
            cls: 'mod-cta',
        });
        const copyBtn = footer.createEl('button', { text: '复制到剪贴板' });

        const setBusy = (v: boolean) => {
            this.processing = v;
            downloadBtn.disabled = v;
            copyBtn.disabled = v;
            downloadBtn.textContent = v ? '处理中…' : '下载图片';
        };

        downloadBtn.addEventListener('click', async () => {
            if (this.processing) return;
            try {
                setBusy(true);
                await this.actions.onDownload();
                new Notice('已下载图片');
            } catch (e) {
                console.error(e);
                new Notice('下载失败');
            } finally {
                setBusy(false);
            }
        });

        copyBtn.addEventListener('click', async () => {
            if (this.processing) return;
            try {
                setBusy(true);
                await this.actions.onCopy();
                new Notice('已复制图片到剪贴板');
            } catch (e) {
                console.error(e);
                new Notice('复制失败');
            } finally {
                setBusy(false);
            }
        });
    }

    override onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        try {
            this.cleanup?.();
        } catch {}
    }
}
