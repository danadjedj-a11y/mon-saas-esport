import React from 'react';

/**
 * PageHeader - Premium header component with gradient background
 * Used to create consistent premium design across all pages
 */
export default function PageHeader({
    title,
    subtitle,
    gradient = true,
    particles = false,
    className = ""
}) {
    return (
        <div className={`relative mb-8 ${className}`}>
            {/* Gradient Background */}
            {gradient && (
                <div className="absolute inset-0 -top-32 h-96 bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-cyan-500/20 blur-3xl pointer-events-none" />
            )}

            {/* Floating Particles */}
            {particles && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute h-1 w-1 rounded-full bg-[#00F5FF]/30 animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDuration: `${5 + Math.random() * 10}s`,
                                animationDelay: `${Math.random() * 5}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 text-center py-8">
                {title && (
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
