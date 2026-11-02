import type { DocType, UploadedDoc } from '@/types'

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed'

export interface UploadItem {
  id: string
  file: File
  docType: DocType
  status: UploadStatus
  loaded: number
  error?: string
  result?: UploadedDoc
}

export type SendFn = (
  item: UploadItem,
  onProgress: (loaded: number) => void,
  signal: AbortSignal,
) => Promise<UploadedDoc>

export function createUploadPool(opts: { concurrency: number; send: SendFn; onChange: (items: UploadItem[]) => void }) {
  let items: UploadItem[] = []
  let sequence = 0
  const controllers = new Map<string, AbortController>()

  const update = (id: string, patch: Partial<UploadItem>) => {
    items = items.map((item) => (item.id === id ? { ...item, ...patch } : item))
  }

  const emit = () => opts.onChange(items)

  function start(item: UploadItem) {
    const controller = new AbortController()
    controllers.set(item.id, controller)
    update(item.id, { status: 'uploading', loaded: 0, error: undefined })

    const onProgress = (loaded: number) => {
      if (controller.signal.aborted) return
      update(item.id, { loaded: Math.min(loaded, item.file.size) })
      emit()
    }

    opts
      .send(item, onProgress, controller.signal)
      .then(
        (result) => update(item.id, { status: 'done', loaded: item.file.size, result }),
        (error: unknown) =>
          update(item.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unggahan gagal. Silakan coba lagi.',
          }),
      )
      .finally(() => {
        if (controller.signal.aborted) return
        controllers.delete(item.id)
        pump()
      })
  }

  function pump() {
    let running = items.filter((item) => item.status === 'uploading').length
    for (const item of items) {
      if (running >= opts.concurrency) break
      if (item.status !== 'queued') continue
      start(item)
      running++
    }
    emit()
  }

  return {
    add(entries: { file: File; docType: DocType }[]) {
      items = [
        ...items,
        ...entries.map((entry) => ({ ...entry, id: String(++sequence), status: 'queued' as const, loaded: 0 })),
      ]
      pump()
    },
    cancel(id: string) {
      controllers.get(id)?.abort()
      controllers.delete(id)
      items = items.filter((item) => item.id !== id)
      pump()
    },
    retry(id: string) {
      if (items.find((item) => item.id === id)?.status !== 'failed') return
      update(id, { status: 'queued', loaded: 0, error: undefined })
      pump()
    },
    setDocType(id: string, docType: DocType) {
      if (items.find((item) => item.id === id)?.status !== 'queued') return
      update(id, { docType })
      emit()
    },
    items: () => items,
  }
}

export function totalProgress(items: UploadItem[]) {
  const total = items.reduce((sum, item) => sum + item.file.size, 0)
  const loaded = items.reduce((sum, item) => sum + (item.status === 'done' ? item.file.size : item.loaded), 0)
  return { loaded, total, percent: total ? Math.round((loaded / total) * 100) : 0 }
}
