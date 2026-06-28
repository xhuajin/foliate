import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { memo, useEffect, useRef, useState } from 'react';

interface GridItem {
    id: string;
    title: string;
    author?: string;
    metadata?:
        | {
              coverUrl?: string;
          }
        | undefined;
    onClick?: () => void;
}

interface GridProps {
    items: GridItem[];
    className?: string;
    columns?: string;
}

const Grid = memo(({ items, className }: GridProps) => {
    const bookshelfRef = useRef<HTMLDivElement>(null);
    // const [cols, setCols] = useState(2);

    // useEffect(() => {
    //     if (!bookshelfRef.current) return;

    //     const observer = new ResizeObserver(([entry]) => {
    //         const width = entry?.contentRect.width;

    //         if (!width) return 3;

    //         let cols = 1;

    //         if (width >= 300) cols = 2;
    //         if (width >= 600) cols = 3;
    //         if (width >= 900) cols = 4;

    //         setCols(cols);
    //         return 3;
    //     });

    //     observer.observe(bookshelfRef.current);

    //     return () => observer.disconnect();
    // }, []);

    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <p>还没有阅读记录</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn('grid w-full px-12 gap-12', className)}
            ref={bookshelfRef}
            style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
        >
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    // type="button"
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                        'group relative aspect-[3/4] overflow-hidden rounded-xl border border-[var(--background-modifier-border)] bg-[var(--background-primary)] text-left shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--interactive-accent)] focus:ring-offset-2 focus:ring-offset-[var(--background-primary)]'
                    )}
                    onClick={item.onClick}
                    aria-label={item.title}
                >
                    {item.metadata?.coverUrl ? (
                        <img
                            src={item.metadata.coverUrl}
                            alt={item.title}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            draggable={false}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--background-secondary)] to-[var(--background-modifier-border)]">
                            <div className="text-5xl">📚</div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <div className="line-clamp-2 text-base font-semibold leading-tight">{item.title}</div>
                        {item.author && <div className="mt-1 line-clamp-1 text-sm text-white/75">{item.author}</div>}
                    </div>
                </motion.div>
            ))}
        </div>
    );
});

export { Grid, type GridItem };
