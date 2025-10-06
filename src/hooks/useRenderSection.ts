import React from 'react';

export function useRenderSection(
    book: any | null,
    viewerRef: React.RefObject<HTMLDivElement>,
    applyHighlightsForSection: (sectionIndex: number) => Promise<void>,
    preferBookFont: boolean
) {
    const renderSection = React.useCallback(
        async (sectionIndex: number) => {
            if (!book || !book.sections || !viewerRef.current) return;

            const section = book.sections[sectionIndex];
            if (!section) return;

            try {
                const readerContainer = viewerRef.current.querySelector(
                    '.epub-reader-content'
                ) as HTMLElement | null;
                if (!readerContainer) return;

                // 在渲染新章节前，移除之前注入的章节级样式，避免跨章节污染
                try {
                    const oldStyles = readerContainer.querySelectorAll(
                        'style[data-epub-section-style="true"]'
                    );
                    oldStyles.forEach((el) => el.remove());
                } catch {}

                readerContainer.innerHTML =
                    '<div class="p-4 text-center">加载中...</div>';

                if (section.createDocument) {
                    const doc = await section.createDocument();
                    if (doc && doc.body) {
                        // 收集并加载章节样式（内联 <style> 与外链 <link rel="stylesheet">）
                        const collectedCss: string[] = [];
                        try {
                            // 1) 内联样式
                            const inlineStyles = Array.from(
                                doc.querySelectorAll('style')
                            ) as HTMLStyleElement[];
                            for (const s of inlineStyles) {
                                const txt = s.textContent || '';
                                if (txt) collectedCss.push(txt);
                            }

                            // 2) 外链样式
                            const links = Array.from(
                                doc.querySelectorAll(
                                    'link[rel="stylesheet"][href]'
                                )
                            ) as HTMLLinkElement[];
                            if (links.length) {
                                const cssTexts = await Promise.all(
                                    links.map(async (lnk) => {
                                        try {
                                            const href =
                                                lnk.getAttribute('href') || '';
                                            const absPath = section.resolveHref
                                                ? section.resolveHref(href)
                                                : href;
                                            if (!absPath || !book?.loadBlob)
                                                return '';
                                            const blob =
                                                await book.loadBlob(absPath);
                                            if (!blob) return '';
                                            const text = await (
                                                blob as Blob
                                            ).text();
                                            return text || '';
                                        } catch {
                                            return '';
                                        }
                                    })
                                );
                                for (const t of cssTexts)
                                    if (t) collectedCss.push(t);
                            }
                        } catch (e) {
                            console.warn('收集章节样式失败：', e);
                        }

                        // 渲染 HTML
                        readerContainer.innerHTML =
                            doc.body.innerHTML ||
                            doc.body.textContent ||
                            '无法加载内容';

                        // 将样式注入容器（基础作用域处理：为选择器添加 .epub-reader-content 前缀，降低污染）
                        if (collectedCss.length) {
                            const scope = '.epub-reader-content';
                            // 预过滤：移除指向本地 file:// 或 /mnt/us/ 的 @font-face，避免 Not allowed to load local resource 错误
                            const stripIllegalFontFace = (css: string) => {
                                try {
                                    return css.replace(
                                        /@font-face\s*\{[^}]*\}/gi,
                                        (block) => {
                                            return /(url\s*\(\s*['"]?(file:\/\/|\/?mnt\/us\/))/i.test(
                                                block
                                            )
                                                ? ''
                                                : block;
                                        }
                                    );
                                } catch {
                                    return css;
                                }
                            };
                            // preferBookFont=false 时，直接移除全部 @font-face，避免无意义的字体加载与报错
                            const stripAllFontFace = (css: string) =>
                                css.replace(/@font-face\s*\{[\s\S]*?\}/gi, '');

                            // 尝试解析 @font-face 中的 url()，将 EPUB 内部字体资源转换为 blob URL
                            const inlineFontFaceResources = async (
                                css: string
                            ): Promise<string> => {
                                if (!preferBookFont)
                                    return stripAllFontFace(css);
                                const fontFaceRe =
                                    /@font-face\s*\{[\s\S]*?\}/gi;
                                return await (async () => {
                                    const blocks: string[] = [];
                                    let lastIndex = 0;
                                    let m: RegExpExecArray | null;
                                    while (
                                        (m = fontFaceRe.exec(css)) !== null
                                    ) {
                                        const before = css.slice(
                                            lastIndex,
                                            m.index
                                        );
                                        if (before) blocks.push(before);
                                        let block = m[0];
                                        // 解析 url()
                                        const urlRe =
                                            /url\(\s*(['"]?)([^)"']+)\1\s*\)/gi;
                                        let um: RegExpExecArray | null;
                                        const replacements: {
                                            original: string;
                                            repl: string;
                                        }[] = [];
                                        while (
                                            (um = urlRe.exec(block)) !== null
                                        ) {
                                            const full = um[0];
                                            const rawPath: string = (
                                                um[2] || ''
                                            ).trim();
                                            // 跳过 data:, http(s):, blob:
                                            if (
                                                !rawPath ||
                                                /^(data:|https?:|blob:)/i.test(
                                                    rawPath
                                                )
                                            )
                                                continue;
                                            // 跳过绝对的 app:// 或 file:// （已在前面 stripIllegalFontFace 处理 file://，app:// 说明已变成无法解析的相对根路径）
                                            if (
                                                /^(app:\/\/|file:\/\/)/i.test(
                                                    rawPath
                                                )
                                            ) {
                                                // 移除此 @font-face 整块
                                                block = '';
                                                break;
                                            }
                                            // 解析相对路径，基于 section.href
                                            try {
                                                const sectionHref =
                                                    section.href || '';
                                                const sectionDir =
                                                    sectionHref.includes('/')
                                                        ? sectionHref.substring(
                                                              0,
                                                              sectionHref.lastIndexOf(
                                                                  '/'
                                                              )
                                                          )
                                                        : '';
                                                const candidates: string[] = [];
                                                const norm = rawPath.replace(
                                                    /^\.\//,
                                                    ''
                                                );
                                                if (norm.startsWith('/')) {
                                                    candidates.push(
                                                        norm.slice(1)
                                                    );
                                                } else if (
                                                    norm.startsWith('../')
                                                ) {
                                                    // 处理 ../ 回溯
                                                    const parts =
                                                        norm.split('/');
                                                    const dirParts = sectionDir
                                                        ? sectionDir.split('/')
                                                        : [];
                                                    let up = 0;
                                                    for (const p of parts) {
                                                        if (p === '..') up++;
                                                        else break;
                                                    }
                                                    const remain = parts
                                                        .slice(up)
                                                        .join('/');
                                                    const base = dirParts.slice(
                                                        0,
                                                        dirParts.length - up
                                                    );
                                                    candidates.push(
                                                        [...base, remain].join(
                                                            '/'
                                                        )
                                                    );
                                                } else {
                                                    candidates.push(
                                                        sectionDir
                                                            ? sectionDir +
                                                                  '/' +
                                                                  norm
                                                            : norm
                                                    );
                                                }
                                                // 常见大小写变体
                                                candidates.push(
                                                    ...candidates.map((c) =>
                                                        c.replace(
                                                            /^Fonts\//,
                                                            'fonts/'
                                                        )
                                                    )
                                                );
                                                let blobUrl: string | null =
                                                    null;
                                                for (const c of candidates) {
                                                    try {
                                                        const b =
                                                            await book.loadBlob(
                                                                c
                                                            );
                                                        if (b) {
                                                            blobUrl =
                                                                URL.createObjectURL(
                                                                    b
                                                                );
                                                            // 计划后续可统一释放；当前章节切换时容器被替换可认为浏览器自行 GC
                                                            replacements.push({
                                                                original: full,
                                                                repl: `url('${blobUrl}')`,
                                                            });
                                                            break;
                                                        }
                                                    } catch {}
                                                }
                                                if (!blobUrl) {
                                                    // 找不到资源，移除整个 @font-face 块避免 404
                                                    block = '';
                                                    break;
                                                }
                                            } catch {
                                                block = '';
                                                break;
                                            }
                                        }
                                        if (block) {
                                            for (const r of replacements) {
                                                block = block.replace(
                                                    r.original,
                                                    r.repl
                                                );
                                            }
                                        }
                                        blocks.push(block);
                                        lastIndex = fontFaceRe.lastIndex;
                                    }
                                    const tail = css.slice(lastIndex);
                                    if (tail) blocks.push(tail);
                                    return blocks.join('');
                                })();
                            };
                            // 给字体声明加上 !important（当 preferBookFont=true 时，避免被 Obsidian 默认字体覆盖）
                            const addImportantToFont = (css: string) => {
                                if (!preferBookFont) return css;
                                // 跳过 @font-face 片段
                                const parts: string[] = [];
                                const re = /@font-face\s*\{[\s\S]*?\}/gi;
                                let last = 0;
                                let m: RegExpExecArray | null;
                                const processRules = (chunk: string) => {
                                    // 为 font-family 与 font 简写添加 !important（若未添加）
                                    let out = chunk.replace(
                                        /font-family\s*:\s*([^;{}]+);/gi,
                                        (full, val) => {
                                            return /!\s*important/i.test(full)
                                                ? full
                                                : `font-family: ${val.trim()} !important;`;
                                        }
                                    );
                                    out = out.replace(
                                        /(^|[;{\s])font\s*:\s*([^;{}]+);/gi,
                                        (full, p1, val) => {
                                            return /!\s*important/i.test(full)
                                                ? full
                                                : `${p1}font: ${val.trim()} !important;`;
                                        }
                                    );
                                    return out;
                                };
                                while ((m = re.exec(css)) !== null) {
                                    const before = css.slice(last, m.index);
                                    parts.push(processRules(before));
                                    parts.push(m[0]); // 保持 @font-face 原样
                                    last = m.index + m[0].length;
                                }
                                parts.push(processRules(css.slice(last)));
                                return parts.join('');
                            };
                            const scopeCss = (css: string) => {
                                try {
                                    // 极简前缀：对每个规则左侧选择器添加作用域（不处理 @media/@font-face 等复杂情况）
                                    // 基本适配：body -> .epub-reader-content
                                    const replacedBody = css.replace(
                                        /(^|[^-\w])body(?![-\w])/gi,
                                        `$1${scope}`
                                    );
                                    const scoped = replacedBody.replace(
                                        /([^{}]+)\{/g,
                                        (m, sel) => {
                                            if (/^\s*@/m.test(sel)) return m; // 跳过 @ 规则
                                            const prefixed = sel
                                                .split(',')
                                                .map((s: string) => {
                                                    const trimmed = s.trim();
                                                    if (!trimmed)
                                                        return trimmed;
                                                    // 若选择器已包含作用域，跳过
                                                    if (
                                                        trimmed.startsWith(
                                                            scope
                                                        )
                                                    )
                                                        return trimmed;
                                                    return `${scope} ${trimmed}`;
                                                })
                                                .join(', ');
                                            return `${prefixed}{`;
                                        }
                                    );
                                    return addImportantToFont(scoped);
                                } catch {
                                    return css;
                                }
                            };

                            const processed: string[] = [];
                            for (const rawCss of collectedCss) {
                                let css = stripIllegalFontFace(rawCss);
                                css = await inlineFontFaceResources(css);
                                css = scopeCss(css);
                                processed.push(css);
                            }
                            const styleEl = document.createElement('style');
                            styleEl.setAttribute(
                                'data-epub-section-style',
                                'true'
                            );
                            styleEl.textContent = processed.join('\n\n');
                            // 将样式插入到章节容器顶部，确保优先级略高于文档默认
                            readerContainer.prepend(styleEl);
                        }

                        // 处理 IMG 资源
                        const images = readerContainer.querySelectorAll('img');
                        for (let i = 0; i < images.length; i++) {
                            const img = images[i];
                            if (!img) continue;

                            const src = img.getAttribute('src');
                            if (
                                src &&
                                !src.startsWith('http') &&
                                !src.startsWith('blob:') &&
                                !src.startsWith('data:')
                            ) {
                                try {
                                    let imagePath = src;
                                    if (
                                        src.startsWith('../') ||
                                        src.startsWith('./') ||
                                        !src.startsWith('/')
                                    ) {
                                        const sectionHref = section.href || '';
                                        const sectionDir = sectionHref.includes(
                                            '/'
                                        )
                                            ? sectionHref.substring(
                                                  0,
                                                  sectionHref.lastIndexOf('/')
                                              )
                                            : '';
                                        if (src.startsWith('../')) {
                                            const parts = src.split('/');
                                            const dirParts = sectionDir
                                                ? sectionDir.split('/')
                                                : [];
                                            let upLevels = 0;
                                            for (const part of parts) {
                                                if (part === '..') upLevels++;
                                                else break;
                                            }
                                            const remainingParts =
                                                parts.slice(upLevels);
                                            const newDirParts = dirParts.slice(
                                                0,
                                                -upLevels
                                            );
                                            imagePath = [
                                                ...newDirParts,
                                                ...remainingParts,
                                            ].join('/');
                                        } else if (src.startsWith('./')) {
                                            imagePath =
                                                sectionDir +
                                                '/' +
                                                src.substring(2);
                                        } else {
                                            imagePath = sectionDir
                                                ? sectionDir + '/' + src
                                                : src;
                                        }
                                    }

                                    if (book.loadBlob) {
                                        const imageBlob =
                                            await book.loadBlob(imagePath);
                                        if (imageBlob) {
                                            const blobUrl =
                                                URL.createObjectURL(imageBlob);
                                            img.src = blobUrl;
                                            img.onload = img.onerror = () => {
                                                setTimeout(
                                                    () =>
                                                        URL.revokeObjectURL(
                                                            blobUrl
                                                        ),
                                                    1000
                                                );
                                            };
                                        } else {
                                            throw new Error('无法获取图片blob');
                                        }
                                    } else {
                                        throw new Error('book.loadBlob不可用');
                                    }
                                } catch (_imgErr) {
                                    try {
                                        const fileName = src?.split('/').pop();
                                        if (fileName && book.loadBlob) {
                                            const possiblePaths = [
                                                `Images/${fileName}`,
                                                `images/${fileName}`,
                                                `OEBPS/Images/${fileName}`,
                                                `OEBPS/images/${fileName}`,
                                                fileName,
                                            ];
                                            let imageLoaded = false;
                                            for (const path of possiblePaths) {
                                                try {
                                                    const imageBlob =
                                                        await book.loadBlob(
                                                            path
                                                        );
                                                    if (imageBlob) {
                                                        const blobUrl =
                                                            URL.createObjectURL(
                                                                imageBlob
                                                            );
                                                        img.src = blobUrl;
                                                        img.onload =
                                                            img.onerror =
                                                                () => {
                                                                    setTimeout(
                                                                        () =>
                                                                            URL.revokeObjectURL(
                                                                                blobUrl
                                                                            ),
                                                                        1000
                                                                    );
                                                                };
                                                        imageLoaded = true;
                                                        break;
                                                    }
                                                } catch {}
                                            }
                                            if (!imageLoaded)
                                                throw new Error(
                                                    '所有路径尝试都失败'
                                                );
                                        }
                                    } catch (fallbackErr) {
                                        console.warn(
                                            '备用路径也失败:',
                                            fallbackErr
                                        );
                                        (img as HTMLImageElement).classList.add(
                                            'epub-image-hidden'
                                        );
                                    }
                                }
                            }
                        }

                        // 图片处理完毕后，应用章节摘录高亮
                        try {
                            await applyHighlightsForSection(sectionIndex);
                        } catch (e) {
                            console.warn('章节高亮时出错：', e);
                        }
                    } else {
                        readerContainer.innerHTML =
                            '<div class="p-4 text-center text-yellow-600">无法解析章节内容</div>';
                    }
                }
            } catch (err) {
                console.error('渲染章节失败:', err);
                const readerContainer = viewerRef.current?.querySelector(
                    '.epub-reader-content'
                ) as HTMLElement | null;
                if (readerContainer) {
                    readerContainer.innerHTML = `<div class="p-4 text-center text-red-500">加载失败</div>`;
                }
            }
        },
        [book, viewerRef, applyHighlightsForSection, preferBookFont]
    );

    return { renderSection } as const;
}
