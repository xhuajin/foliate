import { PluginSettingTab, App, Setting, Notice } from 'obsidian';
import ReadItPlugin from './main';
import { ReadItSettings } from './types';

export const DEFAULT_SETTINGS: ReadItSettings = {
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
};

class ReadItSettingTab extends PluginSettingTab {
    plugin: ReadItPlugin;

    constructor(app: App, plugin: ReadItPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 字体设置
        new Setting(containerEl)
            .setName('字体大小')
            .setDesc('EPUB 内容的字体大小（像素）')
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
            .setName('使用 EPUB 内置字体')
            .setDesc(
                '默认使用 Obsidian 字体变量 var(--font-text)；开启后优先使用书籍内置字体（自动提高优先级）'
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.preferBookFont)
                    .onChange(async (value) => {
                        this.plugin.settings.preferBookFont = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('行高')
            .setDesc('文本行间距')
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
            .setName('页面宽度')
            .setDesc('阅读区域的最大宽度（像素）')
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
        new Setting(containerEl).setName('阅读设置').setHeading();

        new Setting(containerEl)
            .setName('自动保存进度')
            .setDesc('自动保存阅读进度和位置')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoSaveProgress)
                    .onChange(async (value) => {
                        this.plugin.settings.autoSaveProgress = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('显示阅读进度')
            .setDesc('在界面中显示阅读进度信息')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showReadingProgress)
                    .onChange(async (value) => {
                        this.plugin.settings.showReadingProgress = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('最近阅读记录数')
            .setDesc('保留最近阅读的书籍数量')
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

        new Setting(containerEl).setName('摘录').setHeading();

        new Setting(containerEl)
            .setName('摘录成功是否提示')
            .setDesc('摘录成功后是否显示提示')
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
            new Setting(containerEl).setName('最近阅读').setHeading();

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
        new Setting(containerEl).setName('操作').setHeading();

        new Setting(containerEl)
            .setName('清理过期记录')
            .setDesc('清理30天前的阅读记录')
            .addButton((button) =>
                button.setButtonText('清理').onClick(async () => {
                    await this.plugin.cleanupOldProgress();
                    new Notice('已清理过期的阅读记录');
                    this.display(); // 刷新界面
                })
            );
    }
}

export default ReadItSettingTab;
