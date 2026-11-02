import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { DecisionStamp } from '@/components/DecisionStamp'
import { ResultSkeleton } from '@/components/ResultSkeleton'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError, getApplication } from '@/lib/api'
import { formatInteger, formatNumber2 } from '@/lib/format'
import { LOAN_LABELS } from '@/lib/labels'
import type { Application } from '@/types'

const submittedAt = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
})

const FILE_RULES = 'JPG, PNG, atau PDF. Maksimal 20 MB per file dan 5 file per pengajuan.'

function summary(application: Application): string {
  if (application.decision === 'PASS')
    return 'Data Anda cocok dengan data anggota. Pengajuan pinjaman dapat dilanjutkan.'
  if (application.decision === 'NOT_PASS')
    return 'Pengajuan belum dapat diproses. Silakan periksa kembali data Anda atau hubungi cabang terdekat.'
  if (application.status === 'IN_REVIEW') return 'Dokumen Anda sedang ditinjau analis kredit.'
  return 'Data Anda perlu diverifikasi oleh analis kredit. Unggah dokumen pendukung, lalu kirim untuk ditinjau.'
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold whitespace-nowrap">{value}</dd>
    </div>
  )
}

function NewApplicationLink({ children }: { children: string }) {
  return (
    <Button asChild size="lg" className="h-11 px-6 text-base">
      <Link to="/">{children}</Link>
    </Button>
  )
}

function ApplicationResult({ application }: { application: Application }) {
  const { decision, loan } = application

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8">
      <section className="flex flex-col gap-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8 lg:sticky lg:top-6">
        <div className="space-y-6">
          <h1 className="sr-only">Hasil pengecekan</h1>
          <DecisionStamp decision={decision} />
          <p className="max-w-prose text-lg text-pretty">{summary(application)}</p>
          {decision === 'NOT_PASS' && <NewApplicationLink>Ajukan ulang</NewApplicationLink>}
        </div>
        <dl className="grid gap-5 border-t pt-6 sm:grid-cols-2 lg:grid-cols-1">
          <Detail label="Nomor pengajuan" value={application.application_id} />
          <Detail label="Diajukan" value={submittedAt.format(new Date(application.created_at))} />
        </dl>
      </section>

      <div className="space-y-6">
        <section aria-labelledby="details-heading" className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <h2 id="details-heading" className="mb-6 text-lg font-semibold">
            Rincian pengajuan
          </h2>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {application.identity_confidence !== null && (
              <Detail label="Kecocokan identitas" value={`${formatNumber2(application.identity_confidence)}%`} />
            )}
            {application.credit_score !== null && (
              <Detail label="Skor kredit" value={formatNumber2(application.credit_score)} />
            )}
            <Detail label="Jenis pinjaman" value={LOAN_LABELS[loan.type]} />
            <Detail label="Jumlah pinjaman" value={`Rp${formatInteger(loan.amount)}`} />
            <Detail label="Tenor" value={`${loan.tenor_months} bulan`} />
          </dl>
        </section>

        {decision === 'PASS' && (
          <details className="rounded-2xl border bg-card shadow-sm">
            <summary className="cursor-pointer p-6 font-semibold sm:px-8">Unggah dokumen (opsional)</summary>
            <p className="border-t p-6 text-sm text-muted-foreground sm:px-8">{FILE_RULES}</p>
          </details>
        )}

        {decision === 'REFER' && (
          <section
            aria-labelledby="documents-heading"
            className="space-y-2 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
          >
            <h2 id="documents-heading" className="text-lg font-semibold">
              Dokumen pendukung
            </h2>
            <p className="text-sm text-muted-foreground">{FILE_RULES}</p>
          </section>
        )}
      </div>
    </article>
  )
}

export default function ResultPage() {
  const { applicationId = '' } = useParams()
  const query = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => getApplication(applicationId),
    retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
  })

  if (query.isPending) return <ResultSkeleton label="Memuat hasil pengajuan…" />

  if (query.isError) {
    const missing = query.error instanceof ApiError && [401, 404].includes(query.error.status)
    if (missing) {
      return (
        <div className="max-w-prose space-y-4">
          <h1 className="text-2xl font-bold">Pengajuan tidak ditemukan</h1>
          <p className="text-muted-foreground">
            Hasil pengajuan hanya bisa dibuka di tab tempat Anda mengajukan. Silakan ajukan pinjaman dari formulir.
          </p>
          <NewApplicationLink>Buka formulir pengajuan</NewApplicationLink>
        </div>
      )
    }
    return (
      <Alert variant="destructive" className="max-w-prose">
        <AlertTitle>Hasil pengajuan belum bisa dimuat</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Coba lagi
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  return <ApplicationResult application={query.data} />
}
