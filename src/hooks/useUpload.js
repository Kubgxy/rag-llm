import { useState, useCallback } from 'react'
import { uploadDocument, checkDocumentStatus } from '../services/api.js' // เพิ่ม checkDocumentStatus
import { useDocumentStore } from '../stores/documentStore.js'
import { useToast } from '../components/ui/Toast.jsx'

export function useUpload() {
  const [isDragging, setIsDragging] = useState(false)
  // [เพิ่ม] state สำหรับบอกว่าตอนนี้ระบบกำลังทำอะไรอยู่
  const [progressText, setProgressText] = useState('') 
  const { setUploading, setUploadResult, setUploadError, isUploading } = useDocumentStore()
  const { addToast } = useToast()

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

      if (file.type !== 'application/pdf') {
        addToast('Please upload a PDF file only.', 'error')
        return
      }

      if (file.size > 50 * 1024 * 1024) {
        addToast('File size must be under 50 MB.', 'error')
        return
      }

      setUploading(true)
      setProgressText('กำลังอัปโหลดไฟล์ไปที่ Server...')

      try {
        // 1. โยนไฟล์ไป Backend (ได้กลับมาแค่ filename ทันที)
        const data = await uploadDocument(file)
        const filename = data.filename

        addToast(`อัปโหลด "${file.name}" สำเร็จ! กำลังประมวลผลเบื้องหลัง...`, 'success')
        setProgressText('AI กำลังอ่านและสรุปเอกสาร (อาจใช้เวลา 1-3 นาที)...')

        // 2. เริ่มระบบ Polling ถามสถานะทุกๆ 5 วินาที
        const pollInterval = setInterval(async () => {
          try {
            const statusData = await checkDocumentStatus(filename)

            if (statusData.status === 'completed') {
              // ถ้าเสร็จแล้ว เคลียร์ลูปแล้วเซฟข้อมูลลง Store
              clearInterval(pollInterval)
              setUploadResult({
                fileName: file.name,
                summary: statusData.summary,
                nodes: statusData.mindmap?.nodes || [],
                edges: statusData.mindmap?.edges || [],
              })
              setUploading(false)
              setProgressText('')
              addToast('เรียนรู้เอกสารและสร้าง Mindmap สำเร็จ!', 'success')
              
            } else if (statusData.status === 'error') {
              clearInterval(pollInterval)
              setUploadError(statusData.message || 'Error processing document')
              setUploading(false)
              setProgressText('')
              addToast('เกิดข้อผิดพลาดในการอ่านไฟล์', 'error')
            }
            // ถ้ายังเป็น 'processing' ก็ปล่อยให้มันรอต่อไป
            
          } catch (pollErr) {
            console.error('Polling error:', pollErr)
            clearInterval(pollInterval)
            setUploadError('ขาดการเชื่อมต่อกับ Server')
            setUploading(false)
            setProgressText('')
            addToast('การเชื่อมต่อขาดหาย', 'error')
          }
        }, 5000)

      } catch (err) {
        setUploadError(err.message)
        setUploading(false)
        setProgressText('')
        addToast(err.message || 'Upload failed', 'error')
      }
    },
    [setUploading, setUploadResult, setUploadError, addToast]
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