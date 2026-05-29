import { useRef } from 'react'
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react'
import { useUpload } from '../../hooks/useUpload.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function UploadZone() {
  const fileInputRef = useRef(null)
  const { t } = useLanguageStore()
  
  const {
    isDragging,
    isUploading,
    progressText,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  } = useUpload()
  
  const { documents, setPreviewPdf } = useDocumentStore()

  // Calculate session storage usage
  const totalSizeBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0)
  const totalSizeMB = totalSizeBytes / (1024 * 1024)
  const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
  const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}
  const progressPercentage = Math.min(100, (totalSizeBytes / MAX_SIZE_BYTES) * 100)

      

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()} 
        className={`
          relative rounded-3xl border-2 border-dashed p-2 px-2 py-4 text-center
          transition-all duration-300 group overflow-hidden
          ${isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.02]'
            : 'border-surface-300 dark:border-surface-700 hover:border-primary-400 hover:bg-surface-50 dark:hover:bg-surface-900/50 hover:shadow-lg hover:shadow-primary-500/5'
          }
          ${isUploading ? 'cursor-default border-primary-500/30 bg-primary-500/5' : 'cursor-pointer'}
        `}
      >
        {/* Subtle background glow effect on hover */}
        {!isUploading && !isDragging && (
           <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/0 via-primary-500/0 to-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-5 py-4 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-14 h-14 text-primary-500 animate-spin relative z-10" />
              <Sparkles className="w-6 h-6 text-accent-400 absolute -top-2 -right-2 animate-bounce" /> 
            </div>
            
            <div className="space-y-2">
              <p className="text-base font-medium text-primary-600 dark:text-primary-400 animate-pulse">
                {progressText || t('uploadProcessingDefault')}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {t('uploadProcessingHint')}
              </p>
            </div>

            <div className="w-72 h-1.5 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden mt-3 relative">
              <div 
                className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary-500 to-transparent rounded-full"
                style={{ 
                  animation: 'slide 1.5s ease-in-out infinite' 
                }}
              />
              <style>{`
                @keyframes slide {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(200%); }
                }
              `}</style>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-900 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md transition-all duration-300">
              <Upload className="w-8 h-8 text-surface-600 dark:text-surface-400 group-hover:text-primary-500 transition-colors" />
            </div>
            <div>
              <p className="text-base font-semibold text-surface-900 dark:text-white">
                {t('uploadDropzoneTitle')}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1.5">
                {t('uploadDropzoneSubtitle')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Storage usage status bar */}
      {documents.length > 0 && (
        <div className="bg-surface-50 dark:bg-surface-900/30 border border-surface-200 dark:border-surface-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-surface-600 dark:text-surface-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              การใช้งานพื้นที่ในแชทนี้
            </span>
            <span>{documents.length} ไฟล์</span>
          </div>
          
          <div className="w-full h-1.5 bg-surface-200 dark:bg-surface-850 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-surface-500 dark:text-surface-400">
            <span>{totalSizeMB.toFixed(2)} MB</span>
            <span>ขีดจำกัด 50.0 MB</span>
          </div>
        </div>
      )}

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest ml-1">
            {t('uploadYourDocuments')}
          </p>
          <div className="grid gap-2">
            {documents.map((doc, i) => (
              <div
                key={i}
                onClick={() => setPreviewPdf(doc.name)}
                className="group flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-primary-400 dark:hover:border-primary-500/40 hover:shadow-sm cursor-pointer transition-all duration-200 select-none"
                title={`Click to open PDF: ${doc.name}`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                   <FileText className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-surface-800 dark:text-surface-200 truncate group-hover:text-primary-500 transition-colors">
                    {doc.name}
                  </span>
                  <span className="text-[10px] text-surface-400 dark:text-surface-500">
                    {formatFileSize(doc.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}