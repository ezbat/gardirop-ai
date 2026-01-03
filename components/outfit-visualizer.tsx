"use client"

import { useEffect, useRef } from 'react'
import type { ClothingItem } from '@/lib/outfit-generator'

interface OutfitVisualizerProps {
  items: ClothingItem[]
}

export default function OutfitVisualizer({ items }: OutfitVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 400
    canvas.height = 600
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawHumanSilhouette(ctx, canvas.width, canvas.height)
    positionClothingItems(ctx, items, canvas.width, canvas.height)
  }, [items])

  return <div className="relative"><canvas ref={canvasRef} className="w-full h-auto rounded-2xl bg-gradient-to-b from-primary/5 to-transparent" /></div>
}

function drawHumanSilhouette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const centerX = width / 2
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(centerX, height * 0.12, 30, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX, height * 0.17)
  ctx.lineTo(centerX, height * 0.55)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX - 60, height * 0.22)
  ctx.lineTo(centerX + 60, height * 0.22)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX - 60, height * 0.22)
  ctx.lineTo(centerX - 70, height * 0.50)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX + 60, height * 0.22)
  ctx.lineTo(centerX + 70, height * 0.50)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX - 50, height * 0.55)
  ctx.lineTo(centerX + 50, height * 0.55)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX - 30, height * 0.55)
  ctx.lineTo(centerX - 35, height * 0.90)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX + 30, height * 0.55)
  ctx.lineTo(centerX + 35, height * 0.90)
  ctx.stroke()
}

async function positionClothingItems(ctx: CanvasRenderingContext2D, items: ClothingItem[], width: number, height: number) {
  const centerX = width / 2
  for (const item of items) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = item.image_url
      })
      let x = 0, y = 0, w = 0, h = 0
      switch (item.category) {
        case 'T-shirt':
        case 'Shirt':
        case 'Sweater':
          w = 140
          h = 180
          x = centerX - w / 2
          y = height * 0.17
          break
        case 'Pants':
        case 'Shorts':
        case 'Skirt':
          w = 120
          h = 200
          x = centerX - w / 2
          y = height * 0.48
          break
        case 'Dress':
          w = 140
          h = 400
          x = centerX - w / 2
          y = height * 0.17
          break
        case 'Jacket':
        case 'Coat':
          w = 160
          h = 200
          x = centerX - w / 2
          y = height * 0.15
          break
        case 'Shoes':
          w = 80
          h = 60
          x = centerX - w / 2
          y = height * 0.85
          break
        default:
          continue
      }
      ctx.globalAlpha = 0.8
      ctx.drawImage(img, x, y, w, h)
      ctx.globalAlpha = 1.0
      ctx.fillStyle = '#000'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(item.category, centerX, y - 10)
    } catch (error) {
      ctx.fillStyle = item.color_hex
      ctx.fillRect(centerX - 60, height * 0.3, 120, 150)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(centerX - 60, height * 0.3, 120, 150)
    }
  }
}