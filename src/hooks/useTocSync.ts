import { EpubType } from '@/types';
import { EpubTocView } from '@/view/EpubTocView';
import { App } from 'obsidian';
import { useEffect } from 'react';

export function useTocSync(
    app: App,
    book: EpubType | null,
    currentSectionIndex: number,
    onSelect: (index: number) => void
) {
    useEffect(() => {
        if (!book) return;
        const tocLeaves = app.workspace.getLeavesOfType('epub-toc-view');
        if (Array.isArray(tocLeaves) && tocLeaves.length > 0) {
            const firstLeaf = tocLeaves[0];
            const tocView = firstLeaf && (firstLeaf.view as EpubTocView);
            if (tocView && typeof tocView.setBookData === 'function') {
                tocView.setBookData(
                    book,
                    currentSectionIndex,
                    (index: number) => onSelect(index)
                );
            }
        }
    }, [app, book, currentSectionIndex, onSelect]);
}
