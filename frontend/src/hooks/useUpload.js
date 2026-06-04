import { useState, useCallback } from 'react'
import { uploadDocument, checkDocumentStatus } from '../services/api.js'
import { useDocumentStore } from '../stores/documentStore.js'
import { useSessionStore } from '../stores/sessionStore.js'
import { useToast } from '../components/ui/Toast.jsx'
import { useLanguageStore } from '../stores/languageStore.js'
import { useChatStore } from '../stores/chatStore.js'
import { useChatHistoryStore } from '../stores/chatHistoryStore.js'

export function useUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [progressText, setProgressText] = useState('')
  const { setUploading, setUploadResult, setUploadError, isUploading } = useDocumentStore()
  const { addToast } = useToast()
  const t = useLanguageStore.getState().t
  const getSessionId = useSessionStore((state) => state.getSessionId)

  // Sync state to persistent session history
  const syncToHistory = useCallback((sessionId) => {
    setTimeout(() => {
      const currentMessages = useChatStore.getState().messages;
      const docStore = useDocumentStore.getState();
      const chatTitle = useSessionStore.getState().chatTitle;

      useChatHistoryStore.getState().saveSession(
        sessionId,
        currentMessages,
        {
          documents: docStore.documents,
          summary: docStore.summary,
          mindmapNodes: docStore.mindmapNodes,
          mindmapEdges: docStore.mindmapEdges,
          importedWebSources: docStore.importedWebSources,
        },
        chatTitle
      );
    }, 100);
  }, []);

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
      const allowedExtensions = ['.pdf', '.txt', '.md', '.docx', '.pptx', '.csv', '.xlsx']
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!allowedExtensions.includes(fileExtension)) { 
        addToast(t('uploadPdfOnly'), 'error'); 
        return 
      }

      // 🔧 Check total size limit
      const currentDocs = useDocumentStore.getState().documents || []

      // Limit to max 50 MB total size
      const currentTotalSize = currentDocs.reduce((sum, doc) => sum + (doc.size || 0), 0)
      const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
      
      if (currentTotalSize + file.size > MAX_TOTAL_SIZE_BYTES) {
        addToast(t('uploadTotalSizeLimitExceeded') || 'ไม่สามารถอัปโหลดได้ เนื่องจากขนาดไฟล์รวมในแชทนี้จะเกินขีดจำกัด 50 MB', 'error')
        return
      }

      setUploading(true)
      setProgressText(t('uploadEmbeddingProgress'))

      try {
        const sessionId = getSessionId()
        const data = await uploadDocument(file, sessionId)
        const filename = data.filename
        
        let isChatUnlocked = false;

        // ตั้งเวลาถามเซิร์ฟเวอร์ทุกๆ 3 วินาที
        const pollInterval = setInterval(async () => {
          try {
            const statusData = await checkDocumentStatus(sessionId, filename)

            // 🟢 จังหวะที่ 1: Embed เสร็จแล้ว ปลดล็อกแชทเลย!
            if (statusData.status === 'ready_for_chat' && !isChatUnlocked) {
              isChatUnlocked = true;
              setUploading(false);
              setProgressText('');

              setUploadResult({
                fileName: file.name,
                fileSize: file.size,
                summary: statusData.summary,
                nodes: [], edges: [],
              });
              
              syncToHistory(sessionId);
              addToast(t('uploadReadyToast'), 'success');
            }

            // 🟢 จังหวะที่ 2: งานเบื้องหลังเสร็จหมดแล้ว
            else if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              
              setUploadResult({
                fileName: file.name,
                fileSize: file.size,
                summary: statusData.summary,
                nodes: statusData.mindmap?.nodes || [],
                edges: statusData.mindmap?.edges || [],
              });
              
              syncToHistory(sessionId);
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
    [setUploading, setUploadResult, setUploadError, addToast, getSessionId, syncToHistory, t]
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
    progressText,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  }
}