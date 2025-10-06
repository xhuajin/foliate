// English
export default {
    // Generic
    loading: 'Loading...',
    error: 'Error',
    file: 'File',
    none: 'None',
    notFound: 'not found',
    loadingEpub: 'Loading EPUB...',

    // Header / Controls
    toc: 'TOC',
    prevPage: 'Prev',
    nextPage: 'Next',
    jumpToToc: 'Jump to TOC',
    refresh: 'Refresh',

    // Context menu
    copyText: 'Copy text',
    copyWithQuote: 'Copy with quote',
    excerpt: 'Excerpt',
    excerptAndOpen: 'Excerpt and open',
    copyExcerpt: 'Copy excerpt',
    openFile: 'Open file',
    share: 'Share',
    shareText: 'Share text',
    shareExcerpt: 'Share excerpt',
    sharing: 'Generating…',
    noShareableContent: 'No shareable content',
    readerNotReady: 'Reader not ready yet',
    pleaseSelectText: 'Please select text first',
    selectTextInReadingArea: 'Please select text in reading area',
    noTextToShare: 'No text to share',
    shareImageGenFailed: 'Failed to generate share image',
    shareFailed: 'Share failed, please try again',
    sharePreview: 'Share Preview',
    untitled: 'Untitled',
    pageLabel: 'Page {0}',
    sourceLabel: 'Source: {0}',
    searchInVault: 'Search in vault',
    deleteExcerpt: 'Delete excerpt',

    // Share styles
    style_classic: 'Classic',
    style_minimal: 'Minimal',
    style_image_left: 'Image left',

    // EpubViewer states
    waitingForEpub: 'Waiting for EPUB to load…',
    initFailed: 'Initialization failed',
    noEpubContent: 'No EPUB content found',
    failedToLoadEpub: 'Failed to load EPUB: ',

    // Notices (keep simple)
    copiedExcerptFile: 'Excerpt file content copied',
    excerptFileNotFound: 'Excerpt file not found',
    removeHighlightOnly:
        'The excerpt comes from a merged file. Only removed highlight.',
    deletedExcerptFile: 'Excerpt file deleted',
    failedToDeleteExcerptFile: 'Failed to delete excerpt file',
    excerptCopiedToClipboard: 'Excerpt copied to clipboard',
    failedToScrollToTop: 'Failed to scroll to top',

    // Excerpt creation
    createdExcerpt: 'Excerpt created: ',
    appendToExcerpt: 'Appended to excerpt: ',
    createdAndAppended: 'Created excerpt file and appended: ',
    failedToCreateExcerpt: 'Failed to create excerpt, please check console',
    failedToWriteExcerpt: 'Failed to write excerpt, please check console',
    appendedToUnifiedExcerpt: 'Appended to unified excerpt file',

    // ReadingHistoryView
    readingHistory: 'Reading History',
    myReadingHistory: 'My Reading History',
    noReadingRecord: 'No reading records yet',
    startYourJourney: 'Start your reading journey',
    openAnyEpub: 'Open any EPUB file in Obsidian to start reading',
    booksCountPrefix: 'Total ',
    booksCountSuffix: ' books',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo_suffix: ' days ago',
    unnamedChapter: 'Untitled chapter',
    unknown: 'Unknown',

    // EpubTocView
    tocView: 'TOC',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    focusCurrent: 'Focus current chapter',
    noBookLoaded: 'No book loaded',
    waitingBookData: 'Waiting for book data...',
    noTocData: 'The book has no TOC',
    bookTocEmpty: 'book.toc is empty',
    noTocFound: 'No TOC found',
    processedTocEmpty: 'Processed TOC is empty',
    rawTocCount: 'Original TOC items: ',
    current: 'Current',

    // Settings (names & descriptions)
    settings_fontSize_name: 'Font size',
    settings_fontSize_desc: 'Font size (px) for EPUB content',
    settings_preferBookFont_name: 'Use embedded EPUB fonts',
    settings_preferBookFont_desc:
        'When off, use Obsidian font var(--font-text); when on, prefer fonts declared in the book (and embedded OEBPS/Fonts).',
    settings_lineHeight_name: 'Line height',
    settings_lineHeight_desc: 'Line height of text content',
    settings_pageWidth_name: 'Page width',
    settings_pageWidth_desc: 'Maximum width (px) of reading area',
    settings_reading_heading: 'Reading',
    settings_autoSaveProgress_name: 'Auto save progress',
    settings_autoSaveProgress_desc:
        'Automatically store reading progress and position',
    settings_showReadingProgress_name: 'Show reading progress',
    settings_showReadingProgress_desc: 'Display reading progress information',
    settings_maxRecentBooks_name: 'Recent books count',
    settings_maxRecentBooks_desc: 'Number of recent books to keep',
    settings_excerpt_heading: 'Excerpt',
    settings_excerptSuccessNotification_name: 'Show success notice',
    settings_excerptSuccessNotification_desc:
        'Show a notice when an excerpt is created',
    settings_recent_heading: 'Recent reading',
    settings_actions_heading: 'Actions',
    settings_cleanupOldProgress_name: 'Clean outdated records',
    settings_cleanupOldProgress_desc:
        'Remove reading records older than 30 days',
    settings_cleanup_button: 'Clean',
    settings_clearAllProgress_name: 'Clear all reading records',
    settings_clearAllProgress_desc:
        'Remove ALL stored reading progress (irreversible)',
    settings_clearAllProgress_button: 'Clear all',
    settings_clearAllProgress_confirm:
        'This will delete ALL reading records. Continue?',
    settings_clearAllProgress_done: 'All reading records cleared',
};
