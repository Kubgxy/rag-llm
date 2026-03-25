import { X } from 'lucide-react'

export default function PdfViewerModal({ isOpen, onClose, fileUrl, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-11/12 h-[90vh] bg-surface-50 dark:bg-surface-900 rounded-2xl shadow-xl flex flex-col overflow-hidden border border-surface-200 dark:border-surface-700">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0 bg-white dark:bg-surface-950">
          <h3 className="font-semibold text-surface-800 dark:text-surface-200 truncate pr-4">
            {title || 'เอกสารต้นฉบับ'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Iframe */}
        <div className="flex-1 bg-surface-200 dark:bg-surface-950">
          <iframe 
            src={fileUrl} 
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        </div>

      </div>
    </div>
  )
}
