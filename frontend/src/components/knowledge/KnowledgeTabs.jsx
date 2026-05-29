import { useEffect, useState } from 'react'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useToast } from '../ui/Toast.jsx'
import { generateKnowledgeAction, getSessionActions } from '../../services/api.js'
import Summary from './Summary.jsx'
import ActionResults from './ActionResults.jsx'
import { FileText, GitBranch, Sparkles, BarChart3, Presentation, Image } from 'lucide-react'

export default function KnowledgeTabs() {
  const { activeTab, setActiveTab, summary, actionResults, addActionResult } = useDocumentStore()
  const { t, lang } = useLanguageStore()
  const { addToast } = useToast()
  const [actionLoading, setActionLoading] = useState(null)
  
  // Modal states for multi-document selection & custom goals
  const [selectedAction, setSelectedAction] = useState(null)
  const [selectedFilesForAction, setSelectedFilesForAction] = useState([])
  const [selectedDetailLevel, setSelectedDetailLevel] = useState('concise')

  // Fetch document lists from Zustand store
  const documents = useDocumentStore((state) => state.documents || [])
  const importedWebSources = useDocumentStore((state) => state.importedWebSources || [])

  // Create unified selectable files list
  const availableFiles = [
    ...documents.map((doc) => ({
      name: doc.name,
      type: 'pdf',
      label: doc.name,
    })),
    ...importedWebSources.map((web) => ({
      name: web.source || web.title || web.url,
      type: 'web',
      label: web.title || web.source || web.url,
    })),
  ]

  // Handle persisted legacy tab value after mindmap tab removal.
  useEffect(() => {
    if (activeTab === 'mindmap') {
      setActiveTab('actions')
    }
  }, [activeTab, setActiveTab])

  const sessionId = useSessionStore((state) => state.sessionId)

  // ดึงข้อมูล Action ทั้งหมดของ session นี้จาก backend เมื่อโหลดแอปหรือสลับหน้าจอ (ป้องกันการหายไปเมื่อกด F5)
  useEffect(() => {
    if (!sessionId) return

    const { setActionResults } = useDocumentStore.getState()
    // ล้างข้อมูลเก่าทิ้งก่อนเพื่อป้องกันข้อมูลข้ามแชทรั่วไหล
    setActionResults([])

    const loadSavedActions = async () => {
      try {
        const results = await getSessionActions(sessionId)
        if (results && results.length > 0) {
          setActionResults(results)
        }
      } catch (err) {
        console.error('Failed to load saved session actions:', err)
      }
    }

    loadSavedActions()
  }, [sessionId])

  const ACTIONS = [
    {
      id: 'mindmap',
      label: t('knowledgeActionMindmap'),
      promptLabel: t('knowledgeActionPromptMindmap'),
      icon: GitBranch,
    },
    {
      id: 'chart',
      label: t('knowledgeActionChart'),
      promptLabel: t('knowledgeActionPromptChart'),
      icon: BarChart3,
    },
    {
      id: 'slides',
      label: t('knowledgeActionSlides'),
      promptLabel: t('knowledgeActionPromptSlides'),
      icon: Presentation,
    },
    {
      id: 'infographic',
      label: t('knowledgeActionInfographic'),
      promptLabel: t('knowledgeActionPromptInfographic'),
      icon: Image,
    },
  ]

  const handleActionClick = async (action, selectedFiles = [], detailLevel = 'concise') => {
    if (actionLoading) return

    const sessionId = useSessionStore.getState().getSessionId()
    if (!sessionId) {
      addToast(t('knowledgeActionSessionMissing'), 'error')
      return
    }

    setActionLoading(action.id)
    setSelectedAction(null) // ปิด Modal หลังจากกดตกลง

    try {
      const options = {
        language: lang,
        detailLevel: detailLevel,
      }
      
      // ส่งเฉพาะไฟล์ที่ผู้ใช้เลือก (ถ้ามี)
      if (selectedFiles && selectedFiles.length > 0) {
        options.selectedFiles = selectedFiles
      }

      const data = await generateKnowledgeAction(action.id, sessionId, options)

      addActionResult({
        id: data.id,
        actionType: action.id,
        title: data.title || action.label,
        answer: data.answer,
        modelName: data.model_name,
        citations: data.citations || [],
        createdAt: data.created_at || Date.now(),
      })

      setActiveTab('actions')
      addToast(t('knowledgeActionSuccess'), 'success')
    } catch (err) {
      addToast(err.message || t('knowledgeActionFailed'), 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const TABS = [
    { id: 'summary', label: t('knowledgeTabSummary'), icon: FileText },
    { id: 'actions', label: t('knowledgeTabActions'), icon: Sparkles },
  ]

  const hasContent = summary || actionResults.length > 0

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-500">
          {t('knowledgeEmptyTitle')}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          {t('knowledgeEmptySubtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl ">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-medium transition-all duration-200
              ${activeTab === id
                ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* One-click actions (show only in Actions tab) */}
      {activeTab === 'actions' && (
        <div className="mt-4">
          <p className="text-[13px] font-bold text-surface-500 dark:text-surface-400 ml-4 mb-2 px-1">
            {t('knowledgeActionTitle')}
          </p>
          <div className="grid grid-cols-2 gap-2 px-4 mb-2">
            {ACTIONS.map((action) => {
              const isBusy = actionLoading === action.id
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    // หากผู้ใช้เลือกทำ Presentation Slides หรือมีเอกสารมากกว่า 1 รายการ ให้เปิดหน้าต่างตั้งค่าก่อน
                    if (action.id === 'slides' || availableFiles.length > 1) {
                      setSelectedAction(action)
                      setSelectedFilesForAction([])
                      setSelectedDetailLevel('concise')
                    } else {
                      // หากทำแอคชันอื่น และมีเพียง 1 หรือ 0 เอกสาร ให้รันด่วนปกติ
                      handleActionClick(action, [], 'concise')
                    }
                  }}
                  disabled={Boolean(actionLoading)}
                  className={
                    `px-2 py-3 rounded-lg text-xs font-medium border transition-all ` +
                    `${isBusy
                      ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                      : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:shadow-sm'
                    } ` +
                    `${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="w-8 h-8" />
                    {isBusy ? t('knowledgeActionGenerating') : action.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 mt-4 min-h-0">
        {activeTab === 'summary' && <Summary />}
        {activeTab === 'actions' && <ActionResults />}
      </div>

      {/* Premium Multi-Document & Setting Selection Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-surface-100 dark:border-surface-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400">
                {(() => {
                  const ActionIcon = selectedAction.icon;
                  return <ActionIcon className="w-5 h-5" />;
                })()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                  {lang === 'th' ? `ตั้งค่าและเลือกเอกสารสำหรับสร้าง ${selectedAction.label}` : `Select documents & set options for ${selectedAction.label}`}
                </h3>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                  {lang === 'th' ? 'กำหนดรูปแบบและแหล่งข้อมูลที่ต้องการนำมาประมวลผล' : 'Select options and source documents to include'}
                </p>
              </div>
            </div>

            {/* ส่วนที่ 1: การเลือกระดับความละเอียด (เฉพาะสไลด์ Slides เท่านั้น) */}
            {selectedAction.id === 'slides' && (
              <div className="p-5 border-b border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
                <p className="text-xs font-bold text-surface-700 dark:text-surface-300 mb-2 flex items-center gap-1">
                  <span>⚙️</span>
                  {lang === 'th' ? 'ระดับความละเอียดของเนื้อหาในสไลด์' : 'Slide Content Detail Level'}
                </p>
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-100 dark:bg-surface-800/80 rounded-xl">
                  <button
                    onClick={() => setSelectedDetailLevel('concise')}
                    className={`
                      py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5
                      ${selectedDetailLevel === 'concise'
                        ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                      }
                    `}
                  >
                    <span>🎯</span>
                    {lang === 'th' ? 'ครอบคลุม / สรุปกระชับ' : 'Concise / General'}
                  </button>
                  <button
                    onClick={() => setSelectedDetailLevel('detailed')}
                    className={`
                      py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5
                      ${selectedDetailLevel === 'detailed'
                        ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                      }
                    `}
                  >
                    <span>⚡</span>
                    {lang === 'th' ? 'เจาะลึก / รายละเอียดแน่น' : 'Deep & Detailed'}
                  </button>
                </div>
                <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-2 pl-1 leading-relaxed">
                  {selectedDetailLevel === 'detailed'
                    ? (lang === 'th' 
                      ? '💡 โหมดรายละเอียดแน่น: ขยายความเนื้อหาแต่ละข้ออย่างกว้างขวาง 2-3 ประโยคเพื่ออธิบายประเด็นเชิงเทคนิค ตัวเลข และชื่อโครงการแบบจัดเต็ม' 
                      : '💡 Detailed Mode: Deep exhaustively long bullet points and summaries filled with statistics, technical details, and full paragraphs.')
                    : (lang === 'th' 
                      ? '💡 โหมดครอบคลุมกระชับ: เนื้อหา 1-2 บรรทัด เหมาะสำหรับการบรรยายที่เน้นสรุปใจความสำคัญแบบอ่านง่าย รวดเร็ว' 
                      : '💡 Concise Mode: Clean, quick-to-read overview statements tailored for high-level brief presentation layouts.')
                  }
                </p>
              </div>
            )}

            {/* ส่วนที่ 2: สรุปแหล่งข้อมูล / รายการเลือกเอกสาร */}
            {availableFiles.length > 1 ? (
              <div className="p-5 overflow-y-auto max-h-[220px] flex flex-col gap-2 border-b border-surface-100 dark:border-surface-800">
                <p className="text-xs font-bold text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-1">
                  <span>📂</span>
                  {lang === 'th' ? 'เลือกเอกสารที่ต้องการสกัดข้อมูล' : 'Select documents to extract content from'}
                </p>
                {availableFiles.map((file) => {
                  const isChecked = selectedFilesForAction.includes(file.name);
                  return (
                    <label
                      key={file.name}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200
                        ${isChecked 
                          ? 'bg-primary-50/50 dark:bg-primary-950/10 border-primary-300 dark:border-primary-800' 
                          : 'bg-surface-50 dark:bg-surface-800/40 border-transparent hover:border-surface-200 dark:hover:border-surface-700'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFilesForAction([...selectedFilesForAction, file.name]);
                          } else {
                            setSelectedFilesForAction(selectedFilesForAction.filter(name => name !== file.name));
                          }
                        }}
                        className="rounded border-surface-300 dark:border-surface-700 text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-surface-800 dark:text-surface-200 truncate">
                          {file.label}
                        </p>
                        <span className={`
                          inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded mt-1
                          ${file.type === 'pdf' 
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' 
                            : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                          }
                        `}>
                          {file.type.toUpperCase()}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : availableFiles.length === 1 ? (
              <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-800 flex items-center gap-3 bg-surface-50 dark:bg-surface-800/30">
                <div className={`
                  p-2 rounded-lg text-[10px] font-bold
                  ${availableFiles[0].type === 'pdf' 
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' 
                    : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                  }
                `}>
                  {availableFiles[0].type.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-surface-400 dark:text-surface-500 font-medium">
                    {lang === 'th' ? 'ดึงข้อมูลประมวลผลจากแหล่งข้อมูลเดี่ยว' : 'Extracting from single source'}
                  </p>
                  <p className="text-xs font-bold text-surface-800 dark:text-surface-200 truncate">
                    {availableFiles[0].label}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Helper info */}
            <div className="px-5 py-3 bg-surface-50 dark:bg-surface-800/30 text-[11px] text-surface-500 dark:text-surface-400 border-b border-surface-100 dark:border-surface-800 flex items-center gap-1.5">
              <span className="text-xs">💡</span>
              {selectedFilesForAction.length === 0 
                ? (lang === 'th' ? 'หากไม่เลือกไฟล์ใดเลย ระบบจะสรุปภาพรวมจากทุกเอกสาร' : 'If no files are selected, it will generate an overview of all documents.')
                : (lang === 'th' ? `จะสกัดข้อมูลจาก ${selectedFilesForAction.length} ไฟล์ที่เลือก` : `Will extract from ${selectedFilesForAction.length} selected file(s)`)}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-surface-50 dark:bg-surface-900 flex justify-end gap-2">
              <button
                onClick={() => setSelectedAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 dark:text-surface-400 hover:bg-surface-150 dark:hover:bg-surface-800 transition-colors"
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={() => handleActionClick(selectedAction, selectedFilesForAction, selectedDetailLevel)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors"
              >
                {lang === 'th' ? 'สร้างข้อมูลเชิงลึก' : 'Generate Insights'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
