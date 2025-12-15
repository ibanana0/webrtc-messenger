"use client"

import * as React from "react"
import { Input as BaseInput } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getGlassStyles, type GlassCustomization } from "@/lib/glass-utils"
import { hoverEffects, type HoverEffect } from "@/lib/hover-effects"

export interface InputProps extends React.ComponentProps<typeof BaseInput> {
  icon?: React.ReactNode
  error?: boolean
  hover?: HoverEffect
  glass?: GlassCustomization
}

/**
 * Glass UI Input - A beautifully designed input component with glassy effects
 * Built on top of the base Input component with enhanced visual styling
 * 
 * @example
 * ```tsx
 * <Input 
 *   glass={{
 *     color: "rgba(255, 255, 255, 0.15)",
 *     blur: 15,
 *     outline: "rgba(255, 255, 255, 0.3)"
 *   }}
 *   placeholder="Enter text..."
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, hover = "none", glass, style, ...props }, ref) => {
    const glassStyles = getGlassStyles(glass)

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <BaseInput
          ref={ref}
          className={cn(
            "relative overflow-hidden backdrop-blur-xl border-white/20 bg-white/10",
            icon && "pl-10",
            error && "border-destructive focus-visible:ring-destructive",
            "transition-all duration-200 focus-visible:scale-[1.02]",
            hoverEffects({ hover }),
            className
          )}
          style={{ ...glassStyles, ...style }}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"
