import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ApplyPage from './ApplyPage'

function ResultStub() {
  return <p>hasil {useParams().applicationId}</p>
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ApplyPage />} />
          <Route path="/applications/:applicationId" element={<ResultStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nama lengkap'), '  Budi Santoso ')
  await user.type(screen.getByLabelText('NIK'), '3171 0115 0490 0001')
  fireEvent.change(screen.getByLabelText('Tanggal lahir'), { target: { value: '1990-04-15' } })
  await user.type(screen.getByLabelText('Nomor HP (opsional)'), '0812-3456-7890')
  await user.selectOptions(screen.getByLabelText('Status perkawinan'), 'KAWIN')
  await user.type(screen.getByLabelText('Nama pasangan'), 'Siti Aminah')
  await user.selectOptions(screen.getByLabelText('Jenis pinjaman'), 'KTA')
  await user.type(screen.getByLabelText('Jumlah pinjaman'), '50000000')
  await user.selectOptions(screen.getByLabelText('Tenor'), '12')
}

it('shows field errors on blur and does not call the API when invalid', async () => {
  const user = renderPage()

  await user.type(screen.getByLabelText('NIK'), '317101150490000')
  await user.tab()
  expect(await screen.findByText('NIK harus 16 digit angka.')).toBeInTheDocument()
  expect(screen.getByLabelText('NIK')).toHaveAttribute('aria-invalid', 'true')

  await user.click(screen.getByRole('button', { name: 'Periksa data' }))

  expect(await screen.findByText('Nama lengkap wajib diisi.')).toBeInTheDocument()
  expect(screen.getByLabelText('Nama lengkap')).toHaveFocus()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('formats the loan amount with thousand separators', async () => {
  const user = renderPage()

  await user.type(screen.getByLabelText('Jumlah pinjaman'), '50000000')

  expect(screen.getByLabelText('Jumlah pinjaman')).toHaveValue('50.000.000')
})

it('disables spouse fields unless married and clears the name when forgotten', async () => {
  const user = renderPage()
  const spouse = screen.getByLabelText('Nama pasangan')

  expect(spouse).toBeDisabled()
  await user.selectOptions(screen.getByLabelText('Status perkawinan'), 'KAWIN')
  await user.type(spouse, 'Siti')
  await user.click(screen.getByLabelText('Saya lupa nama pasangan'))

  expect(spouse).toHaveValue('')
  expect(spouse).toBeDisabled()
})

it('submits the normalized body, stores the token and opens the result', async () => {
  fetchMock.mockResolvedValue(
    json(201, { data: { application_id: 'APP-20261102-0001', access_token: 'secret', decision: 'PASS' } }),
  )
  const user = renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Periksa data' }))

  expect(await screen.findByText('hasil APP-20261102-0001')).toBeInTheDocument()
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/cif/check')
  expect(JSON.parse(init.body)).toEqual({
    full_name: 'Budi Santoso',
    nik: '3171011504900001',
    dob: '1990-04-15',
    phone: '081234567890',
    marital_status: 'KAWIN',
    spouse_name: 'Siti Aminah',
    spouse_forgotten: false,
    loan_type: 'KTA',
    loan_amount: 50000000,
    loan_tenor_months: 12,
  })
  expect(sessionStorage.getItem('cif-token:APP-20261102-0001')).toBe('secret')
})

it('maps 422 errors from the server onto fields', async () => {
  fetchMock.mockResolvedValue(
    json(422, { message: 'Data tidak valid.', errors: { nik: ['NIK harus 16 digit angka.'] } }),
  )
  const user = renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Periksa data' }))

  expect(await screen.findByText('NIK harus 16 digit angka.')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByLabelText('NIK')).toHaveFocus())
})

it('shows a retry banner when the service is unavailable and keeps the form', async () => {
  fetchMock
    .mockResolvedValueOnce(json(503, { message: 'Layanan data nasabah sedang tidak dapat dihubungi.' }))
    .mockResolvedValueOnce(json(201, { data: { application_id: 'APP-20261102-0002', decision: 'PASS' } }))
  const user = renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Periksa data' }))

  expect(await screen.findByText('Layanan data nasabah sedang tidak dapat dihubungi.')).toBeInTheDocument()
  expect(screen.getByLabelText('Nama lengkap')).toHaveValue('  Budi Santoso ')

  await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

  expect(await screen.findByText('hasil APP-20261102-0002')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('asks the user to wait when throttled', async () => {
  fetchMock.mockResolvedValue(json(429, { message: 'Too Many Attempts.' }))
  const user = renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Periksa data' }))

  expect(await screen.findByText('Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.')).toBeInTheDocument()
})
