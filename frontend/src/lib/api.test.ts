import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError, xhrUpload } from './api'
import type { UploadItem } from './uploadPool'

class FakeXhr {
  static last: FakeXhr
  headers: Record<string, string> = {}
  method = ''
  url = ''
  body: FormData | null = null
  status = 0
  responseText = ''
  aborted = false
  upload: { onprogress?: (event: { loaded: number }) => void } = {}
  onload?: () => void
  onerror?: () => void
  onabort?: () => void

  constructor() {
    FakeXhr.last = this
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  send(body: FormData) {
    this.body = body
  }
  abort() {
    this.aborted = true
    this.onabort?.()
  }
  respond(status: number, body: unknown) {
    this.status = status
    this.responseText = JSON.stringify(body)
    this.onload?.()
  }
}

const item: UploadItem = {
  id: '1',
  file: new File(['abc'], 'ktp.jpg', { type: 'image/jpeg' }),
  docType: 'KTP',
  status: 'uploading',
  loaded: 0,
}

beforeEach(() => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  sessionStorage.setItem('cif-token:APP-20261102-0001', 'secret')
})

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

it('posts the file with application headers and reports progress', async () => {
  const onProgress = vi.fn()
  const pending = xhrUpload('APP-20261102-0001')(item, onProgress, new AbortController().signal)
  const xhr = FakeXhr.last

  xhr.upload.onprogress?.({ loaded: 2 })
  xhr.respond(201, { upload_id: 7, file_name: 'ktp.jpg', doc_type: 'KTP', status: 'COMPLETED', url: '/api/uploads/7' })

  await expect(pending).resolves.toMatchObject({ upload_id: 7 })
  expect(xhr.method).toBe('POST')
  expect(xhr.url).toBe('/api/uploads')
  expect(xhr.headers).toMatchObject({ 'X-Application-Id': 'APP-20261102-0001', 'X-Application-Token': 'secret' })
  expect(xhr.body).toBeInstanceOf(FormData)
  expect(xhr.body!.get('doc_type')).toBe('KTP')
  expect((xhr.body!.get('file') as File).name).toBe('ktp.jpg')
  expect(onProgress).toHaveBeenCalledWith(2)
})

it('rejects with the server validation message', async () => {
  const pending = xhrUpload('APP-20261102-0001')(item, vi.fn(), new AbortController().signal)

  FakeXhr.last.respond(422, { message: 'invalid', errors: { file: ['Maksimal 5 file per pengajuan.'] } })

  await expect(pending).rejects.toEqual(
    expect.objectContaining({ status: 422, message: 'Maksimal 5 file per pengajuan.' }),
  )
})

it('rejects with a connection error when the network fails', async () => {
  const pending = xhrUpload('APP-20261102-0001')(item, vi.fn(), new AbortController().signal)

  FakeXhr.last.onerror?.()

  const error = await pending.catch((e) => e)
  expect(error).toBeInstanceOf(ApiError)
  expect(error.status).toBe(0)
})

it('aborts the request when the signal fires', async () => {
  const controller = new AbortController()
  const pending = xhrUpload('APP-20261102-0001')(item, vi.fn(), controller.signal)

  controller.abort()

  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(FakeXhr.last.aborted).toBe(true)
})
