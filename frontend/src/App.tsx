import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Files, MessageSquare, Cpu, Activity, Sun, Moon } from 'lucide-react'
import { api } from './api'
import type { Document } from './types'
import { DocumentUpload } from './components/DocumentUpload'
import { DocumentList } from './components/DocumentList'
import { QueryPanel } from './components/QueryPanel'
import { ToastProvider } from './components/Toast'
import { useTheme } from './hooks/useTheme'

type Tab = 'documents' | 'query'

function App() {
  const [tab, setTab] = useState<Tab>('documents')
  const [documents, setDocuments] = useState<Document[]>([])
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const { isDark, toggle } = useTheme()

  useEffect(() => {
    api.getDocuments().then(setDocuments).catch(console.error)
    fetch('http://localhost:8000/health')
      .then((r) => r.json())
      .then((d) => setHealthy(d.status === 'ok'))
      .catch(() => setHealthy(false))
  }, [])

  const addDocument = (doc: Document) => setDocuments((prev) => [doc, ...prev])
  const removeDocument = (id: string) =>
    setDocuments((prev) => prev.filter((d) => d.document_id !== id))

  const tabs: { id: Tab; label: string; icon: typeof Files; badge?: number }[] = [
    { id: 'documents', label: 'Документы', icon: Files, badge: documents.length },
    { id: 'query', label: 'Вопрос', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 transition-colors duration-300">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 shadow-xl">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Cpu size={20} className="text-indigo-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">RAG Service</h1>
              <p className="text-xs text-indigo-300/70">llama-3.3-70b · all-MiniLM-L6-v2</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.div
              animate={healthy === true ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                ${healthy === true ? 'bg-emerald-500/20 text-emerald-300' : healthy === false ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-slate-400'}`}
            >
              <Activity size={12} />
              {healthy === true ? 'Online' : healthy === false ? 'Offline' : '…'}
            </motion.div>

            {/* Dark mode toggle */}
            <motion.button
              onClick={toggle}
              whileTap={{ scale: 0.9 }}
              className="relative w-14 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center px-1"
              aria-label="Toggle dark mode"
            >
              <motion.div
                layout
                animate={{ x: isDark ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isDark ? 'moon' : 'sun'}
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isDark
                      ? <Moon size={11} className="text-indigo-600" />
                      : <Sun size={11} className="text-amber-500" />
                    }
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto mt-8 px-4 pb-16">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl p-1.5 w-fit border border-slate-200 dark:border-slate-700 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative px-5 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {tab === t.id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative flex items-center gap-2 ${tab === t.id ? 'text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'}`}>
                <t.icon size={15} />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${tab === t.id ? 'bg-white/25 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'}`}>
                    {t.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="p-6"
            >
              {tab === 'documents' ? (
                <div className="space-y-6">
                  <DocumentUpload onUploaded={addDocument} />
                  {documents.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                      <div className="flex-1 border-t border-slate-100 dark:border-slate-700" />
                      <span>{documents.length} {documents.length === 1 ? 'документ' : 'документов'}</span>
                      <div className="flex-1 border-t border-slate-100 dark:border-slate-700" />
                    </div>
                  )}
                  <DocumentList documents={documents} onDeleted={removeDocument} />
                </div>
              ) : (
                <QueryPanel documents={documents} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function AppWithProviders() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  )
}
