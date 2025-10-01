import { App, TFile } from 'obsidian';
import React from 'react';
import type ReadItPlugin from '../main';
// import { getAllDailyNotes } from 'obsidian-daily-notes-interface';

type Excerpt = {
    excerpt: string;
    sourceFile: string;
    cfi?: string | null;
};

export function useExcerpts(
    app: App,
    plugin: ReadItPlugin,
    filePath: string,
    fileName: string,
    book: any,
    viewerRef: React.RefObject<HTMLDivElement>
) {
    const getBaseName = (name: string) =>
        name.replace(/\.epub$/i, '') || '摘录';
    const getDir = (path: string) =>
        path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    // const readFileIfExists = async (path: string): Promise<string | null> => {
    //     const f = app.vault.getAbstractFileByPath(path);
    //     if (f && f instanceof TFile) return await app.vault.read(f);
    //     return null;
    // };

    // (old parseExcerptsFromMarkdown removed; keeping hooks lightweight)

    const collectExcerptsForChapter = async (
        sectionIndex: number
    ): Promise<Excerpt[]> => {
        const title = book?.metadata?.title || getBaseName(fileName);
        const dir = getDir(filePath);
        // const baseName = getBaseName(fileName);
        const mode = plugin.settings.excerptStorageMode;
        // const sectionObj = book?.sections?.[sectionIndex] || {};
        // const chapterTitle: string | undefined =
        //     sectionObj.title || sectionObj.label || undefined;

        // const fromContent = (content: string | null) =>
        //     content
        //         ? parseExcerptsFromMarkdown(
        //               content,
        //               sectionIndex,
        //               title,
        //               chapterTitle
        //           )
        //         : [];

        const excerpts: Excerpt[] = [];

        switch (mode) {
            case 'per-book':
            case 'single-note':
            case 'per-note': {
                const folder = app.vault.getFolderByPath(dir);
                const files = folder
                    ? (folder.children.filter(
                          (f) => f instanceof TFile
                      ) as TFile[])
                    : [];
                for (const f of files) {
                    const content = await app.vault.read(f);
                    const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
                    const markdown = content;
                    if (match) markdown.slice(match[0].length);
                    await app.fileManager.processFrontMatter(f, (fm) => {
                        if (
                            fm &&
                            fm['book'] === title &&
                            (fm['section'] === sectionIndex + 1 ||
                                fm['section'] === String(sectionIndex + 1))
                        ) {
                            markdown?.split('\n').map((p) =>
                                excerpts.push({
                                    excerpt: p,
                                    sourceFile: f.path,
                                    // cfi: frontmatter['cfi'] || null,
                                })
                            );
                        }
                    });
                }
                break;
            }
            case 'daily-note':
                break;
            default:
                console.warn('Unknown excerpt storage mode:', mode);
                return [];
        }

        // if (mode === 'per-book') {
        //     const map = plugin.settings.perBookExcerptMap || {};
        //     const mdPath =
        //         map[filePath] || `${dir ? dir + '/' : ''}${baseName}.md`;
        //     const content = await readFileIfExists(mdPath);
        //     const arr = fromContent(content);
        //     return arr.map((e) => ({ ...e, sourceFile: mdPath }));
        // }

        // if (mode === 'single-note') {
        //     const mdPath =
        //         plugin.settings.singleExcerptPath || '_ReadIt_摘录.md';
        //     const content = await readFileIfExists(mdPath);
        //     const arr = fromContent(content);
        //     return arr.map((e) => ({ ...e, sourceFile: mdPath }));
        // }

        // if (mode === 'per-note') {
        //     const files = app.vault
        //         .getFiles()
        //         .filter(
        //             (f) =>
        //                 f.extension === 'md' &&
        //                 (dir
        //                     ? f.path.startsWith(dir + '/')
        //                     : !f.path.includes('/')) &&
        //                 new RegExp(
        //                     `^${escapeRegExp(baseName)} 摘录 .*\.md$`
        //                 ).test(f.name)
        //         );
        //     const excerpts: Excerpt[] = [];
        //     for (const f of files) {
        //         const text = await app.vault.read(f);
        //         const markdown = text.startsWith('---')
        //             ? text.split('---')[2]
        //             : text;
        //         await app.fileManager.processFrontMatter(f, (fm) => {
        //             if (
        //                 fm &&
        //                 fm['book'] === title &&
        //                 (fm['section'] === sectionIndex + 1 ||
        //                     fm['section'] === String(sectionIndex + 1))
        //             ) {
        //                 markdown?.split('\n').map((p) =>
        //                     excerpts.push({
        //                         excerpt: p,
        //                         sourceFile: f.path,
        //                         // cfi: frontmatter['cfi'] || null,
        //                     })
        //                 );
        //             }
        //         });
        //     }
        //     return excerpts;
        // }

        // if (mode === 'daily-note') {
        //     try {
        //         const allDaily = getAllDailyNotes();
        //         const all: Excerpt[] = [];
        //         for (const f of Object.values(allDaily)) {
        //             if (f) {
        //                 const c = await app.vault.read(f);
        //                 const parsed = parseExcerptsFromMarkdown(
        //                     c,
        //                     sectionIndex,
        //                     title,
        //                     chapterTitle
        //                 ).map((e) => ({ ...e, sourceFile: f.path }));
        //                 all.push(...parsed);
        //             }
        //         }
        //         return all;
        //     } catch (e) {
        //         console.warn('读取日记摘录失败：', e);
        //         return [];
        //     }
        // }

        return excerpts;
    };

    const highlightInContainer = (container: HTMLElement, phrase: Excerpt) => {
        if (!phrase || phrase.excerpt.length < 1) return 0;
        let count = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node: any) => {
                    if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
                    const trimmed = node.nodeValue.trim();
                    if (!trimmed) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                },
            } as any
        );

        const ranges: Array<{ node: Text; start: number; length: number }> = [];
        const target = phrase.excerpt; // 精确匹配，避免误高亮；如需不区分大小写，可 toLowerCase()
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const text = node.nodeValue || '';
            let idx = 0;
            while (true) {
                const found = text.indexOf(target, idx);
                if (found === -1) break;
                ranges.push({ node, start: found, length: target.length });
                idx = found + target.length;
            }
        }

        for (let i = ranges.length - 1; i >= 0; i--) {
            const item = ranges[i];
            if (!item) continue;
            const { node, start, length } = item;
            const range = document.createRange();
            try {
                range.setStart(node, start);
                range.setEnd(node, start + length);
            } catch {
                continue;
            }
            const wrapper = document.createElement('span');
            wrapper.className = 'epub-highlight';
            if (phrase.sourceFile) {
                wrapper.setAttribute('data-source-file', phrase.sourceFile);
            }
            wrapper.onclick = (e) => {
                // 点击跳转到摘录文件
                e.stopPropagation();
                if (phrase.sourceFile) {
                    const f = app.vault.getAbstractFileByPath(
                        phrase.sourceFile
                    );
                    if (f && f instanceof TFile)
                        app.workspace.openLinkText(f.path, '', false);
                }
            };
            range.surroundContents(wrapper);
            count++;
        }
        return count;
    };

    const applyHighlightsForSection = async (sectionIndex: number) => {
        const container = viewerRef.current?.querySelector(
            '.epub-reader-content'
        ) as HTMLElement | null;
        if (!container) return;

        const excerpts = await collectExcerptsForChapter(sectionIndex);
        if (!excerpts || excerpts.length === 0) return;

        const unique = Array.from(new Set(excerpts));
        let total = 0;
        for (const ex of unique) total += highlightInContainer(container, ex);
    };

    return { applyHighlightsForSection, collectExcerptsForChapter } as const;
}
