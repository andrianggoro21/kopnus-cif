import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileRow } from '@/components/FileRow'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { fetchUpload, submitApplication, xhrUpload } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { FILE_RULES, guessDocType } from '@/lib/labels'
import { createUploadPool, type SendFn, totalProgress, type UploadItem } from '@/lib/uploadPool'
import { cn } from '@/lib/utils'
import { validateFile } from '@/lib/validation'
import type { Application, DocType, UploadedDoc } from '@/types'

const ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'

interface PendingFile {
  id: string
  file: File
  docType: DocType
}

interface RejectedFile {
  id: string
  name: string
  size: number
  error: string
}

function submitHint(busy: boolean, pending: number, done: number) {
  if (busy) return 'Tunggu hingga semua file selesai diunggah.'
  if (pending) return 'Unggah file yang sudah dipilih terlebih dahulu.'
  if (!done) return 'Unggah minimal satu dokumen untuk dikirim.'
  return 'Dokumen siap dikirim ke analis kredit.'
}

export function UploadPanel({
  application,
  canSubmit,
  send,
}: {
  application: Application
  canSubmit: boolean
  send?: SendFn
}) {
  const applicationId = application.application_id
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const sequence = useRef(0)
  const [items, setItems] = useState<UploadItem[]>([])
  const [pool] = useState(() =>
    createUploadPool({ concurrency: 3, send: send ?? xhrUpload(applicationId), onChange: setItems }),
  )
  const [pending, setPending] = useState<PendingFile[]>([])
  const [rejected, setRejected] = useState<RejectedFile[]>([])
  const [dragging, setDragging] = useState(false)

  const locked = application.status === 'IN_REVIEW'
  const uploadedIds = new Set(items.flatMap((item) => (item.result ? [item.result.upload_id] : [])))
  const existing = locked
    ? application.documents
    : application.documents.filter((doc) => !uploadedIds.has(doc.upload_id))
  const busy = items.some((item) => item.status === 'queued' || item.status === 'uploading')
  const doneCount = existing.length + items.filter((item) => item.status === 'done').length
  const progress = totalProgress(items)

  useEffect(() => {
    if (!busy) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const submit = useMutation({
    mutationFn: () => submitApplication(applicationId),
    onSuccess: (updated) => {
      queryClient.setQueryData(['application', applicationId], updated)
      toast.success('Dokumen terkirim. Pengajuan Anda sedang ditinjau analis kredit.')
    },
    onError: (error) => toast.error(error.message),
  })

  function addFiles(files: File[]) {
    let accepted = existing.length + items.length + pending.length
    const nextPending: PendingFile[] = []
    const nextRejected: RejectedFile[] = []
    for (const file of files) {
      const id = String(++sequence.current)
      const error = validateFile(file, accepted)
      if (error) {
        nextRejected.push({ id, name: file.name, size: file.size, error })
      } else {
        nextPending.push({ id, file, docType: guessDocType(file.name) })
        accepted++
      }
    }
    setPending((list) => [...list, ...nextPending])
    setRejected((list) => [...list, ...nextRejected])
  }

  function startUpload() {
    pool.add(pending.map(({ file, docType }) => ({ file, docType })))
    setPending([])
  }

  async function openDocument(doc: UploadedDoc) {
    const tab = window.open('', '_blank')
    if (!tab) {
      toast.error('Izinkan pop-up di browser untuk membuka dokumen.')
      return
    }
    try {
      const url = URL.createObjectURL(await fetchUpload(doc.url, applicationId))
      tab.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      tab.close()
      toast.error(error instanceof Error ? error.message : 'Dokumen tidak dapat dibuka.')
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    addFiles([...event.dataTransfer.files])
  }

  const hasRows = existing.length + pending.length + items.length + rejected.length > 0

  return (
    <div className="space-y-5">
      {!locked && (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-input',
          )}
        >
          <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Tarik file ke sini atau</p>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Pilih file
          </Button>
          <p className="text-sm text-muted-foreground">{FILE_RULES}</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            aria-label="Pilih file dokumen"
            tabIndex={-1}
            className="sr-only"
            onChange={(event) => {
              addFiles([...(event.target.files ?? [])])
              event.target.value = ''
            }}
          />
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span>
              {formatBytes(progress.loaded)} dari {formatBytes(progress.total)}
            </span>
            <span className="font-medium">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} aria-label="Progres total unggahan" />
        </div>
      )}

      {hasRows && (
        <ul className="divide-y border-y">
          {existing.map((doc) => (
            <FileRow
              key={`server-${doc.upload_id}`}
              name={doc.file_name}
              docType={doc.doc_type}
              status="done"
              onOpen={() => openDocument(doc)}
            />
          ))}
          {items.map((item) => (
            <FileRow
              key={`item-${item.id}`}
              name={item.file.name}
              size={item.file.size}
              docType={item.docType}
              status={item.status}
              loaded={item.loaded}
              error={item.error}
              onDocTypeChange={item.status === 'queued' ? (type) => pool.setDocType(item.id, type) : undefined}
              onOpen={item.result ? () => openDocument(item.result!) : undefined}
              onCancel={
                item.status === 'queued' || item.status === 'uploading' ? () => pool.cancel(item.id) : undefined
              }
              onRetry={item.status === 'failed' ? () => pool.retry(item.id) : undefined}
              onRemove={item.status === 'failed' ? () => pool.cancel(item.id) : undefined}
            />
          ))}
          {pending.map((entry) => (
            <FileRow
              key={`pending-${entry.id}`}
              name={entry.file.name}
              size={entry.file.size}
              docType={entry.docType}
              status="ready"
              onDocTypeChange={(type) =>
                setPending((list) => list.map((p) => (p.id === entry.id ? { ...p, docType: type } : p)))
              }
              onRemove={() => setPending((list) => list.filter((p) => p.id !== entry.id))}
            />
          ))}
          {rejected.map((entry) => (
            <FileRow
              key={`rejected-${entry.id}`}
              name={entry.name}
              size={entry.size}
              status="rejected"
              error={entry.error}
              onRemove={() => setRejected((list) => list.filter((r) => r.id !== entry.id))}
            />
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <Button type="button" onClick={startUpload}>
          Unggah {pending.length} file
        </Button>
      )}

      {locked && <p className="text-sm text-muted-foreground">Dokumen terkunci selama ditinjau analis kredit.</p>}

      {canSubmit && !locked && (
        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{submitHint(busy, pending.length, doneCount)}</p>
          <Button
            type="button"
            size="lg"
            className="h-11 px-6 text-base"
            disabled={busy || pending.length > 0 || doneCount === 0 || submit.isPending}
            onClick={() => submit.mutate()}
          >
            Kirim dokumen
          </Button>
        </div>
      )}
    </div>
  )
}
