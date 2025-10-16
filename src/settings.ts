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
    private currentPage = 0;

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

        // if (this.plugin.settings.excerptStorageMode === 'daily-note') {
        //     new Setting(containerEl)
        //         .setName('摘录到日记')
        //         .setDesc('摘录内容将追加到每日笔记中')
        //         .addTextArea()
        // } else if (this.plugin.settings.excerptStorageMode === 'per-note') {
        //     new Setting(containerEl)
        //         .setName('每个摘录单独一个文件')
        //         .setDesc('每个摘录将保存为单独的文件')
        //         .addTextArea()
        // } else if (this.plugin.settings.excerptStorageMode === 'per-book') {
        //     new Setting(containerEl)
        //         .setName('每本书一个文件')
        //         .setDesc('每本书的所有摘录将保存为一个文件')
        //         .addTextArea()
        // } else if (this.plugin.settings.excerptStorageMode === 'single-note') {
        //     new Setting(containerEl)
        //         .setName('所有摘录一个文件')
        //         .setDesc('所有摘录将保存为一个文件')
        //         .addTextArea()
        // }

        // 最近阅读的书籍
        if (this.plugin.settings.recentBooks.length > 0) {
            const recentBooks = this.plugin.getRecentBooks();
            const booksPerPage = 5; // 每页显示的书籍数量
            const totalPages = Math.ceil(recentBooks.length / booksPerPage);

            // 确保当前页面在有效范围内
            if (this.currentPage >= totalPages) {
                this.currentPage = Math.max(0, totalPages - 1);
            }

            // 获取当前页面的书籍
            const startIndex = this.currentPage * booksPerPage;
            const endIndex = Math.min(
                startIndex + booksPerPage,
                recentBooks.length
            );
            const currentPageBooks = recentBooks.slice(startIndex, endIndex);

            // 分页导航（如果需要）
            if (totalPages > 1) {
                const paginationSetting = new Setting(containerEl)
                    .setName(
                        `${t('settings_recent_heading')} (${t('settings_recentBooks_pagination', String(this.currentPage + 1), String(totalPages))})`
                    )
                    .setHeading()
                    .setDesc('');

                if (this.currentPage > 0) {
                    paginationSetting.addButton((button) =>
                        button
                            .setButtonText(t('settings_previousPage'))
                            .onClick(() => {
                                this.currentPage--;
                                this.display();
                            })
                    );
                }

                if (this.currentPage < totalPages - 1) {
                    paginationSetting.addButton((button) =>
                        button
                            .setButtonText(t('settings_nextPage'))
                            .onClick(() => {
                                this.currentPage++;
                                this.display();
                            })
                    );
                }
            } else {
                new Setting(containerEl)
                    .setName(t('settings_recent_heading'))
                    .setHeading();
            }

            // 显示当前页面的书籍
            for (const book of currentPageBooks) {
                const rawProgress =
                    (book.sectionIndex / Math.max(book.totalSections - 1, 1)) *
                    100;
                const progress =
                    rawProgress % 1 === 0
                        ? Math.round(rawProgress)
                        : Math.round(rawProgress * 10) / 10;
                const lastReadDate = new Date(book.lastRead).toLocaleString();

                const progressText = t(
                    'settings_bookProgress',
                    String(book.sectionIndex + 1),
                    String(book.totalSections),
                    String(progress)
                );
                const lastReadText = t('settings_lastRead', lastReadDate);

                new Setting(containerEl)
                    .setName(book.fileName)
                    .setDesc(`${progressText}\n${lastReadText}`)
                    .addButton((button) =>
                        button
                            .setButtonText(
                                t('settings_clearBookProgress_button')
                            )
                            .setTooltip(t('settings_clearBookProgress_desc'))
                            .onClick(async () => {
                                // 清除这本书的阅读记录
                                await this.plugin.clearBookProgress(
                                    book.filePath
                                );
                                new Notice(
                                    t('settings_bookCleared', book.fileName)
                                );
                                this.display(); // 刷新界面
                            })
                    );
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
