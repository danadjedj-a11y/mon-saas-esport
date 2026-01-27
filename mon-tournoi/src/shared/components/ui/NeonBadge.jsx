/**
 * NeonBadge - Status badge with neon glow effects
 * Variants: live (pulsing), upcoming, draft, completed, warning
 */
import clsx from 'clsx';

const variantStyles = {
    live: {
        bg: "bg-[rgba(255,62,157,0.15)]",
        text: "text-[#FF3E9D]",
        glow: "shadow-[0_0_10px_rgba(255,62,157,0.5)]",
        border: "border-[#FF3E9D]/30",
        pulse: true,
    },
    upcoming: {
        bg: "bg-[rgba(0,245,255,0.15)]",
        text: "text-[#00F5FF]",
        glow: "shadow-[0_0_10px_rgba(0,245,255,0.5)]",
        border: "border-[#00F5FF]/30",
        pulse: false,
    },
    draft: {
        bg: "bg-[rgba(148,163,184,0.15)]",
        text: "text-[#94A3B8]",
        glow: "",
        border: "border-[#94A3B8]/30",
        pulse: false,
    },
    completed: {
        bg: "bg-[rgba(34,197,94,0.15)]",
        text: "text-[#22C55E]",
        glow: "shadow-[0_0_10px_rgba(34,197,94,0.5)]",
        border: "border-[#22C55E]/30",
        pulse: false,
    },
    warning: {
        bg: "bg-[rgba(245,158,11,0.15)]",
        text: "text-[#F59E0B]",
        glow: "shadow-[0_0_10px_rgba(245,158,11,0.5)]",
        border: "border-[#F59E0B]/30",
        pulse: false,
    },
    purple: {
        bg: "bg-[rgba(139,92,246,0.15)]",
        text: "text-[#A78BFA]",
        glow: "shadow-[0_0_10px_rgba(139,92,246,0.5)]",
        border: "border-[#8B5CF6]/30",
        pulse: false,
    },
};

export function NeonBadge({
    children,
    variant = "upcoming",
    icon,
    className,
    size = "md"
}) {
    const styles = variantStyles[variant] || variantStyles.upcoming;

    const sizeClasses = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
    };

    return (
        <span
            className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider",
                styles.bg,
                styles.text,
                styles.glow,
                styles.border,
                sizeClasses[size],
                className
            )}
        >
            {styles.pulse && (
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3E9D] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF3E9D]" />
                </span>
            )}
            {icon && <span className="flex items-center">{icon}</span>}
            {children}
        </span>
    );
}

export default NeonBadge;
