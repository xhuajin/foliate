import { App } from 'obsidian';
import React from 'react';

export function useTocSync(
    app: App,
    book: any | null,
    currentSectionIndex: number,
    onSelect: (index: number) => void
) {
    React.useEffect(() => {
        if (!book) return;
        const tocLeaves = app.workspace.getLeavesOfType('epub-toc-view');
        if (Array.isArray(tocLeaves) && tocLeaves.length > 0) {
            const firstLeaf = tocLeaves[0];
            const tocView = firstLeaf && (firstLeaf as any).view;
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
