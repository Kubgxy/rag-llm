import { useState, useCallback } from 'react'
import { uploadDocument } from '../services/api.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useToast } from '../components/ui/Toast.jsx'

export function useUpload() {
  const [isDragging, setIsDragging] = useState(false)
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

      try {
        const data = await uploadDocument(file)
        setUploadResult({
          fileName: file.name,
          summary: data.summary,
          nodes: data.nodes || [],
          edges: data.edges || [],
        })
        addToast(`"${file.name}" uploaded successfully!`, 'success')
      } catch (err) {
        setUploadError(err.message)
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
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  }
}
