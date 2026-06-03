import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Palette,
  Smile,
  Cpu,
  Server,
  Sun,
  Moon,
  Globe,
  Layers3,
  Sparkles,
} from 'lucide-react'
import { useCategoryStore } from '../stores/categoryStore.js'
import { useChatStore } from '../stores/chatStore.js'
import { useLanguageStore } from '../stores/languageStore.js'
import { useRuntimeStore } from '../stores/runtimeStore.js'
import { useThemeStore } from '../stores/themeStore.js'
import { useToast } from '../components/ui/Toast.jsx'
import RestartProgress from '../components/ui/RestartProgress.jsx'
import RuntimeWarningDialog from '../components/ui/RuntimeWarningDialog.jsx'

const EMOJI_LIST = ['💼', '👤', '🔬', '📚', '🎯', '💡', '🎨', '🏠', '🚀', '⭐', '🔥', '💰', '🎓', '🏃', '🎵', '📝', '🌟', '🎮', '📊', '🛠️', '🍕', '✈️', '🏆', '❤️', '🌈', '🔔', '📱', '💻', '🎪', '🎭']

const COLOR_PRESETS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
]

const DEFAULT_FORM_DATA = { name: '', color: '#3b82f6', icon: '📁' }

export default function Settings() {
  const navigate = useNavigate()
  const { categories, createCategory, updateCategory, deleteCategory } = useCategoryStore()
  const { selectedModel, isLoading: chatLoading } = useChatStore()
  const { lang, t, toggleLanguage } = useLanguageStore()
  const { theme, toggleTheme } = useThemeStore()
  const { addToast } = useToast()
  const {
    device,
    isLoading: runtimeLoading,
    fetchRuntime,
    updateRuntime,
    isInitialized,
    activeRequests,
    restartStatus,
  } = useRuntimeStore()

  const uiText =
    lang === 'th'
      ? {
          sectionNavigator: 'โครงหน้า Settings',
          sectionNavigatorHint: 'เพิ่ม section ใหม่ได้ทันทีเมื่อมีฟังก์ชันใหม่',
          futureTitle: 'ส่วนขยายในอนาคต',
          futureSubtitle: 'พื้นที่เตรียมพร้อมสำหรับฟีเจอร์ใหม่ที่กำลังจะเพิ่ม',
          futureCards: [
            {
              title: 'API และ Integrations',
              description: 'เพิ่มการเชื่อมต่อบริการภายนอก, API key และ webhook ได้ในอนาคต',
            },
            {
              title: 'Notification & Policy',
              description: 'รองรับการแจ้งเตือน, quota และนโยบายการใช้งานรายทีม/รายโปรเจกต์',
            },
          ],
          runtimeSwitchedSuccess: 'Runtime สลับสำเร็จ!',
        }
      : {
          sectionNavigator: 'Settings Structure',
          sectionNavigatorHint: 'Add new sections quickly when new features arrive',
          futureTitle: 'Future Extensions',
          futureSubtitle: 'Reserved space for upcoming settings capabilities',
          futureCards: [
            {
              title: 'API and Integrations',
              description: 'Future space for external service keys, webhooks, and integrations',
            },
            {
              title: 'Notifications and Policies',
              description: 'Future support for alerts, quota controls, and team policies',
            },
          ],
          runtimeSwitchedSuccess: 'Runtime switched successfully!',
        }

  const sectionItems = [
    {
      id: 'runtime',
      icon: Cpu,
      title: t('settingsRuntimeTitle'),
      subtitle: t('settingsRuntimeSubtitle'),
    },
    {
      id: 'categories',
      icon: Layers3,
      title: t('settingsCategoryTitle'),
      subtitle: t('settingsCategorySubtitle'),
    },
    {
      id: 'future',
      icon: Sparkles,
      title: uiText.futureTitle,
      subtitle: uiText.futureSubtitle,
    },
  ]

  useEffect(() => {
    fetchRuntime().catch(() => {
      addToast(t('settingsRuntimeLoadError'), 'error')
    })
  }, [fetchRuntime, addToast, t])

  const emojiPickerRef = useRef(null)
  const colorPickerRef = useRef(null)

  const getCategoryLabel = (category) => {
    if (category.id === 'work') return t('categoryWork')
    if (category.id === 'personal') return t('categoryPersonal')
    if (category.id === 'research') return t('categoryResearch')
    return category.name
  }

  const tr = (key, vars = {}) => {
    let text = t(key)
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(`{${name}}`, String(value))
    })
    return text
  }

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [confirmRuntimeOpen, setConfirmRuntimeOpen] = useState(false)
  const [pendingRuntimeDevice, setPendingRuntimeDevice] = useState(null)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('runtime')
  const categoryEntries = Object.values(categories)
  const isFormValid = formData.name.trim().length > 0

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        target instanceof Node &&
        !emojiPickerRef.current.contains(target)
      ) {
        setShowEmojiPicker(false)
      }

      if (
        showColorPicker &&
        colorPickerRef.current &&
        target instanceof Node &&
        !colorPickerRef.current.contains(target)
      ) {
        setShowColorPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker, showColorPicker])

  const handleSectionSelect = (sectionId) => {
    setActiveSection(sectionId)
    document.getElementById('settings-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA)
    setShowEmojiPicker(false)
    setShowColorPicker(false)
  }

  const openCreateForm = () => {
    setEditingId(null)
    resetForm()
    setIsCreating(true)
  }

  const handleCreate = () => {
    const name = formData.name.trim()
    if (!name) return
    createCategory(name, formData.color, formData.icon)
    resetForm()
    setIsCreating(false)
  }

  const handleUpdate = (categoryId) => {
    const name = formData.name.trim()
    if (!name) return
    updateCategory(categoryId, { ...formData, name })
    setEditingId(null)
    resetForm()
  }

  const handleDelete = (categoryId) => {
    if (confirm(t('settingsDeleteConfirm'))) {
      deleteCategory(categoryId)
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, color: category.color, icon: category.icon })
    setShowEmojiPicker(false)
    setShowColorPicker(false)
    setIsCreating(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    resetForm()
  }

  const handleRuntimeSwitch = async (nextDevice) => {
    if (runtimeLoading || device === nextDevice) return

    setPendingRuntimeDevice(nextDevice)

    if (activeRequests > 0 || chatLoading) {
      setWarningDialogOpen(true)
      return
    }

    setConfirmRuntimeOpen(true)
  }

  const handleWaitAndSwitch = async () => {
    setWarningDialogOpen(false)
    const nextDevice = pendingRuntimeDevice

    if (!nextDevice) return

    try {
      await updateRuntime(nextDevice, selectedModel ? [selectedModel] : [], {
        waitForPending: true,
        force: false,
      })
    } catch (err) {
      addToast(err.message || t('settingsRuntimeUpdateError'), 'error')
    } finally {
      setPendingRuntimeDevice(null)
    }
  }

  const handleForceSwitch = async () => {
    setWarningDialogOpen(false)
    const nextDevice = pendingRuntimeDevice

    if (!nextDevice) return

    try {
      await updateRuntime(nextDevice, selectedModel ? [selectedModel] : [], {
        waitForPending: false,
        force: true,
      })
    } catch (err) {
      addToast(err.message || t('settingsRuntimeUpdateError'), 'error')
    } finally {
      setPendingRuntimeDevice(null)
    }
  }

  const confirmRuntimeSwitch = async () => {
    const nextDevice = pendingRuntimeDevice
    if (!nextDevice || runtimeLoading || device === nextDevice) {
      setConfirmRuntimeOpen(false)
      setPendingRuntimeDevice(null)
      return
    }

    setConfirmRuntimeOpen(false)

    try {
      await updateRuntime(nextDevice, selectedModel ? [selectedModel] : [])
    } catch (err) {
      addToast(err.message || t('settingsRuntimeUpdateError'), 'error')
    } finally {
      setPendingRuntimeDevice(null)
    }
  }

  const cancelRuntimeSwitch = () => {
    setConfirmRuntimeOpen(false)
    setPendingRuntimeDevice(null)
  }

  const handleRestartComplete = () => {
    addToast(uiText.runtimeSwitchedSuccess, 'success')
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-surface-50 via-primary-50/20 to-surface-100 dark:from-surface-950 dark:via-primary-950/10 dark:to-surface-900">
      {restartStatus !== 'idle' && <RestartProgress onComplete={handleRestartComplete} />}

      <RuntimeWarningDialog
        isOpen={warningDialogOpen}
        onClose={() => {
          setWarningDialogOpen(false)
          setPendingRuntimeDevice(null)
        }}
        onWait={handleWaitAndSwitch}
        onForce={handleForceSwitch}
        activeRequests={activeRequests || (chatLoading ? 1 : 0)}
        targetDevice={pendingRuntimeDevice}
      />

      <header className="sticky top-0 z-30 h-16 border-b border-surface-200/70 dark:border-surface-800/70 bg-white/85 dark:bg-surface-900/85 backdrop-blur-xl shadow-sm">
        <div className="max-w-8xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/workspace')}
            className="flex items-center gap-2 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-semibold">{t('settingsBackHome')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-600 dark:text-surface-400 font-semibold text-sm flex items-center gap-2"
              title={t('workspaceChangeLanguage')}
              aria-label="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-600 dark:text-surface-400"
              title={theme === 'dark' ? t('workspaceSwitchToLight') : t('workspaceSwitchToDark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-surface-900 dark:text-white mb-2">{t('settingsTitlePage')}</h1>
          <p className="text-surface-600 dark:text-surface-400">{t('settingsSubtitlePage')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <aside className="lg:sticky lg:top-24 self-start rounded-2xl border border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/70 backdrop-blur p-4">
            <p className="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400 font-bold">
              {uiText.sectionNavigator}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{uiText.sectionNavigatorHint}</p>

            <div className="mt-4 space-y-2">
              {sectionItems.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionSelect(section.id)}
                    aria-pressed={isActive}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      isActive
                        ? 'border-primary-200 dark:border-primary-700 bg-primary-50/70 dark:bg-primary-900/20'
                        : 'border-transparent hover:border-surface-200 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/60'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 font-semibold text-sm ${
                        isActive ? 'text-primary-700 dark:text-primary-300' : 'text-surface-800 dark:text-surface-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.title}
                    </div>
                    <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{section.subtitle}</p>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/70 p-3">
              <p className="text-xs text-surface-500 dark:text-surface-400">{t('settingsRuntimeCurrent')}</p>
              <p className="text-base font-bold uppercase text-surface-900 dark:text-white">
                {isInitialized ? device : t('settingsRuntimeLoading')}
              </p>
            </div>
          </aside>

          <div id="settings-content" className="space-y-6">
            {activeSection === 'runtime' && (
              <section
                id="runtime"
                className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-lg p-6 sm:p-8"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">{t('settingsRuntimeTitle')}</h2>
                  <p className="text-sm text-surface-500 dark:text-surface-400">{t('settingsRuntimeSubtitle')}</p>
                </div>

                <div className="p-5 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/70">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">{t('settingsRuntimeCurrent')}</p>
                      <p className="text-xl font-bold text-surface-900 dark:text-white uppercase">
                        {isInitialized ? device : t('settingsRuntimeLoading')}
                      </p>
                    </div>

                    <div className="inline-flex p-1.5 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                      <button
                        onClick={() => handleRuntimeSwitch('cpu')}
                        disabled={runtimeLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                          device === 'cpu'
                            ? 'bg-primary-600 text-white shadow'
                            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                        } ${runtimeLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <Cpu className="w-4 h-4" />
                        CPU
                      </button>
                      <button
                        onClick={() => handleRuntimeSwitch('gpu')}
                        disabled={runtimeLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                          device === 'gpu'
                            ? 'bg-primary-600 text-white shadow'
                            : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                        } ${runtimeLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <Server className="w-4 h-4" />
                        GPU
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">{t('settingsRuntimeHint')}</p>
                </div>
              </section>
            )}

            {activeSection === 'categories' && (
              <section
                id="categories"
                className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-lg p-6 sm:p-8"
              >
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">{t('settingsCategoryTitle')}</h2>
                    <p className="text-sm text-surface-500 dark:text-surface-400">{t('settingsCategorySubtitle')}</p>
                  </div>
                  {!isCreating && !editingId && (
                    <button
                      onClick={openCreateForm}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-semibold shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      {t('settingsAddCategory')}
                    </button>
                  )}
                </div>

                {(isCreating || editingId) && (
                  <div className="mb-6 p-6 bg-surface-50 dark:bg-surface-800 rounded-2xl border-2 border-primary-300 dark:border-primary-700">
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                      {isCreating ? t('settingsCreateCategory') : t('settingsEditCategory')}
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                          {t('settingsCategoryName')}
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('settingsCategoryNamePlaceholder')}
                          className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {t('settingsIcon')}
                          </label>
                          <div className="relative" ref={emojiPickerRef}>
                            <button
                              onClick={() => {
                                setShowEmojiPicker((prev) => !prev)
                                setShowColorPicker(false)
                              }}
                              className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl text-2xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors flex items-center justify-center gap-2"
                            >
                              {formData.icon}
                              <Smile className="w-4 h-4 text-surface-400" />
                            </button>

                            {showEmojiPicker && (
                              <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl p-4 z-20 max-h-64 overflow-y-auto">
                                <div className="grid grid-cols-6 gap-2">
                                  {EMOJI_LIST.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        setFormData({ ...formData, icon: emoji })
                                        setShowEmojiPicker(false)
                                      }}
                                      className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                            {t('settingsColor')}
                          </label>
                          <div className="relative" ref={colorPickerRef}>
                            <button
                              onClick={() => {
                                setShowColorPicker((prev) => !prev)
                                setShowEmojiPicker(false)
                              }}
                              className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors flex items-center gap-3"
                            >
                              <div
                                className="w-6 h-6 rounded-lg border-2 border-surface-200 dark:border-surface-600"
                                style={{ backgroundColor: formData.color }}
                              />
                              <span className="text-sm font-mono text-surface-700 dark:text-surface-300">{formData.color}</span>
                              <Palette className="w-4 h-4 ml-auto text-surface-400" />
                            </button>

                            {showColorPicker && (
                              <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl p-4 z-20">
                                <div className="grid grid-cols-5 gap-2 mb-3">
                                  {COLOR_PRESETS.map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => {
                                        setFormData({ ...formData, color })
                                        setShowColorPicker(false)
                                      }}
                                      className="w-10 h-10 rounded-lg border-2 border-surface-200 dark:border-surface-600 hover:scale-110 transition-transform"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                                <input
                                  type="color"
                                  value={formData.color}
                                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                  className="w-full h-10 rounded-lg cursor-pointer"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={isCreating ? handleCreate : () => editingId && handleUpdate(editingId)}
                          disabled={!isFormValid}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          {isCreating ? t('settingsCreate') : t('historySave')}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-5 py-2.5 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-xl transition-colors font-semibold"
                        >
                          <X className="w-4 h-4" />
                          {t('historyCancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {categoryEntries.length === 0 ? (
                    <p className="text-center py-12 text-surface-500 dark:text-surface-400">{t('settingsNoCategories')}</p>
                  ) : (
                    categoryEntries.map((category) => {
                      const isFixedCategory = ['work', 'personal', 'research'].includes(category.id)

                      return (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                              style={{ backgroundColor: `${category.color}20` }}
                            >
                              {category.icon}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-surface-900 dark:text-white truncate">{getCategoryLabel(category)}</h3>
                              <p className="text-xs text-surface-500 dark:text-surface-400 font-mono">{category.color}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(category)}
                              className="p-2 text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                              title={t('settingsEdit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className={`p-2 rounded-lg transition-all ${
                                isFixedCategory
                                  ? 'text-surface-300 dark:text-surface-600 cursor-not-allowed'
                                  : 'text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                              }`}
                              title={t('settingsDelete')}
                              disabled={isFixedCategory}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
            )}

            {activeSection === 'future' && (
              <section
                id="future"
                className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-lg p-6 sm:p-8"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">{uiText.futureTitle}</h2>
                  <p className="text-sm text-surface-500 dark:text-surface-400">{uiText.futureSubtitle}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {uiText.futureCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-dashed border-surface-300 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/60 p-4"
                    >
                      <p className="text-sm font-semibold text-surface-900 dark:text-white mb-1">{card.title}</p>
                      <p className="text-sm text-surface-500 dark:text-surface-400">{card.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {confirmRuntimeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelRuntimeSwitch} />
          <div className="relative w-full max-w-lg rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-2xl p-6">
            <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">{t('settingsRuntimeConfirmTitle')}</h3>
            <p className="text-sm text-surface-600 dark:text-surface-300 mb-4">
              {tr('settingsRuntimeConfirmMessage', {
                from: (device || '').toUpperCase(),
                to: (pendingRuntimeDevice || '').toUpperCase(),
              })}
            </p>

            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-4 mb-6">
              <p className="text-sm font-semibold text-surface-900 dark:text-white mb-1">{t('settingsRuntimeReasonTitle')}</p>
              <p className="text-sm text-surface-600 dark:text-surface-300">
                {pendingRuntimeDevice === 'gpu' ? t('settingsRuntimeReasonGPU') : t('settingsRuntimeReasonCPU')}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">{t('settingsRuntimeDurationWarning')}</p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelRuntimeSwitch}
                disabled={runtimeLoading}
                className="px-4 py-2 rounded-lg bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-800 dark:text-surface-200 font-medium"
              >
                {t('settingsRuntimeConfirmCancel')}
              </button>
              <button
                onClick={confirmRuntimeSwitch}
                disabled={runtimeLoading}
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60"
              >
                {runtimeLoading ? t('settingsRuntimeLoading') : t('settingsRuntimeConfirmApply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
