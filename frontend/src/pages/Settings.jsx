import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Pencil, Check, X, Palette, Smile } from 'lucide-react'
import { useCategoryStore } from '../stores/categoryStore.js'

const EMOJI_LIST = ['💼', '👤', '🔬', '📚', '🎯', '💡', '🎨', '🏠', '🚀', '⭐', '🔥', '💰', '🎓', '🏃', '🎵', '📝', '🌟', '🎮', '📊', '🛠️', '🍕', '✈️', '🏆', '❤️', '🌈', '🔔', '📱', '💻', '🎪', '🎭']

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
]

export default function Settings() {
  const navigate = useNavigate()
  const { categories, createCategory, updateCategory, deleteCategory } = useCategoryStore()

  // Form state
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6', icon: '📁' })
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleCreate = () => {
    if (!formData.name.trim()) return
    createCategory(formData.name, formData.color, formData.icon)
    setFormData({ name: '', color: '#3b82f6', icon: '📁' })
    setIsCreating(false)
  }

  const handleUpdate = (categoryId) => {
    if (!formData.name.trim()) return
    updateCategory(categoryId, formData)
    setEditingId(null)
    setFormData({ name: '', color: '#3b82f6', icon: '📁' })
  }

  const handleDelete = (categoryId) => {
    if (confirm('ต้องการลบหมวดหมู่นี้หรือไม่?')) {
      deleteCategory(categoryId)
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, color: category.color, icon: category.icon })
    setIsCreating(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData({ name: '', color: '#3b82f6', icon: '📁' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-primary-50/20 to-surface-100 dark:from-surface-950 dark:via-primary-950/10 dark:to-surface-900">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center px-4 shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-semibold">กลับหน้าหลัก</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-surface-900 dark:text-white mb-2">การตั้งค่า</h1>
          <p className="text-surface-600 dark:text-surface-400">จัดการหมวดหมู่และการตั้งค่าต่างๆ</p>
        </div>

        {/* Category Management Section */}
        <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">จัดการหมวดหมู่</h2>
              <p className="text-sm text-surface-500 dark:text-surface-400">เพิ่ม แก้ไข และจัดการหมวดหมู่ของแชท</p>
            </div>
            {!isCreating && !editingId && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-semibold shadow-md"
              >
                <Plus className="w-4 h-4" />
                เพิ่มหมวดหมู่
              </button>
            )}
          </div>

          {/* Create/Edit Form */}
          {(isCreating || editingId) && (
            <div className="mb-6 p-6 bg-surface-50 dark:bg-surface-800 rounded-2xl border-2 border-primary-300 dark:border-primary-700">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                {isCreating ? 'สร้างหมวดหมู่ใหม่' : 'แก้ไขหมวดหมู่'}
              </h3>

              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                    ชื่อหมวดหมู่
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น งานบริษัท A"
                    className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Icon & Color Pickers */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Icon Picker */}
                  <div>
                    <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                      ไอคอน
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-xl text-2xl hover:border-primary-400 dark:hover:border-primary-600 transition-colors flex items-center justify-center gap-2"
                      >
                        {formData.icon}
                        <Smile className="w-4 h-4 text-surface-400" />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl p-4 z-50 max-h-64 overflow-y-auto">
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

                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                      สี
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
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
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-2xl p-4 z-50">
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

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={isCreating ? handleCreate : () => handleUpdate(editingId)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-semibold"
                  >
                    <Check className="w-4 h-4" />
                    {isCreating ? 'สร้าง' : 'บันทึก'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-5 py-2.5 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 rounded-xl transition-colors font-semibold"
                  >
                    <X className="w-4 h-4" />
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-3">
            {Object.values(categories).length === 0 ? (
              <p className="text-center py-12 text-surface-500 dark:text-surface-400">
                ยังไม่มีหมวดหมู่ กดปุ่มเพิ่มหมวดหมู่เพื่อเริ่มต้น
              </p>
            ) : (
              Object.values(categories).map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-surface-900 dark:text-white">{category.name}</h3>
                      <p className="text-xs text-surface-500 dark:text-surface-400 font-mono">{category.color}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-2 text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                      title="แก้ไข"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      title="ลบ"
                      disabled={['work', 'personal', 'research'].includes(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
