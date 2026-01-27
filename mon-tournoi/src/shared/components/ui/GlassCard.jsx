/**
 * GlassCard - Premium glass morphism card with animated gradient border
 * Converted from V0.dev TypeScript to JSX
 */
import clsx from 'clsx';

export function GlassCard({ children, className, interactive = true }) {
    return (
        <div className={clsx("group relative", className)}>
            {/* Animated gradient border - shows on hover */}
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 opacity-0 blur-sm transition-all duration-500 group-hover:opacity-100 group-hover:blur-[2px]" />
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 opacity-0 transition-all duration-500 group-hover:opacity-100" />

            {/* Card content */}
            <div className={clsx(
                "relative rounded-xl bg-[rgba(13,13,20,0.8)] p-6 backdrop-blur-xl transition-all duration-300",
                interactive && "group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            )}>
                {children}
            </div>
        </div>
    );
}

/**
 * GlassCardSimple - Simpler version without hover effects
 */
export function GlassCardSimple({ children, className }) {
    return (
        <div className={clsx(
            "rounded-xl bg-[rgba(13,13,20,0.8)] border border-[rgba(148,163,184,0.1)] p-6 backdrop-blur-xl",
            className
        )}>
            {children}
        </div>
    );
}

export default GlassCard;
