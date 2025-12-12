'use client'

import { useEffect, useRef } from "react"
import gsap from 'gsap'

interface PageTransitionProps {
    children: React.ReactNode
    className?: string
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline()

            tl.to(overlayRef.current, {
                opacity: 0,
                duration: 1,
                ease: 'power2.inOut',
                delay: 0.2
            })

            // Content fade in
            tl.fromTo(
                contentRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.5, ease: 'power2.out' },
                '-=0.3'
            )
        })

        return () => ctx.revert()
    }, [])

    return (
        <>
            <div
                ref={overlayRef}
                className="fixed inset-0 bg-black/90 z-50 pointer-events-none" 
            />
            
            <div ref={contentRef} className={className} style={{ opacity: 0 }}>
                {children}
            </div>
        </>
    )
}