import { useRef } from 'react'
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react'
import { useUpload } from '../../hooks/useUpload.js'
import { useDocumentStore } from '../../stores/documentStore.js'

export default function UploadZone() {
  const fileInputRef = useRef(null)
  
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
        // 👈 2. ป้องกันไม่ให้กดเปิดหน้าต่างเลือกไฟล์ซ้ำตอนกำลังโหลดอยู่
        onClick={() => !isUploading && fileInputRef.current?.click()} 
        className={`
          relative rounded-2xl border-2 border-dashed p-8 text-center
          transition-all duration-300 group
          ${isDragging
            ? 'drag-active border-primary-500 bg-primary-500/10 scale-[1.02]'
            : 'border-surface-300 dark:border-surface-700 hover:border-primary-400 hover:bg-primary-500/5'
          }
          ${isUploading ? 'cursor-default border-primary-500/30 bg-primary-500/5' : 'cursor-pointer'}
        `}
      >
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
          // ⏳ UI ตอนกำลังโหลด (ปรับใหม่ให้ดูเคลื่อนไหวตลอดเวลา)
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
              {/* เพิ่มไอคอนวิ้งๆ ให้ดูเป็น AI มากขึ้น */}
              <Sparkles className="w-5 h-5 text-primary-400 absolute -top-1 -right-1 animate-pulse" /> 
            </div>
            
            <div className="space-y-1.5">
              {/* 👈 3. นำ progressText มาแสดงตรงนี้ ข้อความจะเปลี่ยนไปเรื่อยๆ */}
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 animate-pulse">
                {progressText || "กำลังประมวลผลเอกสาร..."}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                โปรดอย่าปิดหน้านี้ ระบบอาจใช้เวลา 1-3 นาที
              </p>
            </div>

            {/* 👈 4. แถบโหลดแบบวิ่งไปมา (Indeterminate Progress Bar) */}
            <div className="w-64 h-1.5 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden mt-2 relative">
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
          // 📥 UI ตอนปกติ
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <Upload className="w-7 h-7 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                คลิกเพื่อเลือกไฟล์ PDF หรือลากไฟล์มาวาง
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">
                รองรับไฟล์ PDF ขนาดไม่เกิน 50 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-500 dark:text-surface-500 uppercase tracking-wider">
            เอกสารที่อัปโหลดแล้ว
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