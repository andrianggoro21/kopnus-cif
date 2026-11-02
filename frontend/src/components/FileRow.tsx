import { FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/lib/format'
import { DOC_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { DocType } from '@/types'

export type RowStatus = 'ready' | 'queued' | 'uploading' | 'done' | 'failed' | 'rejected'

const STATUS: Record<RowStatus, { text: string; className: string }> = {
  ready: { text: 'Siap diunggah', className: 'text-foreground' },
  queued: { text: 'Menunggu', className: 'text-muted-foreground' },
  uploading: { text: 'Mengunggah', className: 'text-primary' },
  done: { text: 'Berhasil', className: 'text-pass' },
  failed: { text: 'Gagal', className: 'text-not-pass' },
  rejected: { text: 'Ditolak', className: 'text-not-pass' },
}

const DOC_TYPES = Object.keys(DOC_LABELS) as DocType[]

export function FileRow({
  name,
  size,
  docType,
  status,
  loaded = 0,
  error,
  onDocTypeChange,
  onOpen,
  onCancel,
  onRetry,
  onRemove,
}: {
  name: string
  size?: number
  docType?: DocType
  status: RowStatus
  loaded?: number
  error?: string
  onDocTypeChange?: (docType: DocType) => void
  onOpen?: () => void
  onCancel?: () => void
  onRetry?: () => void
  onRemove?: () => void
}) {
  const percent = size ? Math.round((loaded / size) * 100) : 0
  const Icon = name.toLowerCase().endsWith('.pdf') ? FileText : ImageIcon

  return (
    <li className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {onOpen ? (
              <button
                type="button"
                onClick={onOpen}
                className="truncate text-left font-medium text-primary underline-offset-4 hover:underline"
              >
                {name}
              </button>
            ) : (
              <span className="truncate font-medium">{name}</span>
            )}
            {size !== undefined && <span className="text-sm text-muted-foreground">{formatBytes(size)}</span>}
            <span className={cn('text-sm font-medium', STATUS[status].className)}>
              {STATUS[status].text}
              {status === 'uploading' && ` ${percent}%`}
            </span>
          </div>
          {status === 'uploading' && <Progress value={percent} aria-label={`Mengunggah ${name}`} />}
          {error && <p className="text-sm text-not-pass">{error}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
        {docType &&
          (onDocTypeChange ? (
            <NativeSelect
              size="sm"
              aria-label={`Jenis dokumen ${name}`}
              value={docType}
              onChange={(event) => onDocTypeChange(event.target.value as DocType)}
            >
              {DOC_TYPES.map((type) => (
                <NativeSelectOption key={type} value={type}>
                  {DOC_LABELS[type]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <span className="rounded-md bg-muted px-2 py-1 text-sm">{DOC_LABELS[docType]}</span>
          ))}
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} aria-label={`Coba lagi ${name}`}>
            Coba lagi
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} aria-label={`Batal ${name}`}>
            Batal
          </Button>
        )}
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Hapus ${name}`}>
            Hapus
          </Button>
        )}
      </div>
    </li>
  )
}
