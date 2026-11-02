import type { DocType, LoanType, MaritalStatus } from '@/types'

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  BELUM_KAWIN: 'Belum kawin',
  KAWIN: 'Kawin',
  CERAI: 'Cerai',
}

export const LOAN_LABELS: Record<LoanType, string> = {
  KTA: 'KTA (tanpa agunan)',
  KPR: 'KPR (rumah)',
  KKB: 'KKB (kendaraan)',
  MODAL_KERJA: 'Modal kerja',
}

export const FILE_RULES = 'JPG, PNG, atau PDF. Maksimal 20 MB per file dan 5 file per pengajuan.'

export function guessDocType(name: string): DocType {
  const lower = name.toLowerCase()
  if (lower.includes('ktp')) return 'KTP'
  if (lower.includes('npwp')) return 'NPWP'
  if (lower.includes('slip') || lower.includes('gaji')) return 'SLIP_GAJI'
  if (lower.includes('nikah')) return 'BUKU_NIKAH'
  return 'LAINNYA'
}

export const DOC_LABELS: Record<DocType, string> = {
  KTP: 'KTP',
  NPWP: 'NPWP',
  SLIP_GAJI: 'Slip gaji',
  BUKU_NIKAH: 'Buku nikah',
  LAINNYA: 'Lainnya',
}
