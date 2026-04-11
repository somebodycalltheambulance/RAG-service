import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileText, ImageIcon, FileType } from 'lucide-react'
import { api } from '../api'
import type { Document } from '../types'
import { useToast } from './Toast'

interface Props {
  onUploaded: (doc: Document) => void
}

export function DocumentUpload({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const upload = async (file: File) => {
    setLoading(true)
    setUploadedFile(file.name)
    try {
      const result = await api.uploadDocument(file)
      onUploaded({
        document_id: result.document_id,
        filename: result.filename,
        created_at: new Date().toISOString(),
      })
      toast.success(`${result.filename} — ${result.chunks_count} чанков`)
    } catch (e: unknown) {
      const err = e as { detail?: string; status?: number }
      toast.error(err.status === 409 ? 'Этот документ уже загружен' : (err.detail ?? 'Ошибка загрузки'))
    } finally {
      setLoading(false)
      setUploadedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !loading && inputRef.current?.click()}
      animate={{ scale: dragging ? 1.02 : 1, borderColor: dragging ? '#6366f1' : undefined }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center overflow-hidden
        ${loading ? 'cursor-wait' : 'cursor-pointer'}
        ${dragging
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400'
          : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-700'
        } transition-colors`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }}
      />

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 to-purple-100/60 dark:from-indigo-900/30 dark:to-purple-900/30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-indigo-200 dark:border-indigo-800 border-t-indigo-600"
                style={{ borderWidth: 3, borderStyle: 'solid' }}
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Загружаю <span className="font-medium text-slate-700 dark:text-slate-200">{uploadedFile}</span>…
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={dragging ? { y: [-4, 0, -4] } : { y: 0 }}
                transition={{ duration: 0.8, repeat: dragging ? Infinity : 0 }}
                className={`p-3 rounded-2xl ${dragging ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-white dark:bg-slate-700 shadow-sm'}`}
              >
                <UploadCloud size={28} className={dragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
              </motion.div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {dragging ? 'Отпусти файл' : 'Перетащи или нажми'}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">TXT, PDF, JPG, PNG, WEBP</p>
              </div>
              <div className="flex gap-2 mt-1">
                {[FileText, FileType, ImageIcon].map((Icon, i) => (
                  <div key={i} className="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                    <Icon size={14} className="text-slate-400 dark:text-slate-500" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
