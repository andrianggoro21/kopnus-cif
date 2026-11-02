import { Link, Route, Routes } from 'react-router'
import ApplyPage from '@/pages/ApplyPage'
import ResultPage from '@/pages/ResultPage'

function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <Link to="/" className="font-medium text-primary underline underline-offset-4">
        Kembali ke formulir pengajuan
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link to="/" className="font-bold tracking-tight text-primary">
            Pengajuan Pinjaman Anggota
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<ApplyPage />} />
          <Route path="/applications/:applicationId" element={<ResultPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
