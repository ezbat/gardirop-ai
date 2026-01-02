"use client"

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ButtonProps'u kendimiz tanımlıyoruz (ui/button'dan gelmiyor)
interface LuxuryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  glowColor?: string
  children?: ReactNode
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

export const LuxuryButton = forwardRef<HTMLButtonElement, LuxuryButtonProps>(
  ({ className, children, glowColor = "primary", variant, size, ...props }, ref) => {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative">
        <Button 
          ref={ref} 
          className={cn("relative overflow-hidden", className)} 
          variant={variant}
          size={size}
          {...props}
        >
          <span className="relative z-10">{children}</span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.6 }}
          />
        </Button>
        <motion.div
          className={cn(
            "absolute inset-0 -z-10 rounded-lg opacity-0 blur-xl transition-opacity",
            glowColor === "primary" && "bg-primary",
            glowColor === "gold" && "bg-gold",
          )}
          whileHover={{ opacity: 0.3 }}
        />
      </motion.div>
    )
  },
)

LuxuryButton.displayName = "LuxuryButton"
export default LuxuryButton