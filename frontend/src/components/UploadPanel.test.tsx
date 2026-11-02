import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guessDocType } from '@/lib/labels'
import type { SendFn } from '@/lib/uploadPool'
import type { Application, UploadedDoc } from '@/types'
import { UploadPanel } from './UploadPanel'

const application = (patch: Partial<Application> = {}): Application => ({
  application_id: 'APP-20261102-0001',
  decision: 'REFER',
  identity_confidence: 85,
  credit_score: 75,
  status: 'WAITING_DOCUMENTS',
  documents_required: true,
  loan: { type: 'KTA', amount: 50000000, tenor_months: 12 },
  documents: [],
  created_at: '2026-11-02T10:15:00+07:00',
  ...patch,
})

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type })

function controlledSend() {
  const calls: { name: string; resolve: (doc: UploadedDoc) => void; reject: (e: unknown) => void }[] = []
  const send: SendFn = (item) => new Promise((resolve, reject) => calls.push({ name: item.file.name, resolve, reject }))
  return { send, calls }
}

const fetchMock = vi.fn()

beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function renderPanel(app: Application, send: SendFn, canSubmit = true) {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <UploadPanel application={app} canSubmit={canSubmit} send={send} />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup({ applyAccept: false }), queryClient }
}

const statusOf = (name: string) => within(screen.getByText(name).closest('li')!)

describe('UploadPanel', () => {
  it('rejects invalid and sixth files, then uploads at most three at once', async () => {
    const { send, calls } = controlledSend()
    const { user } = renderPanel(application(), send)
    const files = [
      file('setup.exe', 'application/x-msdownload'),
      ...['ktp.jpg', 'npwp.png', 'slip-gaji.pdf', 'buku-nikah.jpg', 'lain.jpg', 'keenam.jpg'].map((n) =>
        file(n, n.endsWith('.pdf') ? 'application/pdf' : n.endsWith('.png') ? 'image/png' : 'image/jpeg'),
      ),
    ]

    await user.upload(screen.getByLabelText('Pilih file dokumen'), files)

    expect(statusOf('setup.exe').getByText('Tipe file tidak didukung (hanya JPG, PNG, PDF).')).toBeInTheDocument()
    expect(statusOf('keenam.jpg').getByText('Maksimal 5 file per pengajuan.')).toBeInTheDocument()
    expect(screen.getAllByText('Siap diunggah')).toHaveLength(5)
    expect(screen.getByLabelText('Jenis dokumen slip-gaji.pdf')).toHaveValue('SLIP_GAJI')

    await user.click(screen.getByRole('button', { name: 'Unggah 5 file' }))

    expect(calls).toHaveLength(3)
    expect(screen.getAllByText(/^Mengunggah/)).toHaveLength(3)
    expect(screen.getAllByText('Menunggu')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Kirim dokumen' })).toBeDisabled()
  })

  it('shows a failed upload with its message and retries it', async () => {
    const { send, calls } = controlledSend()
    const { user } = renderPanel(application(), send)

    await user.upload(screen.getByLabelText('Pilih file dokumen'), [file('ktp.jpg')])
    await user.click(screen.getByRole('button', { name: 'Unggah 1 file' }))
    await act(async () => calls[0].reject(new Error('Koneksi terputus. Silakan coba lagi.')))

    expect(statusOf('ktp.jpg').getByText('Gagal')).toBeInTheDocument()
    expect(screen.getByText('Koneksi terputus. Silakan coba lagi.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Coba lagi ktp.jpg' }))

    expect(calls).toHaveLength(2)
    expect(statusOf('ktp.jpg').getByText(/^Mengunggah/)).toBeInTheDocument()
  })

  it('enables sending once a document is uploaded and moves the application to review', async () => {
    const { send, calls } = controlledSend()
    const { user, queryClient } = renderPanel(application(), send)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: application({ status: 'IN_REVIEW' }) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await user.upload(screen.getByLabelText('Pilih file dokumen'), [file('ktp.jpg')])
    await user.click(screen.getByRole('button', { name: 'Unggah 1 file' }))
    await act(async () =>
      calls[0].resolve({
        upload_id: 9,
        file_name: 'ktp.jpg',
        doc_type: 'KTP',
        status: 'COMPLETED',
        url: '/api/uploads/9',
      }),
    )

    const sendButton = screen.getByRole('button', { name: 'Kirim dokumen' })
    expect(sendButton).toBeEnabled()
    await user.click(sendButton)

    expect(fetchMock.mock.calls[0][0]).toBe('/api/cif/APP-20261102-0001/submit')
    await vi.waitFor(() =>
      expect(queryClient.getQueryData<Application>(['application', 'APP-20261102-0001'])?.status).toBe('IN_REVIEW'),
    )
  })

  it('lists documents from the server and locks the panel while in review', () => {
    const { send } = controlledSend()
    renderPanel(
      application({
        status: 'IN_REVIEW',
        documents: [
          { upload_id: 3, file_name: 'ktp.jpg', doc_type: 'KTP', status: 'COMPLETED', url: '/api/uploads/3' },
        ],
      }),
      send,
    )

    expect(screen.getByRole('button', { name: 'ktp.jpg' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Pilih file dokumen')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kirim dokumen' })).not.toBeInTheDocument()
    expect(screen.getByText('Dokumen terkunci selama ditinjau analis kredit.')).toBeInTheDocument()
  })
})

describe('guessDocType', () => {
  it.each([
    ['KTP_Budi.jpg', 'KTP'],
    ['npwp.pdf', 'NPWP'],
    ['slip-gaji-okt.pdf', 'SLIP_GAJI'],
    ['buku nikah.png', 'BUKU_NIKAH'],
    ['foto.jpg', 'LAINNYA'],
  ])('%s → %s', (name, type) => {
    expect(guessDocType(name)).toBe(type)
  })
})
