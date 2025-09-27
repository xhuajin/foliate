import React from 'react';

export function useRenderSection(
    book: any | null,
    viewerRef: React.RefObject<HTMLDivElement>,
    applyHighlightsForSection: (sectionIndex: number) => Promise<void>
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

                readerContainer.innerHTML =
                    '<div class="p-4 text-center">加载中...</div>';

                if (section.createDocument) {
                    const doc = await section.createDocument();
                    if (doc && doc.body) {
                        // 渲染 HTML
                        readerContainer.innerHTML =
                            doc.body.innerHTML ||
                            doc.body.textContent ||
                            '无法加载内容';

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
                                        (
                                            img as HTMLImageElement
                                        ).style.display = 'none';
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
                } else {
                    const sectionUrl = await section.load();
                    readerContainer.innerHTML = `
            <div class="p-4">
              <h2 class="text-xl font-bold mb-4">第 ${sectionIndex + 1} 章</h2>
              <p>章节URL: ${sectionUrl}</p>
              <p class="mt-4 text-sm text-gray-600">正在开发完整的内容渲染功能...</p>
            </div>
          `;
                }
            } catch (err) {
                console.error('渲染章节失败:', err);
                const readerContainer = viewerRef.current?.querySelector(
                    '.epub-reader-content'
                ) as HTMLElement | null;
                if (readerContainer) {
                    readerContainer.innerHTML = `<div class="p-4 text-center text-red-500">加载失败: ${err}</div>`;
                }
            }
        },
        [book, viewerRef, applyHighlightsForSection]
    );

    return { renderSection } as const;
}
