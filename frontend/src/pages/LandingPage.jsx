import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore.js'
import { useThemeStore } from '../stores/themeStore.js'
import {
  MessageSquare, FileText, Zap, Globe, ArrowRight, Sun, Moon,
  Brain, Layers, Search, BarChart3, ChevronRight, Sparkles, Shield
} from 'lucide-react'

function useScrollReveal() {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, isVisible]
}

function RevealSection({ children, className = '', delay = 0 }) {
  const [ref, isVisible] = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const features = [
    {
      icon: Brain,
      title: 'RAG Chat อัจฉริยะ',
      description: 'ถามคำถามเกี่ยวกับเอกสารของคุณ ระบบจะค้นหาบริบทที่เกี่ยวข้องและสร้างคำตอบที่แม่นยำ',
      gradient: 'from-blue-500 to-cyan-500',
      bgGlow: 'bg-blue-500/10',
    },
    {
      icon: Layers,
      title: 'วิเคราะห์เอกสาร PDF',
      description: 'อัปโหลด PDF แล้วได้สรุป, Mindmap และ Infographic อัตโนมัติ รองรับ OCR ภาษาไทย',
      gradient: 'from-emerald-500 to-teal-500',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      icon: BarChart3,
      title: 'Model Arena',
      description: 'เปรียบเทียบคำตอบจาก AI หลายโมเดลพร้อมกัน เลือกโมเดลที่ดีที่สุดสำหรับงานของคุณ',
      gradient: 'from-amber-500 to-orange-500',
      bgGlow: 'bg-amber-500/10',
    },
    {
      icon: Search,
      title: 'Web Search + RAG',
      description: 'ค้นหาข้อมูลจากเว็บและนำเข้าสู่ระบบ RAG เพิ่มความรู้ให้ AI ตอบได้ครอบคลุมขึ้น',
      gradient: 'from-rose-500 to-pink-500',
      bgGlow: 'bg-rose-500/10',
    },
  ]

  const steps = [
    {
      num: '01',
      title: 'อัปโหลดเอกสาร',
      description: 'ลากวางไฟล์ PDF เข้าสู่ระบบ AI จะประมวลผลและสร้าง Embeddings อัตโนมัติ',
      icon: FileText,
    },
    {
      num: '02',
      title: 'ถามคำถาม',
      description: 'พิมพ์คำถามเป็นภาษาไทยหรืออังกฤษ ระบบจะค้นหาบริบทและตอบกลับ',
      icon: MessageSquare,
    },
    {
      num: '03',
      title: 'รับผลลัพธ์',
      description: 'ได้คำตอบพร้อม Citations, สร้าง Mindmap, Slides หรือสรุปจากเอกสาร',
      icon: Sparkles,
    },
  ]

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 overflow-x-hidden">

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <MessageSquare className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-surface-900 dark:text-white tracking-tight">
              RAG-LLM
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500 dark:text-surface-400"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/workspace')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-500/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              >
                ไปที่ Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/auth')}
                  className="px-4 py-2.5 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  onClick={() => navigate('/auth')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-500/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  เริ่มต้นใช้งาน
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -left-32 w-[500px] h-[500px] bg-primary-400/15 dark:bg-primary-500/10 rounded-full blur-[100px] animate-float-slow" />
          <div className="absolute bottom-10 -right-32 w-[600px] h-[600px] bg-accent-400/10 dark:bg-accent-500/8 rounded-full blur-[120px] animate-float-slower" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-300/8 rounded-full blur-[80px] animate-float-medium" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <RevealSection>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/80 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-semibold mb-6 backdrop-blur-sm border border-primary-200/50 dark:border-primary-800/50">
              <Sparkles className="w-3.5 h-3.5" />
              ระบบวิเคราะห์เอกสารอัจฉริยะ
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-surface-900 dark:text-white leading-[1.1] tracking-tight mb-6">
              ถามคำถามกับ
              <span className="block bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent">
                เอกสารของคุณ
              </span>
            </h1>
          </RevealSection>

          <RevealSection delay={200}>
            <p className="text-lg md:text-xl text-surface-600 dark:text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              อัปโหลดเอกสาร PDF แล้วใช้ AI ช่วยวิเคราะห์ สรุป ตอบคำถาม
              และสร้างผลงานอัตโนมัติ — ทั้งหมดนี้ในที่เดียว
            </p>
          </RevealSection>

          <RevealSection delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/workspace' : '/auth')}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-2xl text-base font-semibold transition-all duration-300 shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30 hover:-translate-y-1 active:translate-y-0"
              >
                {isAuthenticated ? 'เปิด Workspace' : 'เริ่มต้นฟรี'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 rounded-2xl text-base font-semibold border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all hover:-translate-y-0.5 shadow-sm"
              >
                ดูฟีเจอร์ทั้งหมด
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </RevealSection>

          {/* Stats */}
          <RevealSection delay={400}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {[
                { value: 'RAG', label: 'Retrieval-Augmented Generation' },
                { value: 'Multi-Model', label: 'เปรียบเทียบหลายโมเดล' },
                { value: 'Thai NLP', label: 'รองรับภาษาไทยเต็มรูปแบบ' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-surface-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs text-surface-500 dark:text-surface-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100/60 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Zap className="w-3 h-3" />
                ฟีเจอร์หลัก
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-surface-900 dark:text-white mb-4">
                เครื่องมือครบครันสำหรับ<span className="text-primary-600 dark:text-primary-400">วิเคราะห์เอกสาร</span>
              </h2>
              <p className="text-surface-600 dark:text-surface-400 max-w-xl mx-auto">
                ทุกอย่างที่คุณต้องการ ตั้งแต่อัปโหลดเอกสาร ไปจนถึงสร้างผลงานอัตโนมัติ
              </p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <RevealSection key={i} delay={i * 100}>
                <div className="group relative bg-white dark:bg-surface-900/80 rounded-3xl p-8 border border-surface-200/60 dark:border-surface-800/60 hover:border-primary-300/60 dark:hover:border-primary-700/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/5 hover:-translate-y-1 overflow-hidden">
                  {/* Background glow on hover */}
                  <div className={`absolute -top-20 -right-20 w-40 h-40 ${feature.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-surface-600 dark:text-surface-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 lg:py-28 bg-surface-100/50 dark:bg-surface-900/30">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/60 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Globe className="w-3 h-3" />
                วิธีใช้งาน
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-surface-900 dark:text-white mb-4">
                เริ่มต้นได้ใน <span className="text-primary-600 dark:text-primary-400">3 ขั้นตอน</span>
              </h2>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <RevealSection key={i} delay={i * 150}>
                <div className="relative text-center group">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary-300 dark:from-primary-700 to-transparent" />
                  )}

                  <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 ring-4 ring-primary-100/50 dark:ring-primary-900/30">
                    <step.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="text-xs font-bold text-primary-500 dark:text-primary-400 mb-2 tracking-wider">
                    STEP {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-400/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-400/8 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealSection>
            <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-10 md:p-14 shadow-2xl shadow-primary-500/15 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                  backgroundSize: '28px 28px',
                }}
              />
              <div className="relative z-10">
                <Shield className="w-10 h-10 text-primary-200 mx-auto mb-5" />
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                  พร้อมเริ่มต้นหรือยัง?
                </h2>
                <p className="text-primary-100/80 mb-8 text-lg max-w-md mx-auto">
                  สมัครฟรี เริ่มอัปโหลดเอกสารและใช้ AI วิเคราะห์ได้ทันที
                </p>
                <button
                  onClick={() => navigate(isAuthenticated ? '/workspace' : '/auth')}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 rounded-2xl text-base font-bold transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0"
                >
                  {isAuthenticated ? 'เปิด Workspace' : 'สร้างบัญชีฟรี'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-surface-400 dark:text-surface-500 text-sm">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <span>RAG-LLM Workspace</span>
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            © {new Date().getFullYear()} RAG-LLM. สร้างด้วย ❤️ สำหรับการวิเคราะห์เอกสารอัจฉริยะ
          </p>
        </div>
      </footer>
    </div>
  )
}
