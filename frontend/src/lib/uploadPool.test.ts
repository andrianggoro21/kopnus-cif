import { describe, expect, it } from 'vitest'
import type { UploadedDoc } from '@/types'
import { createUploadPool, type SendFn, totalProgress, type UploadItem, type UploadStatus } from './uploadPool'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const file = (name: string, size = 100) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' })

const doc = (id: number): UploadedDoc => ({
  upload_id: id,
  file_name: `f${id}.jpg`,
  doc_type: 'KTP',
  status: 'COMPLETED',
  url: `/api/uploads/${id}`,
})

function setup(fileCount: number) {
  const calls: {
    item: UploadItem
    onProgress: (loaded: number) => void
    signal: AbortSignal
    d: ReturnType<typeof deferred<UploadedDoc>>
  }[] = []
  const send: SendFn = (item, onProgress, signal) => {
    const d = deferred<UploadedDoc>()
    calls.push({ item, onProgress, signal, d })
    return d.promise
  }
  let changes = 0
  const pool = createUploadPool({ concurrency: 3, send, onChange: () => changes++ })
  pool.add(Array.from({ length: fileCount }, (_, i) => ({ file: file(`f${i}.jpg`), docType: 'LAINNYA' as const })))
  const count = (status: UploadStatus) => pool.items().filter((item) => item.status === status).length
  return { pool, calls, count, changes: () => changes }
}

describe('createUploadPool', () => {
  it('never runs more than 3 uploads at once and starts the next in FIFO order', async () => {
    const { pool, calls, count } = setup(5)

    expect(count('uploading')).toBe(3)
    expect(count('queued')).toBe(2)
    expect(calls.map((c) => c.item.file.name)).toEqual(['f0.jpg', 'f1.jpg', 'f2.jpg'])

    calls[1].d.resolve(doc(1))
    await flush()

    expect(count('uploading')).toBe(3)
    expect(count('queued')).toBe(1)
    expect(count('done')).toBe(1)
    expect(calls[3].item.file.name).toBe('f3.jpg')
    expect(pool.items()[1].result).toEqual(doc(1))
  })

  it('frees the slot of a failed upload and keeps its error message', async () => {
    const { pool, calls, count } = setup(4)

    calls[0].d.reject(new Error('Koneksi terputus.'))
    await flush()

    expect(count('failed')).toBe(1)
    expect(count('uploading')).toBe(3)
    expect(count('queued')).toBe(0)
    expect(pool.items()[0].error).toBe('Koneksi terputus.')
  })

  it('requeues a failed upload on retry with progress reset', async () => {
    const { pool, calls } = setup(1)
    calls[0].onProgress(60)
    calls[0].d.reject(new Error('gagal'))
    await flush()

    pool.retry(pool.items()[0].id)

    expect(calls).toHaveLength(2)
    expect(pool.items()[0]).toMatchObject({ status: 'uploading', loaded: 0, error: undefined })
  })

  it('aborts and removes an uploading item on cancel, then starts the next', async () => {
    const { pool, calls, count } = setup(4)
    const first = pool.items()[0].id

    pool.cancel(first)
    calls[0].d.resolve(doc(1))
    await flush()

    expect(calls[0].signal.aborted).toBe(true)
    expect(pool.items().map((item) => item.file.name)).toEqual(['f1.jpg', 'f2.jpg', 'f3.jpg'])
    expect(count('uploading')).toBe(3)
    expect(count('done')).toBe(0)
  })

  it('removes a queued item on cancel without sending it', () => {
    const { pool, calls } = setup(4)

    pool.cancel(pool.items()[3].id)

    expect(pool.items()).toHaveLength(3)
    expect(calls).toHaveLength(3)
  })

  it('tracks progress per file without exceeding the file size and ignores it after cancel', () => {
    const { pool, calls } = setup(2)

    calls[0].onProgress(40)
    calls[1].onProgress(500)
    pool.cancel(pool.items()[0].id)
    calls[0].onProgress(90)

    expect(pool.items().map((item) => item.loaded)).toEqual([100])
  })

  it('changes the document type only while queued', () => {
    const { pool } = setup(4)
    const [uploading, , , queued] = pool.items()

    pool.setDocType(uploading.id, 'KTP')
    pool.setDocType(queued.id, 'NPWP')

    expect(pool.items()[0].docType).toBe('LAINNYA')
    expect(pool.items()[3].docType).toBe('NPWP')
  })

  it('notifies listeners on every change', () => {
    const { pool, changes } = setup(1)
    const before = changes()

    pool.cancel(pool.items()[0].id)

    expect(changes()).toBeGreaterThan(before)
  })
})

describe('totalProgress', () => {
  const item = (status: UploadStatus, size: number, loaded: number): UploadItem => ({
    id: status,
    file: file('x.jpg', size),
    docType: 'KTP',
    status,
    loaded,
  })

  it('counts finished files as fully uploaded', () => {
    expect(totalProgress([item('done', 100, 0), item('uploading', 200, 50), item('queued', 100, 0)])).toEqual({
      loaded: 150,
      total: 400,
      percent: 38,
    })
  })

  it('is zero for an empty list', () => {
    expect(totalProgress([])).toEqual({ loaded: 0, total: 0, percent: 0 })
  })
})
