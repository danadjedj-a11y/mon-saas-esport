/**
 * GlowBorder - Wrapper that adds animated gradient border to any element
 */
import clsx from 'clsx';

const gradientStyles = {
    default: "from-indigo-500 via-purple-500 to-pink-500",
    cyan: "from-cyan-400 via-teal-500 to-emerald-500",
    pink: "from-pink-500 via-rose-500 to-red-500",
    gold: "from-yellow-400 via-amber-500 to-orange-500",
    purple: "from-purple-500 via-violet-500 to-indigo-500",
};

export function GlowBorder({
    children,
    className,
    gradient = "default",
    intensity = "normal", // normal, strong
}) {
    const intensityStyles = {
        normal: {
            blur: "blur-md",
            hoverBlur: "group-hover:blur-lg",
            opacity: "opacity-50",
            hoverOpacity: "group-hover:opacity-100",
        },
        strong: {
            blur: "blur-lg",
            hoverBlur: "group-hover:blur-xl",
            opacity: "opacity-75",
            hoverOpacity: "group-hover:opacity-100",
        },
    };

    const intense = intensityStyles[intensity] || intensityStyles.normal;

    return (
        <div className={clsx("group relative", className)}>
            {/* Outer glow */}
            <div
                className={clsx(
                    "absolute -inset-[2px] rounded-xl bg-gradient-to-r transition-all duration-500",
                    gradientStyles[gradient],
                    intense.blur,
                    intense.hoverBlur,
                    intense.opacity,
                    intense.hoverOpacity
                )}
            />

            {/* Border gradient */}
            <div
                className={clsx(
                    "absolute -inset-[1px] rounded-xl bg-gradient-to-r",
                    gradientStyles[gradient]
                )}
            />

            {/* Inner content wrapper */}
            <div className="relative rounded-xl bg-[#0D0D14]">
                {children}
            </div>
        </div>
    );
}

export default GlowBorder;
