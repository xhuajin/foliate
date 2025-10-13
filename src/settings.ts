import { PluginSettingTab, App, Setting, Notice } from 'obsidian';
import FoliatePlugin from './main';
import { FoliateSettings } from './types';
import { t } from '@/lang/helpers';

export const DEFAULT_SETTINGS: FoliateSettings = {
    fontSize: 16,
    lineHeight: 1.6,
    pageWidth: 800,
    theme: 'auto',
    preferBookFont: false,
    recentBooks: [],
    maxRecentBooks: 10,
    excerptSuccessNotification: true,
    // 其他摘录方式不够完善，暂时只用 per-note
    excerptStorageMode: 'per-note',
    autoSaveProgress: true,
    showReadingProgress: true,
    enableKeyboardNavigation: true,
    enableMouseSideButtonNavigation: true,
};

class FoliateSettingTab extends PluginSettingTab {
    plugin: FoliatePlugin;

    constructor(app: App, plugin: FoliatePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 字体设置
        new Setting(containerEl)
            .setName(t('settings_fontSize_name'))
            .setDesc(t('settings_fontSize_desc'))
            .addSlider((slider) =>
                slider
                    .setLimits(12, 24, 1)
                    .setValue(this.plugin.settings.fontSize)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.fontSize = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 不再在设置中选择字体，默认使用 Obsidian 字体变量 var(--font-text)

        new Setting(containerEl)
            .setName(t('settings_preferBookFont_name'))
            .setDesc(t('settings_preferBookFont_desc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.preferBookFont)
                    .onChange(async (value) => {
                        this.plugin.settings.preferBookFont = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('settings_lineHeight_name'))
            .setDesc(t('settings_lineHeight_desc'))
            .addSlider((slider) =>
                slider
                    .setLimits(1.2, 2.0, 0.1)
                    .setValue(this.plugin.settings.lineHeight)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.lineHeight = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('settings_pageWidth_name'))
            .setDesc(t('settings_pageWidth_desc'))
            .addSlider((slider) =>
                slider
                    .setLimits(600, 1200, 50)
                    .setValue(this.plugin.settings.pageWidth)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.pageWidth = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 阅读设置
        new Setting(containerEl)
            .setName(t('settings_reading_heading'))
            .setHeading();

        new Setting(containerEl)
            .setName(t('settings_autoSaveProgress_name'))
            .setDesc(t('settings_autoSaveProgress_desc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoSaveProgress)
                    .onChange(async (value) => {
                        this.plugin.settings.autoSaveProgress = value;
                        await this.plugin.saveSettings();
                    })
            );

        // new Setting(containerEl)
        //     .setName(t('settings_showReadingProgress_name'))
        //     .setDesc(t('settings_showReadingProgress_desc'))
        //     .addToggle((toggle) =>
        //         toggle
        //             .setValue(this.plugin.settings.showReadingProgress)
        //             .onChange(async (value) => {
        //                 this.plugin.settings.showReadingProgress = value;
        //                 await this.plugin.saveSettings();
        //             })
        //     );

        new Setting(containerEl)
            .setName(t('settings_enableKeyboardNavigation_name'))
            .setDesc(t('settings_enableKeyboardNavigation_desc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableKeyboardNavigation)
                    .onChange(async (value) => {
                        this.plugin.settings.enableKeyboardNavigation = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('settings_enableMouseSideButtonNavigation_name'))
            .setDesc(t('settings_enableMouseSideButtonNavigation_desc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(
                        this.plugin.settings.enableMouseSideButtonNavigation
                    )
                    .onChange(async (value) => {
                        this.plugin.settings.enableMouseSideButtonNavigation =
                            value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('settings_maxRecentBooks_name'))
            .setDesc(t('settings_maxRecentBooks_desc'))
            .addSlider((slider) =>
                slider
                    .setLimits(5, 20, 1)
                    .setValue(this.plugin.settings.maxRecentBooks)
                    .setDynamicTooltip()
                    .onChange(async (value: number) => {
                        this.plugin.settings.maxRecentBooks = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t('settings_excerpt_heading'))
            .setHeading();

        new Setting(containerEl)
            .setName(t('settings_excerptSuccessNotification_name'))
            .setDesc(t('settings_excerptSuccessNotification_desc'))
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.excerptSuccessNotification)
                    .onChange(async (value) => {
                        this.plugin.settings.excerptSuccessNotification = value;
                        await this.plugin.saveSettings();
                    })
            );

        // new Setting(containerEl)
        //     .setName('存储模式')
        //     .setDesc('摘录笔记的存储模式')
        //     .addDropdown((dropdown) => {
        //         dropdown
        //             .addOption('daily-note', '摘抄到日记')
        //             .addOption('per-note', '每个摘录单独一个文件')
        //             .addOption('per-book', '每本书一个文件')
        //             .addOption('single-note', '所有摘录一个文件')
        //             .setValue(this.plugin.settings.excerptStorageMode)
        //             .onChange(async (value) => {
        //                 this.plugin.settings.excerptStorageMode =
        //                     value as ExportStorageMode;
        //                 await this.plugin.saveSettings();
        //             });
        // });

        if (this.plugin.settings.excerptStorageMode === 'daily-note') {
            // new Setting(containerEl)
            //     .setName('摘录到日记')
            //     .setDesc('摘录内容将追加到每日笔记中')
            //     .addTextArea()
        } else if (this.plugin.settings.excerptStorageMode === 'per-note') {
            // new Setting(containerEl)
            //     .setName('每个摘录单独一个文件')
            //     .setDesc('每个摘录将保存为单独的文件')
            //     .addTextArea()
        } else if (this.plugin.settings.excerptStorageMode === 'per-book') {
            // new Setting(containerEl)
            //     .setName('每本书一个文件')
            //     .setDesc('每本书的所有摘录将保存为一个文件')
            //     .addTextArea()
        } else if (this.plugin.settings.excerptStorageMode === 'single-note') {
            // new Setting(containerEl)
            //     .setName('所有摘录一个文件')
            //     .setDesc('所有摘录将保存为一个文件')
            //     .addTextArea()
        }

        // 最近阅读的书籍
        if (this.plugin.settings.recentBooks.length > 0) {
            new Setting(containerEl)
                .setName(t('settings_recent_heading'))
                .setHeading();

            const recentBooks = this.plugin.getRecentBooks();
            for (const book of recentBooks.slice(0, 5)) {
                const bookContainer = containerEl.createEl('div', {
                    cls: 'recent-book-item',
                    attr: {
                        style: 'padding: 10px; border: 1px solid var(--background-modifier-border); margin: 5px 0; border-radius: 5px;',
                    },
                });

                bookContainer.createEl('div', {
                    text: book.fileName,
                    cls: 'book-title',
                    attr: { style: 'font-weight: bold; margin-bottom: 5px;' },
                });

                const progress = Math.round(
                    (book.sectionIndex / Math.max(book.totalSections - 1, 1)) *
                        100
                );
                bookContainer.createEl('div', {
                    text: `进度: ${book.sectionIndex + 1}/${book.totalSections} (${progress}%)`,
                    cls: 'book-progress',
                    attr: {
                        style: 'font-size: 0.9em; color: var(--text-muted);',
                    },
                });

                const lastReadDate = new Date(book.lastRead).toLocaleString();
                bookContainer.createEl('div', {
                    text: `最后阅读: ${lastReadDate}`,
                    cls: 'book-last-read',
                    attr: {
                        style: 'font-size: 0.8em; color: var(--text-muted);',
                    },
                });
            }
        }

        // 操作按钮
        new Setting(containerEl)
            .setName(t('settings_actions_heading'))
            .setHeading();

        new Setting(containerEl)
            .setName(t('settings_cleanupOldProgress_name'))
            .setDesc(t('settings_cleanupOldProgress_desc'))
            .addButton((button) =>
                button
                    .setButtonText(t('settings_cleanup_button'))
                    .onClick(async () => {
                        await this.plugin.cleanupOldProgress();
                        new Notice(t('settings_cleanupOldProgress_name'));
                        this.display(); // 刷新界面
                    })
            );

        // 清理所有阅读记录
        new Setting(containerEl)
            .setName(t('settings_clearAllProgress_name'))
            .setDesc(t('settings_clearAllProgress_desc'))
            .addButton((button) =>
                button
                    .setWarning()
                    .setButtonText(t('settings_clearAllProgress_button'))
                    .onClick(async () => {
                        const confirmed = confirm(
                            t('settings_clearAllProgress_confirm')
                        );
                        if (!confirmed) return;
                        await this.plugin.clearAllReadingProgress();
                        new Notice(t('settings_clearAllProgress_done'));
                        this.display();
                    })
            );
    }
}

export default FoliateSettingTab;
