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

export const DOC_LABELS: Record<DocType, string> = {
  KTP: 'KTP',
  NPWP: 'NPWP',
  SLIP_GAJI: 'Slip gaji',
  BUKU_NIKAH: 'Buku nikah',
  LAINNYA: 'Lainnya',
}
