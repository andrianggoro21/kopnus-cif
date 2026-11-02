import { describe, expect, it } from 'vitest'
import { applicantSchema, type FormValues, validateFile } from './validation'

const validateForm = (v: FormValues) => {
  const result = applicantSchema.safeParse(v)
  const errors: Partial<Record<keyof FormValues, string>> = {}
  for (const issue of result.error?.issues ?? []) errors[issue.path[0] as keyof FormValues] ??= issue.message
  return errors
}

const toCheckBody = (v: FormValues) => applicantSchema.parse(v)

const valid: FormValues = {
  full_name: 'Budi Santoso',
  nik: '3171011504900001',
  dob: '1990-04-15',
  phone: '081234567890',
  marital_status: 'KAWIN',
  spouse_name: 'Siti Aminah',
  spouse_forgotten: false,
  loan_type: 'KTA',
  loan_amount: '50000000',
  loan_tenor_months: '12',
}

const localDate = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
}

const errorsFor = (patch: Partial<FormValues>) => validateForm({ ...valid, ...patch })

describe('validateForm', () => {
  it('accepts the base applicant', () => {
    expect(validateForm(valid)).toEqual({})
  })

  it.each<[string, Partial<FormValues>]>([
    ['name with title and comma', { full_name: 'Hj. Dewi Lestari, S.E.' }],
    ['name with apostrophe and hyphen', { full_name: "Ni Luh Putu-O'Neil" }],
    ['name with unicode letters', { full_name: 'José Müller' }],
    ['nik with spaces', { nik: '3171 0115 0490 0001' }],
    ['dob today', { dob: localDate(0) }],
    ['phone with +62, spaces and dashes', { phone: '+62 812-3456-7890' }],
    ['phone 628', { phone: '6281234567890' }],
    ['phone empty', { phone: '' }],
    ['single without spouse', { marital_status: 'BELUM_KAWIN', spouse_name: '' }],
    ['divorced without spouse', { marital_status: 'CERAI', spouse_name: '' }],
    ['spouse forgotten', { spouse_forgotten: true, spouse_name: '' }],
    ['married without spouse name', { spouse_name: '' }],
    ['minimum amount', { loan_amount: '5000000' }],
    ['maximum amount', { loan_amount: '500000000' }],
    ['tenor 60', { loan_tenor_months: '60' }],
  ])('accepts %s', (_, patch) => {
    expect(errorsFor(patch)).toEqual({})
  })

  it.each<[string, Partial<FormValues>, keyof FormValues]>([
    ['empty name', { full_name: '  ' }, 'full_name'],
    ['name too short', { full_name: 'Bu' }, 'full_name'],
    ['name too long', { full_name: 'a'.repeat(101) }, 'full_name'],
    ['name with digits', { full_name: 'Budi123' }, 'full_name'],
    ['nik 15 digits', { nik: '317101150490000' }, 'nik'],
    ['nik with letters', { nik: '317101150490000A' }, 'nik'],
    ['empty nik', { nik: '' }, 'nik'],
    ['empty dob', { dob: '' }, 'dob'],
    ['dob tomorrow', { dob: localDate(1) }, 'dob'],
    ['dob impossible date', { dob: '2026-02-30' }, 'dob'],
    ['dob wrong format', { dob: '15-04-1990' }, 'dob'],
    ['phone too short', { phone: '0812' }, 'phone'],
    ['phone wrong prefix', { phone: '021234567890' }, 'phone'],
    ['empty marital status', { marital_status: '', spouse_name: '' }, 'marital_status'],
    ['spouse while single', { marital_status: 'BELUM_KAWIN' }, 'spouse_name'],
    ['spouse while forgotten', { spouse_forgotten: true }, 'spouse_name'],
    ['spouse with digits', { spouse_name: 'Siti 2' }, 'spouse_name'],
    ['empty loan type', { loan_type: '' }, 'loan_type'],
    ['amount below minimum', { loan_amount: '4999999' }, 'loan_amount'],
    ['amount above maximum', { loan_amount: '500000001' }, 'loan_amount'],
    ['amount with decimals', { loan_amount: '5000000.5' }, 'loan_amount'],
    ['empty amount', { loan_amount: '' }, 'loan_amount'],
    ['tenor not in list', { loan_tenor_months: '18' }, 'loan_tenor_months'],
    ['empty tenor', { loan_tenor_months: '' }, 'loan_tenor_months'],
  ])('rejects %s', (_, patch, field) => {
    expect(Object.keys(errorsFor(patch))).toEqual([field])
  })

  it('uses Indonesian messages', () => {
    expect(errorsFor({ nik: '123' }).nik).toBe('NIK harus 16 digit angka.')
    expect(errorsFor({ full_name: '' }).full_name).toBe('Nama lengkap wajib diisi.')
  })
})

describe('toCheckBody', () => {
  it('normalizes values the same way the backend expects', () => {
    expect(
      toCheckBody({ ...valid, full_name: '  Budi Santoso ', nik: '3171 0115 0490 0001', phone: '+62 812-3456-7890' }),
    ).toEqual({
      full_name: 'Budi Santoso',
      nik: '3171011504900001',
      dob: '1990-04-15',
      phone: '+6281234567890',
      marital_status: 'KAWIN',
      spouse_name: 'Siti Aminah',
      spouse_forgotten: false,
      loan_type: 'KTA',
      loan_amount: 50000000,
      loan_tenor_months: 12,
    })
  })

  it('sends null for empty optional fields', () => {
    const body = toCheckBody({ ...valid, phone: '', spouse_name: '', spouse_forgotten: true })
    expect(body.phone).toBeNull()
    expect(body.spouse_name).toBeNull()
  })
})

describe('validateFile', () => {
  const MB = 1024 * 1024
  const file = (name: string, type: string, size = 1024) => {
    const f = new File([], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  it('accepts jpg, png and pdf', () => {
    expect(validateFile(file('ktp.JPG', 'image/jpeg'), 0)).toBeNull()
    expect(validateFile(file('ktp.jpeg', 'image/jpeg'), 0)).toBeNull()
    expect(validateFile(file('npwp.png', 'image/png'), 0)).toBeNull()
    expect(validateFile(file('slip.pdf', 'application/pdf'), 4)).toBeNull()
  })

  it('rejects unsupported extension', () => {
    expect(validateFile(file('setup.exe', 'application/pdf'), 0)).toBe(
      'Tipe file tidak didukung (hanya JPG, PNG, PDF).',
    )
  })

  it('rejects jpg with wrong content type', () => {
    expect(validateFile(file('ktp.jpg', 'text/plain'), 0)).toBe('Tipe file tidak didukung (hanya JPG, PNG, PDF).')
  })

  it('accepts exactly 20 MB', () => {
    expect(validateFile(file('big.pdf', 'application/pdf', 20 * MB), 0)).toBeNull()
  })

  it('rejects 20 MB plus one byte', () => {
    expect(validateFile(file('big.pdf', 'application/pdf', 20 * MB + 1), 0)).toBe('Ukuran file melebihi 20 MB.')
  })

  it('rejects the sixth file', () => {
    expect(validateFile(file('ktp.jpg', 'image/jpeg'), 5)).toBe('Maksimal 5 file per pengajuan.')
  })
})
