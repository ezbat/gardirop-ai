"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { RotateCcw, ZoomIn, User } from "lucide-react"
import type { ClothingItem } from "@/lib/storage"
import { Button } from "@/components/ui/button"

interface ModelPreviewProps {
  items: ClothingItem[]
}

export function ModelPreview({ items }: ModelPreviewProps) {
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleZoom = () => {
    setZoom((prev) => (prev >= 1.5 ? 1 : prev + 0.25))
  }

  // Categorize items for layered display
  const layers = {
    base: items.find((i) => ["tshirt", "shirt", "dress"].includes(i.category)),
    bottom: items.find((i) => ["pants", "skirt"].includes(i.category)),
    outer: items.find((i) => i.category === "jacket"),
    shoes: items.find((i) => i.category === "shoes"),
    accessory: items.find((i) => i.category === "accessory"),
  }

  return (
    <motion.div
      className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-secondary/50 to-secondary border border-border"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleRotate}
          className="rounded-full bg-background/80 backdrop-blur-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoom}
          className="rounded-full bg-background/80 backdrop-blur-sm"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Model View */}
      <motion.div
        className="relative aspect-[3/4] flex items-center justify-center p-8"
        animate={{ rotateY: rotation, scale: zoom }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ perspective: "1000px" }}
      >
        {/* Placeholder Model Silhouette */}
        <div className="relative w-full max-w-xs">
          <div className="relative aspect-[3/5] flex flex-col items-center">
            {/* Head */}
            <div className="w-16 h-16 rounded-full bg-muted-foreground/20 mb-2" />

            {/* Body with layered clothes */}
            <div className="relative flex-1 w-full">
              {/* Torso area - Top/Dress */}
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-40 rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {layers.base?.imageUrl ? (
                  <Image
                    src={layers.base.imageUrl || "/placeholder.svg"}
                    alt={layers.base.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted-foreground/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
              </motion.div>

              {/* Bottom area - Pants/Skirt */}
              {layers.bottom && (
                <motion.div
                  className="absolute top-36 left-1/2 -translate-x-1/2 w-28 h-32 rounded-xl overflow-hidden"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {layers.bottom.imageUrl ? (
                    <Image
                      src={layers.bottom.imageUrl || "/placeholder.svg"}
                      alt={layers.bottom.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted-foreground/10" />
                  )}
                </motion.div>
              )}

              {/* Outerwear overlay */}
              {layers.outer && (
                <motion.div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-36 h-44 rounded-2xl overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 0.9, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {layers.outer.imageUrl ? (
                    <Image
                      src={layers.outer.imageUrl || "/placeholder.svg"}
                      alt={layers.outer.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10" />
                  )}
                </motion.div>
              )}

              {/* Shoes */}
              {layers.shoes && (
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 rounded-lg overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {layers.shoes.imageUrl ? (
                    <Image
                      src={layers.shoes.imageUrl || "/placeholder.svg"}
                      alt={layers.shoes.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted-foreground/20 rounded-lg" />
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Floating accessories indicator */}
        {layers.accessory && (
          <motion.div
            className="absolute top-20 right-8 w-12 h-12 rounded-full overflow-hidden border-2 border-primary shadow-lg"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            {layers.accessory.imageUrl ? (
              <Image
                src={layers.accessory.imageUrl || "/placeholder.svg"}
                alt={layers.accessory.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/20" />
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Item List */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
