import React from 'react';
import { App } from 'obsidian';
// import { EpubReaderView } from '@/view/EpubReaderView';
import { t } from '@/lang/helpers';
import { EpubType } from '@/types';
import { EpubTocView } from '@/view/EpubTocView';

export function useSectionNav(
    app: App,
    book: EpubType | null,
    scrollToTopRef: React.RefObject<HTMLDivElement>,
    viewerRef: React.RefObject<HTMLDivElement>,
    renderSection: (index: number) => Promise<void>,
    saveProgress: (index: number) => Promise<void>,
    setCurrentSectionIndex: (n: number) => void
) {
    const goToSection = React.useCallback(
        async (sectionIndex: number) => {
            if (
                !book?.sections ||
                sectionIndex < 0 ||
                sectionIndex >= book.sections.length
            )
                return;

            setCurrentSectionIndex(sectionIndex);
            await saveProgress(sectionIndex);
            await renderSection(sectionIndex).then(() => {
                // 考虑到有点击目录跳转的情况，不应该使用 activeView。
                if (scrollToTopRef.current) {
                    scrollToTopRef.current.scrollTo({ top: 0 });
                } else {
                    console.error(t('failedToScrollToTop'));
                }
            });

            const tocViews = app.workspace.getLeavesOfType('epub-toc-view');
            if (tocViews.length > 0 && tocViews[0]) {
                const tocView = tocViews[0].view as EpubTocView;
                if (tocView && tocView.updateCurrentSection)
                    tocView.updateCurrentSection(sectionIndex);
            }
        },
        [
            app,
            book,
            renderSection,
            saveProgress,
            setCurrentSectionIndex,
            viewerRef,
        ]
    );

    return { goToSection } as const;
}
