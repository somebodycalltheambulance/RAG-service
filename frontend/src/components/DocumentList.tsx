import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, FileType, Image, Trash2, FolderOpen } from 'lucide-react'
import { api } from '../api'
import type { Document } from '../types'
import { useToast } from './Toast'

interface Props {
  documents: Document[]
  onDeleted: (id: string) => void
}

function fileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileType size={16} className="text-red-400" />
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')) return <Image size={16} className="text-purple-400" />
  return <FileText size={16} className="text-blue-400" />
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DocumentList({ documents, onDeleted }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const toast = useToast()

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Удалить «${doc.filename}»?`)) return
    setDeleting(doc.document_id)
    try {
      await api.deleteDocument(doc.document_id)
      onDeleted(doc.document_id)
      toast.success(`«${doc.filename}» удалён`)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      toast.error(err.detail ?? 'Ошибка удаления')
    } finally {
      setDeleting(null)
    }
  }

  if (documents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2 py-10 text-slate-400 dark:text-slate-600"
      >
        <FolderOpen size={36} strokeWidth={1.5} />
        <p className="text-sm">Документы не загружены</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {documents.map((doc, i) => (
          <motion.div
            key={doc.document_id}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i * 0.04 }}
            layout
            className="group flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all"
          >
            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm shrink-0">
              {fileIcon(doc.filename)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{doc.filename}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(doc.created_at)}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleDelete(doc)}
              disabled={deleting === doc.document_id}
              className="shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-all"
            >
              {deleting === doc.document_id ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-red-200 dark:border-red-800 border-t-red-500 rounded-full"
                />
              ) : (
                <Trash2 size={16} />
              )}
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
