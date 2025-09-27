import { App, TFile } from 'obsidian';
import React from 'react';
import type ReadItPlugin from '../main';
import { getAllDailyNotes } from 'obsidian-daily-notes-interface';

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
    const escapeRegExp = (s: string) =>
        s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const getBaseName = (name: string) =>
        name.replace(/\.epub$/i, '') || '摘录';
    const getDir = (path: string) =>
        path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    const readFileIfExists = async (path: string): Promise<string | null> => {
        const f = app.vault.getAbstractFileByPath(path);
        if (f && f instanceof TFile) return await app.vault.read(f);
        return null;
    };

    const parseExcerptsFromMarkdown = (
        md: string,
        chapterIndex: number,
        bookTitle: string,
        chapterTitle?: string
    ): Excerpt[] => {
        const sectionNo = chapterIndex + 1;
        const titleBare = bookTitle?.trim() || '';
        const titleInBrackets = titleBare
            ? `《${escapeRegExp(titleBare)}》`
            : '';
        const titleEither = titleBare
            ? `(?:${titleInBrackets}|${escapeRegExp(titleBare)})`
            : '';
        const chapterTitleSafe =
            chapterTitle && chapterTitle.length >= 2
                ? escapeRegExp(chapterTitle.trim())
                : '';

        // 支持“第N章|节|回|页”，并兼容中文顿号/圆点分隔
        const marker = `第\s*${sectionNo}\s*(?:章|节|回|页)`;
        const markerOrTitle = chapterTitleSafe
            ? `(?:${marker}|${chapterTitleSafe})`
            : marker;

        const results: Excerpt[] = [];

        // 1) 新格式（per-book/single-note）：以 "> [!note] 书名 · 第N页" 开头，后续连续的 ">" 行为摘录内容
        {
            const lines = md.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const headerRe = new RegExp(
                    `^>\s*\[!note\][^\n]*?(?:${titleEither})?[^\n]*?[·•]\s*${markerOrTitle}`,
                    'i'
                );
                if (line && headerRe.test(line)) {
                    const buf: string[] = [];
                    let j = i + 1;
                    while (j < lines.length) {
                        const l = lines[j];
                        if (!l || !l.startsWith('>')) break; // 只收集 blockquote 内容行
                        if (/^>\s*\[!note\]/i.test(l)) break; // 下一个 note header 终止
                        // 跳过纯 tag 行
                        if (/^>\s*#/.test(l)) {
                            j++;
                            continue;
                        }
                        buf.push(l.replace(/^>\s?/, ''));
                        j++;
                    }
                    const text = buf.join('\n').trim();
                    if (text && text.length >= 3)
                        results.push({
                            excerpt: text,
                            sourceFile: '',
                            cfi: null,
                        });
                    i = j - 1;
                }
            }
        }

        // 2) 新格式（per-note）：正文后跟随形如 "> 《书名》 · 第N页" 的标记行，取其上一段正文作为摘录
        if (results.length === 0) {
            const lines = md.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const metaRe = new RegExp(
                    `^>\s*(?:${titleEither}\s*[·•]\s*)?${markerOrTitle}(?:\s|$)`,
                    'i'
                );
                if (line && metaRe.test(line)) {
                    // 回溯上一段正文：向上收集直到遇到空行或 front matter 分隔或 blockquote
                    const buf: string[] = [];
                    let j = i - 1;
                    let hitText = false;
                    while (j >= 0) {
                        const l = lines[j];
                        if (!l || !l.trim()) {
                            if (hitText) break; // 在已经收集过文本后遇到空行则终止
                            j--;
                            continue;
                        }
                        if (/^>\s*/.test(l)) break; // 上方是引用块则停止，避免跨段
                        if (/^---\s*$/.test(l)) break; // front matter 边界
                        buf.push(l);
                        hitText = true;
                        j--;
                    }
                    buf.reverse();
                    const text = buf.join('\n').trim();
                    if (text && text.length >= 3)
                        results.push({
                            excerpt: text,
                            sourceFile: '',
                            cfi: null,
                        });
                }
            }
        }

        // 3) 旧格式兼容：引用块后跟 “— 摘录 · 《书名》 · 第N章/页 ...” 行
        if (results.length === 0) {
            const titlePart = titleEither ? `${titleEither}[\s·]*` : '';
            const citationPart = `—\s*摘录[\s\S]*?${titlePart}(?:${markerOrTitle})`;
            const regex = new RegExp(
                `(^>.*(?:\n>.*)*)\n+\s*${citationPart}`,
                'gmi'
            );
            for (const m of md.matchAll(regex)) {
                const raw = (m[1] || '').trim();
                if (!raw) continue;
                const text = raw
                    .split(/\n/)
                    .map((line) => line.replace(/^>\s?/, ''))
                    .join('\n')
                    .trim();
                if (text && text.length >= 3)
                    results.push({
                        excerpt: text,
                        sourceFile: '',
                        cfi: null,
                    });
            }
        }

        // 4) 旧格式的无书名兜底
        if (results.length === 0) {
            const citationPart = `—\s*摘录[\s\S]*?(?:${markerOrTitle})`;
            const regex = new RegExp(
                `(^>.*(?:\n>.*)*)\n+\s*${citationPart}`,
                'gmi'
            );
            for (const m of md.matchAll(regex)) {
                const raw = (m[1] || '').trim();
                if (!raw) continue;
                const text = raw
                    .split(/\n/)
                    .map((line) => line.replace(/^>\s?/, ''))
                    .join('\n')
                    .trim();
                if (text && text.length >= 3)
                    results.push({
                        excerpt: text,
                        sourceFile: '',
                        cfi: null,
                    });
            }
        }

        return results;
    };

    const collectExcerptsForChapter = async (
        sectionIndex: number
    ): Promise<Excerpt[]> => {
        const title = book?.metadata?.title || getBaseName(fileName);
        const dir = getDir(filePath);
        const baseName = getBaseName(fileName);
        const mode = plugin.settings.excerptStorageMode;
        const sectionObj = book?.sections?.[sectionIndex] || {};
        const chapterTitle: string | undefined =
            sectionObj.title || sectionObj.label || undefined;

        const fromContent = (content: string | null) =>
            content
                ? parseExcerptsFromMarkdown(
                      content,
                      sectionIndex,
                      title,
                      chapterTitle
                  )
                : [];

        if (mode === 'per-book') {
            const map = plugin.settings.perBookExcerptMap || {};
            const mdPath =
                map[filePath] || `${dir ? dir + '/' : ''}${baseName}.md`;
            const content = await readFileIfExists(mdPath);
            const arr = fromContent(content);
            return arr.map((e) => ({ ...e, sourceFile: mdPath }));
        }

        if (mode === 'single-note') {
            const mdPath =
                plugin.settings.singleExcerptPath || '_ReadIt_摘录.md';
            const content = await readFileIfExists(mdPath);
            const arr = fromContent(content);
            return arr.map((e) => ({ ...e, sourceFile: mdPath }));
        }

        if (mode === 'per-note') {
            const files = app.vault
                .getFiles()
                .filter(
                    (f) =>
                        f.extension === 'md' &&
                        (dir
                            ? f.path.startsWith(dir + '/')
                            : !f.path.includes('/')) &&
                        new RegExp(
                            `^${escapeRegExp(baseName)} 摘录 .*\.md$`
                        ).test(f.name)
                );
            const all: Excerpt[] = [];
            for (const f of files) {
                const text = await app.vault.read(f);
                const markdown = text.startsWith('---')
                    ? text.split('---')
                    : text;
                const frontmatter =
                    markdown.length >= 3
                        ? markdown[1]?.split('\n').reduce(
                              (acc, line) => {
                                  const [key, ...rest] = line.split(':');
                                  if (key && rest.length > 0) {
                                      acc[key.trim()] = rest.join(':').trim();
                                  }
                                  return acc;
                              },
                              {} as Record<string, string>
                          )
                        : {};
                if (
                    frontmatter &&
                    frontmatter['book'] === title &&
                    frontmatter['section'] === String(sectionIndex + 1)
                ) {
                    const content = text.split('---')[2] ?? text;
                    content?.split('\n').map((p) =>
                        all.push({
                            excerpt: p,
                            sourceFile: f.path,
                            // cfi: frontmatter['cfi'] || null,
                        })
                    );
                }
            }
            return all;
        }

        if (mode === 'daily-note') {
            try {
                const allDaily = getAllDailyNotes();
                const all: Excerpt[] = [];
                for (const f of Object.values(allDaily)) {
                    if (f) {
                        const c = await app.vault.read(f);
                        const parsed = parseExcerptsFromMarkdown(
                            c,
                            sectionIndex,
                            title,
                            chapterTitle
                        ).map((e) => ({ ...e, sourceFile: f.path }));
                        all.push(...parsed);
                    }
                }
                return all;
            } catch (e) {
                console.warn('读取日记摘录失败：', e);
                return [];
            }
        }

        return [];
    };

    const highlightInContainer = (container: HTMLElement, phrase: Excerpt) => {
        if (!phrase || phrase.excerpt.length < 3) return 0;
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
                (wrapper as HTMLElement).style.cursor = 'pointer';
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
