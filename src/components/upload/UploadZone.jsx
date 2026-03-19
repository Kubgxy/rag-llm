import { useRef } from 'react'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { useUpload } from '../../hooks/useUpload.js'
import { useDocumentStore } from '../../stores/documentStore.js'

export default function UploadZone() {
  const fileInputRef = useRef(null)
  const {
    isDragging,
    isUploading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  } = useUpload()
  const { documents } = useDocumentStore()

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center
          transition-all duration-300 group
          ${isDragging
            ? 'drag-active border-primary-500 bg-primary-500/10 scale-[1.02]'
            : 'border-surface-300 dark:border-surface-700 hover:border-primary-400 hover:bg-primary-500/5'
          }
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
              Processing document...
            </p>
            <div className="w-48 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <Upload className="w-7 h-7 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                Drop your PDF here
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">
                or click to browse · Max 50 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-500 dark:text-surface-500 uppercase tracking-wider">
            Uploaded Documents
          </p>
          {documents.map((doc, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700"
            >
              <FileText className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="text-sm text-surface-700 dark:text-surface-300 truncate flex-1">
                {doc.name}
              </span>
              <span className="text-xs text-surface-400">
                {new Date(doc.uploadedAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
