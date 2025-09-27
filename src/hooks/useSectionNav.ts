import React from 'react';
import { App } from 'obsidian';

export function useSectionNav(
    app: App,
    book: any | null,
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
                const readerContainer = viewerRef.current?.querySelector(
                    '.epub-content-top'
                ) as HTMLElement | null;
                if (readerContainer) {
                    readerContainer.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (viewerRef.current) {
                    viewerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });

            setTimeout(() => {
                const readerContainer = viewerRef.current?.querySelector(
                    '.epub-content-top'
                ) as HTMLElement | null;
                if (readerContainer)
                    readerContainer.scrollTo({ top: 0, behavior: 'smooth' });
                if (viewerRef.current)
                    viewerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }, 130);

            const tocViews = app.workspace.getLeavesOfType('epub-toc-view');
            if (tocViews.length > 0 && tocViews[0]) {
                const tocView = tocViews[0].view as any;
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
