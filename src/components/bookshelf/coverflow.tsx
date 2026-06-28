// import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CoverFlowItem {
    id: string;
    title: string;
    author?: string;
    progress: number;
    lastRead: string;
    // status: 'reading' | 'completed' | 'not-started';
    metadata?:
        | {
              description?: string;
              language?: string;
              publisher?: string;
              subject?: string[];
              coverUrl?: string;
          }
        | undefined;
    onClick?: () => void;
}

interface CoverFlowProps {
    items: CoverFlowItem[];
    className?: string;
    /**
     * 卡片之间的水平间距（像素），用于横向位移
     */
    spacing?: number;
    /**
     * 是否关闭倾斜（仅平摆）
     */
    flat?: boolean;
    /**
     * 是否显示左右导航按钮
     */
    showNav?: boolean;
    /**
     * 是否显示底部圆点指示器
     */
    showDots?: boolean;
}

const CoverFlow: React.FC<CoverFlowProps> = ({
    items,
    className,
    spacing = 160,
    flat = false,
    showNav = true,
    showDots = false,
}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const lastWheelSwitchRef = useRef(0);
    const [expandBook, setExpandBook] = useState<number | null>(null);

    const handlePrevious = () => {
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    const handleNext = () => {
        setActiveIndex((prev) => (prev + 1) % items.length);
    };

    const handleWheel = useCallback(
        (event: React.WheelEvent<HTMLDivElement>) => {
            if (items.length <= 1) return;

            const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (Math.abs(dominantDelta) < 12) return;

            const now = Date.now();
            if (now - lastWheelSwitchRef.current < 250) return;

            lastWheelSwitchRef.current = now;

            if (dominantDelta > 0 && activeIndex < items.length - 1) {
                handleNext();
            } else if (dominantDelta < 0 && activeIndex > 0) {
                handlePrevious();
            }

            return;
        },
        [items.length, activeIndex]
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                handlePrevious();
            } else if (event.key === 'ArrowRight') {
                handleNext();
            } else if (event.key === 'Enter' && items[activeIndex]) {
                items[activeIndex].onClick?.();
            }
        },
        [activeIndex, items]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

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

    const getCardTransform = (currentIndex: number, activeIndex: number) => {
        const delta = currentIndex - activeIndex;
        const abs = Math.abs(delta);
        const isActive = abs === 0;

        // 旋转角度：参考 coverflow.js 的 (indexDiff*10 ± 45)，限制最大 75°
        const baseTilt = 60;
        const extra = Math.min(30, Math.max(0, (abs - 1) * 10));
        const rotate = flat ? 0 : (delta < 0 ? 1 : delta > 0 ? -1 : 0) * (baseTilt + extra);
        // 轻微 X 轴倾斜增强透视观感（让形状更接近“梯形”）
        const rotateX = -2;

        // 深度：非激活项后推，越远越小；激活项略微前置
        const z = isActive ? 40 : flat ? -40 * abs : -80 - 60 * (abs - 1);

        // 水平位移：按照 spacing 叠加，并在非激活项的左侧增加额外偏移，避免左右不对称，手动测试需要偏移 30px
        const x = spacing * delta - (delta < 0 ? 30 : 0);

        // 缩放：激活项突出
        const scale = isActive ? 1.08 : 1 - Math.min(0.15, abs * 0.08);

        // 先将元素中心对齐至容器中心，再做水平偏移与 3D 变换，保证激活项始终居中
        // 使用 transform 的 perspective() 确保无论外层是否生效，都有透视
        return `perspective(900px) translateX(-50%) translateY(-50%) translateX(${x}px) rotateX(${rotateX}deg) rotateY(${rotate}deg) translateZ(${z}px) scale(${scale})`;
    };

    const getCoverZIndex = (currentIndex: number, activeIndex: number) => {
        switch (Math.abs(currentIndex - activeIndex)) {
            case 0:
                return 40;
            case 1:
                return 30;
            case 2:
                return 20;
            default:
                return 10;
        }
    };

    return (
        <div
            className={cn('relative flex flex-col h-full overflow-hidden coverflow-container gap-8', className)}
            onDragStart={(e) => e.preventDefault()}
            onWheel={handleWheel}
        >
            {/* Cover Flow Cards */}
            <div className="relative h-80 w-full">
                <div className="relative h-full w-full">
                    {items.map((item, index) => {
                        const isActive = index === activeIndex;
                        const distance = Math.abs(index - activeIndex);
                        const isVisible = distance <= 4;

                        if (!isVisible) return null;

                        return (
                            <motion.div
                                key={item.id}
                                className={cn(
                                    'absolute left-1/2 top-1/2 cursor-pointer transition-all duration-300 coverflow-card'
                                )}
                                style={{
                                    transform: getCardTransform(index, activeIndex),
                                    transformStyle: 'preserve-3d',
                                    filter: isActive
                                        ? undefined
                                        : index < activeIndex
                                          ? 'brightness(0.65)'
                                          : 'brightness(0.7)',
                                    zIndex: getCoverZIndex(index, activeIndex),
                                }}
                                onClick={() => {
                                    if (isActive) {
                                        // item.onClick?.();
                                        setExpandBook(index);
                                    } else {
                                        setActiveIndex(index);
                                    }
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                <div
                                    className={cn(
                                        'w-48 h-64 rounded-lg overflow-hidden shadow-xl'
                                        // 'border border-[var(--border)]'
                                    )}
                                >
                                    {item.metadata?.coverUrl ? (
                                        <motion.img
                                            layoutId={`cover-${item.id}`}
                                            src={item.metadata.coverUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover no-drag"
                                            draggable={false}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.className += ' hidden';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full book-cover-placeholder flex items-center justify-center">
                                            <div className="text-3xl">📚</div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
            {/* Controls bar under images: Left/Title+Author/Right */}
            {showNav && items.length > 0 && (
                <div className="flex items-center h-16 justify-center gap-3 mx-auto">
                    <Button
                        onClick={handlePrevious}
                        className="p-2 border-0 shadow-none! hover:shadow-none! transition-colors bg-transparent! cursor-pointer"
                        disabled={items.length <= 1}
                        aria-label="上一个"
                        variant={'ghost'}
                        size={'icon'}
                    >
                        <ChevronLeft />
                    </Button>

                    <div className="flex flex-col w-36 min-w-96 mx-8 text-center truncate">
                        {items[activeIndex] && (
                            <>
                                <div className="text-2xl font-medium leading-loose text-[var(--text-normal)] truncate">
                                    {items[activeIndex].title}
                                </div>
                                {items[activeIndex].author && (
                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                        {items[activeIndex].author}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <Button
                        onClick={handleNext}
                        className="p-2 border-0 shadow-none! hover:shadow-none! transition-colors bg-transparent! cursor-pointer"
                        disabled={items.length <= 1}
                        aria-label="下一个"
                        variant={'ghost'}
                        size={'icon'}
                    >
                        <ChevronRight />
                    </Button>
                </div>
            )}

            {/* Bottom details panel (below control bar) */}
            <div className="w-full flex items-center justify-center">
                {items[activeIndex] && (
                    <div className="flex flex-col w-96 items-start justify-between gap-4">
                        {items[activeIndex]?.metadata?.description && (
                            <div className="flex-1 min-w-0">
                                {items[activeIndex].metadata?.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-break-spaces select-text max-h-20 truncate">
                                        {items[activeIndex].metadata.description}
                                    </p>
                                )}
                                {items[activeIndex].metadata?.subject && (
                                    <div className="relative h-96 overflow-hidden-wrap gap-1 mt-2">
                                        {items[activeIndex].metadata?.subject.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                                            >
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex flex-col w-full gap-2 items-center justify-center">
                            {/* <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {items[activeIndex].progress}%
                            </div> */}
                            <Progress value={items[activeIndex].progress} />
                            <div className="text-sm text-gray-500 dark:text-gray-500">
                                {items[activeIndex].lastRead}
                            </div>
                            <Button
                                onClick={() => items[activeIndex]?.onClick?.()}
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                继续阅读
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Dots indicator */}
            {showDots && items.length > 1 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex space-x-2">
                    {items.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            title={`查看第 ${index + 1} 本书`}
                            className={cn(
                                'w-2 h-2 rounded-full transition-colors',
                                index === activeIndex ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'
                            )}
                            aria-label={`跳转到第 ${index + 1} 本书`}
                        />
                    ))}
                </div>
            )}

            {/* Keyboard navigation hint */}
            {/* <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                使用 ← → 键导航，Enter 键打开
            </div> */}

            <AnimatePresence mode="sync">
                {expandBook !== null && items[expandBook] && (
                    <div className="fixed inset-0 z-50 flex bg-[var(--background-primary)]">
                        <div className="flex flex-row h-4/5 pt-16! gap-8">
                            <motion.img
                                layoutId={`cover-${items[expandBook]?.id}`}
                                src={items[expandBook]?.metadata?.coverUrl}
                                alt={items[expandBook]?.title}
                                className="w-fit ml-16 object-cover no-drag"
                                draggable={false}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.className += ' hidden';
                                }}
                            />
                            <motion.div exit={{ opacity: 0 }} className="ml-4 flex flex-col gap-2 duration-75">
                                <h2 className="text-2xl font-bold">{items[expandBook]?.title}</h2>
                                {items[expandBook]?.author && (
                                    <p className="text-gray-600 dark:text-gray-400">{items[expandBook]?.author}</p>
                                )}
                                {items[expandBook]?.metadata?.description && (
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-break-spaces select-text">
                                        {items[expandBook]?.metadata?.description}
                                    </p>
                                )}
                                {items[expandBook]?.metadata?.subject && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {items[expandBook]?.metadata?.subject.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
                                            >
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                        <button onClick={() => setExpandBook(null)} className="foliate-button absolute right-2 top-2">
                            <X />
                        </button>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export { CoverFlow, type CoverFlowItem };
