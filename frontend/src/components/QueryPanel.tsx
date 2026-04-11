import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Zap, BookOpen, ChevronDown } from 'lucide-react'
import { api } from '../api'
import type { Document, QueryResult } from '../types'

interface Props {
  documents: Document[]
}

function TypingAnswer({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const i = useRef(0)

  useEffect(() => {
    i.current = 0
    setDisplayed('')
    const interval = setInterval(() => {
      i.current++
      setDisplayed(text.slice(0, i.current))
      if (i.current >= text.length) clearInterval(interval)
    }, 10)
    return () => clearInterval(interval)
  }, [text])

  return (
    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 align-text-bottom"
        />
      )}
    </p>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-indigo-400 dark:bg-indigo-500 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400">Думаю…</span>
    </div>
  )
}

export function QueryPanel({ documents }: Props) {
  const [question, setQuestion] = useState('')
  const [topK, setTopK] = useState(3)
  const [documentId, setDocumentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.query(question, topK, documentId || undefined)
      setResult(res)
    } catch (e: unknown) {
      const err = e as { detail?: string }
      setError(err.detail ?? 'Ошибка запроса')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all rounded-xl text-sm'

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as FormEvent) }}
            placeholder="Задай вопрос по документам…"
            rows={3}
            className={`${inputCls} w-full px-4 py-3 resize-none`}
          />
          <span className="absolute bottom-2 right-3 text-xs text-slate-300 dark:text-slate-600">⌘↵</span>
        </div>

        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-36">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">Документ</label>
            <div className="relative">
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className={`${inputCls} w-full appearance-none px-3 py-2 pr-8`}
              >
                <option value="">Все документы</option>
                {documents.map((doc) => (
                  <option key={doc.document_id} value={doc.document_id}>{doc.filename}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">Top-K</label>
            <input
              type="number"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className={`${inputCls} w-20 px-3 py-2 text-center`}
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading || !question.trim()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 hover:shadow-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-shadow"
          >
            <Send size={15} />
            Спросить
          </motion.button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 px-5 py-4"
          >
            <ThinkingDots />
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/60 to-purple-50/60 dark:from-indigo-900/20 dark:to-purple-900/20 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-indigo-100/70 dark:border-indigo-800/70 bg-white/50 dark:bg-slate-800/50">
              <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Ответ</span>
              <div className="ml-auto flex items-center gap-2">
                {result.cached && (
                  <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                    <Zap size={11} /> cached
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  <BookOpen size={11} /> {result.chunks_used} чанков
                </span>
              </div>
            </div>
            <div className="px-5 py-4">
              <TypingAnswer text={result.answer} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
