/**
 * GradientButton - Premium button with gradient, shimmer effect and glow
 * Converted from V0.dev
 */
import clsx from 'clsx';

const variantStyles = {
    primary: {
        base: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
        glow: "shadow-[0_0_20px_rgba(99,102,241,0.5)]",
        hoverGlow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]",
    },
    secondary: {
        base: "bg-transparent border border-[rgba(148,163,184,0.2)]",
        glow: "",
        hoverGlow: "hover:border-[#00F5FF] hover:shadow-[0_0_20px_rgba(0,245,255,0.3)]",
    },
    danger: {
        base: "bg-gradient-to-r from-red-500 to-pink-500",
        glow: "shadow-[0_0_20px_rgba(255,62,157,0.4)]",
        hoverGlow: "hover:shadow-[0_0_30px_rgba(255,62,157,0.6)]",
    },
    success: {
        base: "bg-gradient-to-r from-emerald-500 to-cyan-500",
        glow: "shadow-[0_0_20px_rgba(34,197,94,0.4)]",
        hoverGlow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]",
    },
    ghost: {
        base: "bg-transparent",
        glow: "",
        hoverGlow: "hover:bg-[rgba(139,92,246,0.15)]",
    },
};

const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
};

export function GradientButton({
    children,
    variant = "primary",
    size = "md",
    className,
    disabled,
    ...props
}) {
    const styles = variantStyles[variant] || variantStyles.primary;

    return (
        <button
            className={clsx(
                "group relative overflow-hidden rounded-full font-semibold text-[#F8FAFC] transition-all duration-300",
                "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                styles.base,
                !disabled && styles.glow,
                !disabled && styles.hoverGlow,
                sizeStyles[size],
                className
            )}
            disabled={disabled}
            {...props}
        >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        </button>
    );
}

export default GradientButton;
