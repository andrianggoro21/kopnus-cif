import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Application } from '@/types'
import ResultPage from './ResultPage'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.setItem('cif-token:APP-20261102-0001', 'secret')
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  sessionStorage.clear()
})

const application = (patch: Partial<Application>): Application => ({
  application_id: 'APP-20261102-0001',
  decision: 'PASS',
  identity_confidence: 100,
  credit_score: 85.456,
  status: 'COMPLETED',
  documents_required: false,
  loan: { type: 'KTA', amount: 50000000, tenor_months: 12 },
  documents: [],
  created_at: '2026-11-02T10:15:00+07:00',
  ...patch,
})

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/applications/APP-20261102-0001']}>
        <Routes>
          <Route path="/applications/:applicationId" element={<ResultPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )

it('loads the application with the stored token and shows numbers with two decimals', async () => {
  respond(200, { data: application({}) })
  renderPage()

  expect(await screen.findByText('Lolos pengecekan')).toBeInTheDocument()
  expect(screen.getByText('100%')).toBeInTheDocument()
  expect(screen.getByText('85,46')).toBeInTheDocument()
  expect(screen.getByText('Rp50.000.000')).toBeInTheDocument()
  expect(fetchMock.mock.calls[0][1].headers['X-Application-Token']).toBe('secret')
})

it('hides numbers and uploads for NOT PASS and offers a new application', async () => {
  respond(200, { data: application({ decision: 'NOT_PASS', identity_confidence: null, credit_score: null }) })
  renderPage()

  expect(await screen.findByText('Belum dapat diproses')).toBeInTheDocument()
  expect(screen.queryByText('Kecocokan identitas')).not.toBeInTheDocument()
  expect(screen.queryByText('Skor kredit')).not.toBeInTheDocument()
  expect(screen.queryByText('Dokumen pendukung')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ajukan ulang' })).toHaveAttribute('href', '/')
})

it('asks for documents on REFER', async () => {
  respond(200, { data: application({ decision: 'REFER', identity_confidence: 85, status: 'WAITING_DOCUMENTS' }) })
  renderPage()

  expect(await screen.findByText('Perlu verifikasi')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Dokumen pendukung' })).toBeInTheDocument()
})

it('explains a missing application', async () => {
  respond(404, { message: 'Pengajuan tidak ditemukan.' })
  renderPage()

  expect(await screen.findByRole('heading', { name: 'Pengajuan tidak ditemukan' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Buka formulir pengajuan' })).toHaveAttribute('href', '/')
})
