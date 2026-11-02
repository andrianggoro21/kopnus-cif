import type { Application } from '@/types'
import type { CifCheckBody } from './validation'

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

const tokenKey = (applicationId: string) => `cif-token:${applicationId}`

function saveToken(applicationId: string, token: string) {
  try {
    sessionStorage.setItem(tokenKey(applicationId), token)
  } catch {
    return
  }
}

function tokenFor(applicationId: string): string {
  try {
    return sessionStorage.getItem(tokenKey(applicationId)) ?? ''
  } catch {
    return ''
  }
}

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, { ...init, headers: { Accept: 'application/json', ...init.headers } })
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi Anda.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.message ?? 'Terjadi kesalahan pada server. Silakan coba lagi.',
      body?.errors,
    )
  }
  return response
}

async function data(response: Response): Promise<Application> {
  return (await response.json()).data
}

export async function checkCif(body: CifCheckBody): Promise<Application> {
  const application = await data(
    await send('/api/cif/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
  if (application.access_token) saveToken(application.application_id, application.access_token)
  delete application.access_token
  return application
}

export async function getApplication(id: string): Promise<Application> {
  return data(await send(`/api/cif/${encodeURIComponent(id)}`, { headers: { 'X-Application-Token': tokenFor(id) } }))
}

export async function submitApplication(id: string): Promise<Application> {
  return data(
    await send(`/api/cif/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      headers: { 'X-Application-Token': tokenFor(id) },
    }),
  )
}

export function applicationHeaders(applicationId: string): Record<string, string> {
  return { 'X-Application-Id': applicationId, 'X-Application-Token': tokenFor(applicationId) }
}

export async function fetchUpload(url: string, applicationId: string): Promise<Blob> {
  return (await send(url, { headers: applicationHeaders(applicationId) })).blob()
}
