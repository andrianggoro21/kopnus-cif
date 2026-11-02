import { cn } from '@/lib/utils'
import type { Decision } from '@/types'

const STAMPS: Record<Decision, { text: string; className: string }> = {
  PASS: { text: 'Lolos pengecekan', className: 'text-pass' },
  REFER: { text: 'Perlu verifikasi', className: 'text-refer' },
  NOT_PASS: { text: 'Belum dapat diproses', className: 'text-not-pass' },
}

export function DecisionStamp({ decision }: { decision: Decision }) {
  const stamp = STAMPS[decision]

  return (
    <p
      className={cn(
        'inline-block -rotate-3 rounded-md border-[3px] border-current p-1 motion-safe:animate-stamp',
        stamp.className,
      )}
    >
      <span className="block rounded-sm border border-current px-5 py-2 text-xl font-extrabold tracking-wide uppercase sm:text-2xl">
        {stamp.text}
      </span>
    </p>
  )
}
