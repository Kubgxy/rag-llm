import { useState, useCallback } from 'react'
import { uploadDocument, checkDocumentStatus } from '../services/api.js' // เพิ่ม checkDocumentStatus
import { useDocumentStore } from '../stores/documentStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useToast } from '../components/ui/Toast.jsx'
import { useLanguageStore } from '../stores/languageStore.js'

export function useUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [progressText, setProgressText] = useState('')
  const { setUploading, setUploadResult, setUploadError, isUploading } = useDocumentStore()
  const { addToast } = useToast()
  const t = useLanguageStore.getState().t
  // ✅ แก้: ดึง getSessionId จาก sessionStore แทน chatStore
  const getSessionId = useSessionStore((state) => state.getSessionId)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const processFile = useCallback(
    async (file) => {
      if (!file) return
      if (file.type !== 'application/pdf') { addToast(t('uploadPdfOnly'), 'error'); return }
      if (file.size > 50 * 1024 * 1024) { addToast(t('uploadSizeLimit'), 'error'); return }

      setUploading(true)
      setProgressText(t('uploadEmbeddingProgress'))

      try {
        // ✅ เรียก getSessionId() เพื่อดึง sessionId
        const sessionId = getSessionId()
        const data = await uploadDocument(file, sessionId)
        const filename = data.filename
        
        let isChatUnlocked = false; // 👈 ตัวแปรเช็กว่าปลดล็อกแชทไปหรือยัง

        // ตั้งเวลาถามเซิร์ฟเวอร์ทุกๆ 3 วินาที (ให้ไวขึ้นนิดนึง)
        const pollInterval = setInterval(async () => {
          try {
            const statusData = await checkDocumentStatus(sessionId, filename)

            // 🟢 จังหวะที่ 1: Embed เสร็จแล้ว ปลดล็อกแชทเลย!
            if (statusData.status === 'ready_for_chat' && !isChatUnlocked) {
              isChatUnlocked = true;
              setUploading(false); // เอาแถบโหลดหมุนๆ ออก
              setProgressText('');

              // ใส่ข้อมูลหลอกๆ ให้หน้าเว็บเปิดห้องแชทได้
              setUploadResult({
                fileName: file.name,
                summary: statusData.summary, // จะโชว์ข้อความ "⏳ AI กำลังสรุปเนื้อหา..."
                nodes: [], edges: [],
              });
              addToast(t('uploadReadyToast'), 'success');
            }

            // 🟢 จังหวะที่ 2: งานเบื้องหลังเสร็จหมดแล้ว
            else if (statusData.status === 'completed') {
              clearInterval(pollInterval); // หยุดการถามเซิร์ฟเวอร์
              // อัปเดต Summary และ Mindmap ตัวจริงเข้าไปทับ
              setUploadResult({
                fileName: file.name,
                summary: statusData.summary,
                nodes: statusData.mindmap?.nodes || [],
                edges: statusData.mindmap?.edges || [],
              });
              addToast(t('uploadSummaryReadyToast'), 'success');
            }
            
            // 🔴 กรณี Error
            else if (statusData.status === 'error') {
              clearInterval(pollInterval);
              setUploadError(statusData.message || 'Error processing document');
              if (!isChatUnlocked) setUploading(false);
              setProgressText('');
              addToast(t('uploadProcessingError'), 'error');
            }

          } catch (pollErr) {
            console.error('Polling error:', pollErr);
            clearInterval(pollInterval);
            setUploadError(t('uploadServerDisconnected'));
            if (!isChatUnlocked) setUploading(false);
            setProgressText('');
            addToast(t('uploadConnectionLost'), 'error');
          }
        }, 3000)

      } catch (err) {
        setUploadError(err.message)
        setUploading(false)
        setProgressText('')
        addToast(err.message || t('uploadFailed'), 'error')
      }
    },
    [setUploading, setUploadResult, setUploadError, addToast, getSessionId]
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      processFile(file)
    },
    [processFile]
  )

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files[0]
      processFile(file)
      e.target.value = ''
    },
    [processFile]
  )

  return {
    isDragging,
    isUploading,
    progressText, // ส่งตัวแปรนี้ออกไปให้หน้า UI แสดงผลด้วย
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  }
}