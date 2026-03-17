export default function ReelSkeleton() {
  return (
    <div className="w-[92%] max-w-[420px] mx-auto">
      <div
        className="relative aspect-[9/16] rounded-[22px] overflow-hidden skeleton"
        style={{
          background: 'var(--reels-layer)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px -25px rgba(0,0,0,0.75)',
        }}
      >
        {/* Progress bar placeholder */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Top user area */}
        <div className="absolute top-[20px] left-[20px] right-[20px] flex items-center gap-[10px] z-10">
          <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex-1">
            <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div className="w-[32px] h-[32px] rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>

        {/* Right action rail */}
        <div className="absolute right-[18px] bottom-[96px] flex flex-col gap-[18px] z-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center gap-[4px]">
              <div className="w-[42px] h-[42px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-2 w-4 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>

        {/* Bottom area */}
        <div className="absolute bottom-[20px] left-[20px] right-[20px] z-10 space-y-[10px]">
          <div className="flex items-center gap-[6px]">
            <div className="w-[14px] h-[14px] rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <div className="h-2.5 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="h-4 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-4 w-2/3 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
          {/* Product card placeholder */}
          <div className="p-[16px] rounded-[16px]" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-[12px]">
              <div className="w-[44px] h-[44px] rounded-[10px] flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex-1 space-y-[6px]">
                <div className="h-3 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3.5 w-14 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
              <div className="w-[36px] h-[36px] rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
