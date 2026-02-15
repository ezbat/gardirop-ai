import { BadgeCheck } from 'lucide-react'

interface VerifiedBadgeProps {
  isVerified: boolean
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

export default function VerifiedBadge({
  isVerified,
  size = 'md',
  showTooltip = true,
  className = ''
}: VerifiedBadgeProps) {
  if (!isVerified) return null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div
        className="relative group"
        title={showTooltip ? "Doğrulanmış Satıcı" : undefined}
      >
        <BadgeCheck
          className={`${sizeClasses[size]} text-blue-500 fill-blue-500`}
        />
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Doğrulanmış Satıcı
          </div>
        )}
      </div>
    </div>
  )
}
