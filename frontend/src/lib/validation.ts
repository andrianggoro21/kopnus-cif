import { z } from 'zod'
import type { LoanType, MaritalStatus } from '@/types'

export const MARITAL_STATUSES = ['BELUM_KAWIN', 'KAWIN', 'CERAI'] as const satisfies readonly MaritalStatus[]
export const LOAN_TYPES = ['KTA', 'KPR', 'KKB', 'MODAL_KERJA'] as const satisfies readonly LoanType[]
export const TENORS = [6, 12, 24, 36, 48, 60]
export const MIN_AMOUNT = 5_000_000
export const MAX_AMOUNT = 500_000_000
export const MAX_FILES = 5
export const MAX_FILE_BYTES = 20 * 1024 * 1024

const NAME_PATTERN = /^[\p{L}\s.,'-]+$/u
const PHONE_PATTERN = /^(08|628|\+628)\d{8,11}$/
const FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']
const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

const charCount = (s: string) => [...s].length

export const localToday = () => {
  const d = new Date()
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-')
}

const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

const nameLengthOk = (v: string) => charCount(v) >= 3 && charCount(v) <= 100
const lengthMessage = (label: string) => `${label} harus 3–100 karakter.`
const patternMessage = (label: string) =>
  `${label} hanya boleh berisi huruf, spasi, titik, koma, apostrof, dan tanda hubung.`

export const applicantSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, 'Nama lengkap wajib diisi.')
      .refine(nameLengthOk, lengthMessage('Nama lengkap'))
      .regex(NAME_PATTERN, patternMessage('Nama lengkap')),
    nik: z
      .string()
      .transform((s) => s.replace(/\s/g, ''))
      .pipe(
        z
          .string()
          .min(1, 'NIK wajib diisi.')
          .regex(/^\d{16}$/, 'NIK harus 16 digit angka.'),
      ),
    dob: z
      .string()
      .min(1, 'Tanggal lahir wajib diisi.')
      .refine(isRealDate, 'Tanggal lahir harus tanggal valid (YYYY-MM-DD).')
      .refine((v) => v <= localToday(), 'Tanggal lahir tidak boleh di masa depan.'),
    phone: z
      .string()
      .transform((s) => s.replace(/[\s-]/g, ''))
      .refine((v) => !v || PHONE_PATTERN.test(v), 'Nomor HP harus diawali 08, 628, atau +628 dan berisi 10–14 digit.')
      .transform((v) => v || null),
    marital_status: z.string().pipe(z.enum(MARITAL_STATUSES, { error: 'Status perkawinan wajib diisi.' })),
    spouse_name: z
      .string()
      .trim()
      .refine((v) => !v || nameLengthOk(v), lengthMessage('Nama pasangan'))
      .refine((v) => !v || NAME_PATTERN.test(v), patternMessage('Nama pasangan'))
      .transform((v) => v || null),
    spouse_forgotten: z.boolean(),
    loan_type: z.string().pipe(z.enum(LOAN_TYPES, { error: 'Jenis kredit wajib diisi.' })),
    loan_amount: z
      .string()
      .min(1, 'Jumlah pinjaman wajib diisi.')
      .regex(/^\d+$/, 'Jumlah pinjaman harus bilangan bulat.')
      .transform(Number)
      .pipe(
        z
          .number()
          .min(MIN_AMOUNT, 'Jumlah pinjaman harus Rp5.000.000–Rp500.000.000.')
          .max(MAX_AMOUNT, 'Jumlah pinjaman harus Rp5.000.000–Rp500.000.000.'),
      ),
    loan_tenor_months: z
      .string()
      .min(1, 'Tenor wajib diisi.')
      .transform(Number)
      .pipe(z.number().refine((n) => TENORS.includes(n), 'Tenor harus 6, 12, 24, 36, 48, atau 60 bulan.')),
  })
  .refine((v) => !v.spouse_name || v.marital_status === 'KAWIN', {
    path: ['spouse_name'],
    message: 'Nama pasangan hanya diisi bila status KAWIN.',
    when: () => true,
  })
  .refine((v) => !v.spouse_name || !v.spouse_forgotten, {
    path: ['spouse_name'],
    message: 'Kosongkan nama pasangan bila memilih lupa nama pasangan.',
    when: () => true,
  })

export type FormValues = z.input<typeof applicantSchema>
export type CifCheckBody = z.output<typeof applicantSchema>

export function validateFile(file: File, acceptedCount: number): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!FILE_EXTENSIONS.includes(extension) || !FILE_TYPES.includes(file.type))
    return 'Tipe file tidak didukung (hanya JPG, PNG, PDF).'
  if (file.size > MAX_FILE_BYTES) return 'Ukuran file melebihi 20 MB.'
  if (acceptedCount >= MAX_FILES) return 'Maksimal 5 file per pengajuan.'
  return null
}
