export interface Document {
  document_id: string
  filename: string
  created_at: string
}

export interface UploadResult {
  document_id: string
  filename: string
  chunks_count: number
}

export interface QueryResult {
  question: string
  answer: string
  chunks_used: number
  cached: boolean
}
