import type { Document, UploadResult, QueryResult } from './types'

const BASE_URL = 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, detail: body.detail ?? 'Ошибка' }
  }
  return res.json() as Promise<T>
}

export const api = {
  getDocuments: () => request<Document[]>('/documents/'),

  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadResult>('/documents/upload', { method: 'POST', body: form })
  },

  deleteDocument: (id: string) =>
    request<{ deleted: string }>(`/documents/${id}`, { method: 'DELETE' }),

  query: (question: string, top_k: number, document_id?: string) =>
    request<QueryResult>('/query/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, top_k, document_id: document_id || undefined }),
    }),
}
