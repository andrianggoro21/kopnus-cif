export type Decision = 'PASS' | 'REFER' | 'NOT_PASS'

export type DocType = 'KTP' | 'NPWP' | 'SLIP_GAJI' | 'BUKU_NIKAH' | 'LAINNYA'

export type MaritalStatus = 'BELUM_KAWIN' | 'KAWIN' | 'CERAI'

export type LoanType = 'KTA' | 'KPR' | 'KKB' | 'MODAL_KERJA'

export interface UploadedDoc {
  upload_id: number
  file_name: string
  doc_type: DocType
  status: 'COMPLETED'
  url: string
}

export interface Application {
  application_id: string
  access_token?: string
  decision: Decision
  identity_confidence: number | null
  credit_score: number | null
  status: 'COMPLETED' | 'WAITING_DOCUMENTS' | 'IN_REVIEW'
  documents_required: boolean
  loan: { type: LoanType; amount: number; tenor_months: number }
  documents: UploadedDoc[]
  created_at: string
}
