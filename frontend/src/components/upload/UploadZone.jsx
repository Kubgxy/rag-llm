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
    progressText, // 👈 1. ดึง progressText จาก hook มาใช้งาน
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
        onClick={() => !isUploading && fileInputRef.current?.click()} 
        className={`
          relative rounded-3xl border-2 border-dashed p-10 text-center
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

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-widest ml-1">
            {t('uploadYourDocuments')}
          </p>
          {documents.map((doc, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-white dark:bg-surface-900/50 border border-surface-200 dark:border-surface-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                 <FileText className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                  {doc.name}
                </span>
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  {new Date(doc.uploadedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}