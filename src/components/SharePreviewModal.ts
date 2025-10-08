import { App, Modal, Notice, Setting } from 'obsidian';
import { t } from '../lang/helpers';

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
        this.titleText = opts.title || t('sharePreview');
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
        new Setting(contentEl).setName(t('modalWidth')).addSlider((slider) => {
            slider
                .setLimits(300, 1000, 10)
                .setValue(initialWidth)
                .setDynamicTooltip()
                .onChange((value) => {
                    this.currentWidth = value;
                    // preview card element
                    if (this.previewEl) {
                        this.previewEl.classList.add(
                            'foliate-share-card-dynamic'
                        );
                        this.previewEl.style.setProperty(
                            '--share-card-width',
                            `${value}px`
                        );
                        this.previewEl.style.setProperty(
                            '--share-card-max-width',
                            `${value}px`
                        );
                    }
                    // true card element
                    this.cardEl.classList.add('foliate-share-card-dynamic');
                    this.cardEl.style.setProperty(
                        '--share-card-width',
                        `${value}px`
                    );
                    this.cardEl.style.setProperty(
                        '--share-card-max-width',
                        `${value}px`
                    );
                });
        });
        new Setting(contentEl)
            .setName(t('modalStyle'))
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions({
                        classic: t('style_classic'),
                        minimal: t('style_minimal'),
                        'image-left': t('style_image_left'),
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
                                this.cardEl.classList.add(
                                    'foliate-share-card-dynamic'
                                );
                                this.cardEl.style.setProperty(
                                    '--share-card-width',
                                    `${this.currentWidth}px`
                                );
                                this.cardEl.style.setProperty(
                                    '--share-card-max-width',
                                    `${this.currentWidth}px`
                                );
                            }
                            // 更新预览
                            body.empty();
                            const cloned = newCard.cloneNode(
                                true
                            ) as HTMLElement;
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
        this.previewEl.classList.add('foliate-share-card-dynamic');
        this.previewEl.style.setProperty(
            '--share-card-width',
            `${initialWidth}px`
        );
        this.previewEl.style.setProperty(
            '--share-card-max-width',
            `${initialWidth}px`
        );

        const footer = contentEl.createEl('div', {
            cls: 'foliate-share-footer',
        });

        const downloadBtn = footer.createEl('button', {
            text: t('downloadImage'),
            cls: 'mod-cta',
        });
        const copyBtn = footer.createEl('button', {
            text: t('copyToClipboard'),
        });

        const setBusy = (v: boolean) => {
            this.processing = v;
            downloadBtn.disabled = v;
            copyBtn.disabled = v;
            downloadBtn.textContent = v ? t('processing') : t('downloadImage');
        };

        downloadBtn.addEventListener('click', async () => {
            if (this.processing) return;
            try {
                setBusy(true);
                await this.actions.onDownload();
                new Notice(t('imageDownloaded'));
            } catch (e) {
                console.error(e);
                new Notice(t('downloadFailed'));
            } finally {
                setBusy(false);
            }
        });

        copyBtn.addEventListener('click', async () => {
            if (this.processing) return;
            try {
                setBusy(true);
                await this.actions.onCopy();
                new Notice(t('imageCopiedToClipboard'));
            } catch (e) {
                console.error(e);
                new Notice(t('copyFailed'));
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
