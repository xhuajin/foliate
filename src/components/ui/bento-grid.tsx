import { ArrowRightIcon } from '@radix-ui/react-icons';
import { ComponentPropsWithoutRef, ReactNode } from 'react';
import { motion } from 'framer-motion';

import { Button } from './button';
import { cn } from '../../lib/utils';

interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
    children: ReactNode;
    className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
    name: string;
    className: string;
    background: ReactNode;
    Icon: React.ElementType;
    description: string;
    href: string;
    cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
    return (
        <div
            className={cn(
                'grid w-full auto-rows-[22rem] grid-cols-3 gap-4',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

const BentoCard = ({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
    ...props
}: BentoCardProps) => (
    <div
        key={name}
        className={cn(
            'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl',
            // light styles
            'bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
            // dark styles
            'transform-gpu dark:bg-background dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
            className
        )}
        {...props}
    >
        <div>{background}</div>
        <div className="p-4">
            <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
                <Icon className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />
                <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
                    {name}
                </h3>
                <p className="max-w-lg text-neutral-400">{description}</p>
            </div>

            <div
                className={cn(
                    'lg:hidden pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
                )}
            >
                <Button
                    variant="link"
                    asChild
                    size="sm"
                    className="pointer-events-auto p-0"
                >
                    <a href={href}>
                        {cta}
                        <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
                    </a>
                </Button>
            </div>
        </div>

        <div
            className={cn(
                'hidden lg:flex pointer-events-none absolute bottom-0 w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'
            )}
        >
            <Button
                variant="link"
                asChild
                size="sm"
                className="pointer-events-auto p-0"
            >
                <a href={href}>
                    {cta}
                    <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
                </a>
            </Button>
        </div>

        <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
    </div>
);

export { BentoCard, BentoGrid };

// Enhanced reading-focused components
interface ReadingBentoCardProps {
    title: string;
    author?: string;
    progress: number;
    lastRead: string;
    className?: string;
    background?: React.ReactNode;
    status: 'reading' | 'completed' | 'not-started';
    onClick?: () => void;
    metadata?:
        | {
              description?: string;
              language?: string;
              publisher?: string;
              subject?: string[];
              coverUrl?: string;
          }
        | undefined;
}

const ReadingBentoCard = ({
    title,
    author,
    progress,
    lastRead,
    className,
    background,
    status,
    onClick,
    metadata,
}: ReadingBentoCardProps) => {
    const getStatusIcon = () => {
        switch (status) {
            case 'completed':
                return '✅';
            case 'reading':
                return '📖';
            default:
                return '📚';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'completed':
                return 'text-green-600';
            case 'reading':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };

    const getProgressColor = () => {
        if (progress >= 90) return 'bg-green-500';
        if (progress >= 60) return 'bg-blue-500';
        if (progress >= 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getLanguageEmoji = (language?: string) => {
        if (!language) return '';
        const lang = language.toLowerCase();
        if (lang.includes('zh') || lang.includes('chinese')) return '🇨🇳';
        if (lang.includes('en') || lang.includes('english')) return '🇺🇸';
        if (lang.includes('ja') || lang.includes('japanese')) return '🇯🇵';
        if (lang.includes('kr') || lang.includes('korean')) return '🇰🇷';
        if (lang.includes('fr') || lang.includes('french')) return '🇫🇷';
        if (lang.includes('de') || lang.includes('german')) return '🇩🇪';
        if (lang.includes('es') || lang.includes('spanish')) return '🇪🇸';
        return '🌐';
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer',
                // light styles
                'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
                // dark styles
                'transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
                className
            )}
            onClick={onClick}
        >
            {/* Background - 封面或默认背景 */}
            {metadata?.coverUrl ? (
                <div
                    className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity bg-cover bg-center"
                    style={{ backgroundImage: `url(${metadata.coverUrl})` }}
                />
            ) : (
                background && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                        {background}
                    </div>
                )
            )}

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="text-3xl">{getStatusIcon()}</div>
                        {metadata?.language && (
                            <div
                                className="text-lg"
                                title={`语言: ${metadata.language}`}
                            >
                                {getLanguageEmoji(metadata.language)}
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div
                            className={cn(
                                'text-sm font-medium',
                                getStatusColor()
                            )}
                        >
                            {progress}%
                        </div>
                        <div className="text-xs text-neutral-500">
                            {lastRead}
                        </div>
                    </div>
                </div>

                {/* Book Info */}
                <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 mb-2">
                        {title}
                    </h3>
                    {author && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                            {author}
                        </p>
                    )}
                    {metadata?.publisher && (
                        <p className="text-xs text-neutral-500 mb-2">
                            📖 {metadata.publisher}
                        </p>
                    )}
                    {metadata?.description && (
                        <p
                            className="text-xs text-neutral-500 line-clamp-2 mb-3"
                            title={metadata.description}
                        >
                            {metadata.description}
                        </p>
                    )}
                    {metadata?.subject && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {metadata?.subject.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full"
                                >
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="mt-auto">
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={cn(
                                'h-full rounded-full',
                                getProgressColor()
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
    );
};

// Stats card component
interface StatsBentoCardProps {
    title: string;
    value: number | string;
    description: string;
    icon: React.ReactNode;
    className?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const StatsBentoCard = ({
    title,
    value,
    description,
    icon,
    className,
    trend,
}: StatsBentoCardProps) => {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'group relative col-span-1 flex flex-col justify-center overflow-hidden rounded-xl',
                // light styles
                'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
                // dark styles
                'transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
                className
            )}
        >
            <div className="p-6 text-center">
                <div className="flex justify-center mb-4 text-4xl opacity-80">
                    {icon}
                </div>
                <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                    {value}
                </div>
                <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    {title}
                </div>
                <div className="text-xs text-neutral-500">{description}</div>
                {trend && (
                    <div className="mt-3">
                        <span
                            className={cn(
                                'inline-flex items-center text-xs font-medium',
                                trend.isPositive
                                    ? 'text-green-600'
                                    : 'text-red-600'
                            )}
                        >
                            {trend.isPositive ? '↗' : '↘'}{' '}
                            {Math.abs(trend.value)}%
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export { ReadingBentoCard, StatsBentoCard };
