'use client'

import { cn } from '@/lib/utils'

interface GradientBackgroundProps {
    className?: string
    children?: React.ReactNode
}

/**
 * Animated multicolor gradient background with blur effect
 * Creates a beautiful glassmorphism-ready backdrop
 */
export function GradientBackground({ className, children }: GradientBackgroundProps) {
    return (
        <div className={cn("relative min-h-screen overflow-hidden", className)}>
            {/* Background gradient blobs */}
            <div className="fixed inset-0 -z-10">
                {/* Purple blob - top left */}
                <div
                    className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"
                />
                {/* Blue blob - top right */}
                <div
                    className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"
                />
                {/* Pink blob - bottom center */}
                <div
                    className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"
                />
                {/* Cyan blob - center left */}
                <div
                    className="absolute top-1/2 -left-20 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-3000"
                />
                {/* Yellow blob - center right */}
                <div
                    className="absolute top-1/3 -right-20 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-5000"
                />
            </div>

            {/* Dark overlay for better readability */}
            <div className="fixed inset-0 -z-10 bg-black/30 backdrop-blur-sm" />

            {/* Content */}
            {children}
        </div>
    )
}
