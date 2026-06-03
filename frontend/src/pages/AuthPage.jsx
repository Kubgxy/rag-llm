import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore.js'
import { loginApi, registerApi, getMeApi } from '../services/api.js'
import { MessageSquare, Eye, EyeOff, ArrowRight, UserPlus, LogIn, AlertCircle, Sparkles, BookOpen, Zap } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const { isAuthenticated, setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/workspace'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          setError('รหัสผ่านไม่ตรงกัน')
          setIsSubmitting(false)
          return
        }
        if (form.password.length < 6) {
          setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
          setIsSubmitting(false)
          return
        }
        await registerApi(form.username, form.email, form.password)
        setSuccessMessage('สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...')
        // Auto login after register
        const tokens = await loginApi(form.username, form.password)
        setTokens(tokens.access_token, tokens.refresh_token)
        const user = await getMeApi()
        setUser(user)
      } else {
        const tokens = await loginApi(form.username, form.password)
        setTokens(tokens.access_token, tokens.refresh_token)
        const user = await getMeApi()
        setUser(user)
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
    setSuccessMessage(null)
    setForm({ username: '', email: '', password: '', confirmPassword: '' })
  }

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
      {/* Left Panel — Hero / Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        {/* Floating orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-32 right-16 w-96 h-96 bg-primary-300/15 rounded-full blur-3xl animate-float-slower" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-accent-400/10 rounded-full blur-2xl animate-float-medium" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">RAG-LLM</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
            วิเคราะห์เอกสาร<br />
            <span className="text-primary-200">ด้วยพลังของ AI</span>
          </h1>
          <p className="text-lg text-primary-100/80 leading-relaxed max-w-md mb-10">
            อัปโหลดเอกสาร ถามคำถาม และรับคำตอบอัจฉริยะจากโมเดล AI หลายตัว
            พร้อมสร้าง Mindmap, Slides และ Infographic อัตโนมัติ
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: BookOpen, text: 'รองรับเอกสาร PDF พร้อม OCR ภาษาไทย' },
              { icon: Sparkles, text: 'เปรียบเทียบ AI หลายโมเดลใน Arena Mode' },
              { icon: Zap, text: 'ค้นหาเว็บและนำข้อมูลเข้าระบบ RAG' },
            ].map(({ icon: Icon, text }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-primary-100/90"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-surface-900 dark:text-white">RAG-LLM</span>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-surface-900 rounded-3xl shadow-xl shadow-surface-900/5 dark:shadow-black/20 border border-surface-200/60 dark:border-surface-800/60 p-8 xl:p-10">
            {/* Mode toggle header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
                {mode === 'login' ? 'ยินดีต้อนรับกลับ' : 'สร้างบัญชีใหม่'}
              </h2>
              <p className="text-surface-500 dark:text-surface-400 text-sm">
                {mode === 'login'
                  ? 'เข้าสู่ระบบเพื่อเริ่มใช้งาน'
                  : 'สมัครสมาชิกเพื่อเริ่มวิเคราะห์เอกสาร'}
              </p>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="mb-6 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  placeholder="username"
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  autoComplete="username"
                />
              </div>

              {/* Email (register only) */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  mode === 'register' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  อีเมล
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required={mode === 'register'}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (register only) */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  mode === 'register' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required={mode === 'register'}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  autoComplete="new-password"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Mode switch */}
            <div className="mt-6 text-center">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {mode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}
                <button
                  onClick={switchMode}
                  className="ml-1.5 font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                </button>
              </p>
            </div>
          </div>

          {/* Back to landing */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              ← กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
