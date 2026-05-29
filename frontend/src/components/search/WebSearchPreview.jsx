import { useMemo, useState } from 'react'
import { ExternalLink, Loader2, Search, Download, Maximize2, X, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { searchWebPreview, importWebSources } from '../../services/api.js'
import { useDocumentStore } from '../../stores/documentStore.js'
import { useLanguageStore } from '../../stores/languageStore.js'
import { useSessionStore } from '../../stores/sessionStore.js'
import { useToast } from '../ui/Toast.jsx'
import { useChatHistoryStore } from '../../stores/chatHistoryStore.js'

export default function WebSearchPreview() {
  const { t } = useLanguageStore()
  const { addToast } = useToast()
  const getSessionId = useSessionStore((state) => state.getSessionId)
  const [queryInput, setQueryInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isExpandedViewOpen, setIsExpandedViewOpen] = useState(false)
  const [isAdditionalFieldsOpen, setIsAdditionalFieldsOpen] = useState(true)
  const [searchDepth, setSearchDepth] = useState('basic')
  const [searchTopic, setSearchTopic] = useState('general')
  const [maxResults, setMaxResults] = useState(5)
  const [timeRange, setTimeRange] = useState('none')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [country, setCountry] = useState('thailand')
  const [error, setError] = useState('')

  const {
    webSearchResults,
    selectedWebSourceUrls,
    setWebSearchResults,
    toggleWebSourceSelection,
    setAllWebSourceSelections,
    addImportedWebSources,
  } = useDocumentStore()

  const allChecked = useMemo(
    () => webSearchResults.length > 0 && selectedWebSourceUrls.length === webSearchResults.length,
    [webSearchResults, selectedWebSourceUrls]
  )
  const getFaviconUrl = (url) => {
    try {
      const hostname = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
    } catch {
      return null
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const trimmed = queryInput.trim()
    if (!trimmed || isSearching) return

    try {
      setIsSearching(true)
      setError('')
      const sessionId = getSessionId()
      const data = await searchWebPreview(
        trimmed,
        sessionId,
        searchDepth,
        maxResults,
        searchTopic,
        timeRange,
        startDate,
        endDate,
        country
      )
      setWebSearchResults({
        query: trimmed,
        results: data.results || [],
      })
    } catch (err) {
      setError(err.message || t('webSearchUnexpectedError'))
      setWebSearchResults({ query: trimmed, results: [] })
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async () => {
    if (isImporting || selectedWebSourceUrls.length === 0) return

    try {
      setIsImporting(true)
      setError('')
      const sessionId = getSessionId()
      const data = await importWebSources(selectedWebSourceUrls, sessionId)
      addToast(data.message || t('webSearchImportSuccess'), 'success')

      const importedSourcesFromApi = Array.isArray(data.imported_sources) ? data.imported_sources : []
      const importedSources = importedSourcesFromApi.length > 0
        ? importedSourcesFromApi
        : webSearchResults.filter((item) => selectedWebSourceUrls.includes(item.url))
      addImportedWebSources(importedSources)

      // Save summary of the imported web sources
      if (data.summary) {
        const lang = useLanguageStore.getState().lang
        const queryText = webSearchResults.query || 'Web Search'
        const webSearchTitle = lang === 'th'
          ? `🌐 สรุปเนื้อหาจากเว็บเสิร์จ: ${queryText}`
          : `🌐 Web Search Summary: ${queryText}`
        
        const sectionId = `summary-web-${queryText.replace(/\s+/g, '_')}`

        useDocumentStore.getState().updateSummary({
          sections: [{
            id: sectionId,
            title: webSearchTitle,
            content: data.summary,
            type: 'overview',
            icon: '🌐',
            order: 0
          }],
          metadata: {
            wordCount: data.summary.split(/\s+/).length,
            createdAt: Date.now()
          }
        })
      }

      setTimeout(() => {
        const docState = useDocumentStore.getState()
        const sessionState = useSessionStore.getState()
        useChatHistoryStore.getState().saveSession(
          sessionId,
          useChatHistoryStore.getState().history[sessionId]?.messages || [],
          {
            documents: docState.documents,
            summary: docState.summary,
            mindmapNodes: docState.mindmapNodes,
            mindmapEdges: docState.mindmapEdges,
            importedWebSources: docState.importedWebSources,
          },
          sessionState.chatTitle
        )
      }, 100)
    } catch (err) {
      const message = err.message || t('webSearchImportFailed')
      setError(message)
      addToast(message, 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const renderResults = (maxHeightClass) => (
    <div className={`overflow-y-auto space-y-2 pr-1 ${maxHeightClass}`}>
      {webSearchResults.map((item, index) => {
        const checked = selectedWebSourceUrls.includes(item.url)
        const favicon = getFaviconUrl(item.url)
        return (
          <div
            key={`${item.url}-${index}`}
            className="rounded-xl border border-surface-200 dark:border-surface-700 p-2.5 bg-surface-50 dark:bg-surface-900"
          >
            <div className="flex gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleWebSourceSelection(item.url)}
                className="mt-1 rounded border-surface-300 dark:border-surface-600"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {favicon ? (
                    <img
                      src={favicon}
                      alt=""
                      className="w-4 h-4 rounded-sm mt-0.5 shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-sm bg-emerald-500/25 mt-0.5 shrink-0" />
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-surface-800 dark:text-surface-100 hover:text-primary-500 line-clamp-2"
                    title={item.title}
                  >
                    {item.title}
                  </a>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 mt-1">
                  {item.snippet || t('webSearchSnippetFallback')}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 mt-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('webSearchOpenLink')}
                </a>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderModeControls = (className = '') => (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsAdditionalFieldsOpen(!isAdditionalFieldsOpen)}
        className="flex items-center gap-1.5 text-xs font-bold text-surface-500 dark:text-surface-400 hover:text-primary-500 transition-colors uppercase tracking-wider mb-2 mt-1 select-none"
      >
        <span className="transform transition-transform duration-200">
          {isAdditionalFieldsOpen ? '▲' : '▼'}
        </span>
        <span>{t('webSearchAdditionalFields') || 'Additional fields'}</span>
        <span>🔧</span>
      </button>

      {isAdditionalFieldsOpen && (
        <div className="grid grid-cols-2 gap-3.5 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-150 dark:border-surface-850 mt-1">
          {/* Target Country */}
          <div className="flex flex-col gap-1.5 col-span-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchCountryLabel') || 'Target Country'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "เลือกประเทศเพื่อเน้นผลลัพธ์การค้นหาภาษาท้องถิ่น" : "Filter search results by target country"}
              >
                i
              </span>
            </span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 cursor-pointer"
            >
              <option value="thailand">{t('webSearchCountryThailand') || 'Thailand 🇹🇭'}</option>
              <option value="us">{t('webSearchCountryUS') || 'United States 🇺🇸'}</option>
              <option value="gb">{t('webSearchCountryUK') || 'United Kingdom 🇬🇧'}</option>
              <option value="jp">{t('webSearchCountryJapan') || 'Japan 🇯🇵'}</option>
              <option value="kr">{t('webSearchCountrySouthKorea') || 'South Korea 🇰🇷'}</option>
              <option value="sg">{t('webSearchCountrySingapore') || 'Singapore 🇸🇬'}</option>
              <option value="global">{t('webSearchCountryGlobal') || 'Global 🌐'}</option>
            </select>
          </div>

          {/* Search topic */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchTopicLabel') || 'Search topic'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "หัวข้อการค้นหา (ทั่วไป หรือ ข่าวสาร)" : "Topic focus of the search"}
              >
                i
              </span>
            </span>
            <select
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 cursor-pointer"
            >
              <option value="general">{t('webSearchTopicGeneral') || 'general'}</option>
              <option value="news">{t('webSearchTopicNews') || 'news'}</option>
            </select>
          </div>

          {/* Search depth */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchDepthLabel') || 'Search depth'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "ความลึกของการค้นหา (แบบปกติ หรือ ลึกขึ้น)" : "Depth of the search results"}
              >
                i
              </span>
            </span>
            <select
              value={searchDepth}
              onChange={(e) => setSearchDepth(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 cursor-pointer"
            >
              <option value="basic">{t('webSearchDepthBasic') || 'basic'}</option>
              <option value="advanced">{t('webSearchDepthAdvanced') || 'advanced'}</option>
            </select>
          </div>

          {/* Max results */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchMaxResultsLabel') || 'Max results'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "จำนวนแหล่งข้อมูลสูงสุดที่จะค้นหา" : "Maximum search result entries"}
              >
                i
              </span>
            </span>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs select-none">
              <button
                type="button"
                onClick={() => setMaxResults(Math.max(1, maxResults - 1))}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded text-surface-500 dark:text-surface-400 font-extrabold hover:text-primary-500 transition-colors flex items-center justify-center"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-semibold text-surface-800 dark:text-surface-100 text-xs">{maxResults}</span>
              <button
                type="button"
                onClick={() => setMaxResults(Math.min(20, maxResults + 1))}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-700 rounded text-surface-500 dark:text-surface-400 font-extrabold hover:text-primary-500 transition-colors flex items-center justify-center"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Time range */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchTimeRangeLabel') || 'Time range'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "ช่วงเวลาจำกัดผลลัพธ์ข้อมูล" : "Time filter for results"}
              >
                i
              </span>
            </span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 cursor-pointer"
            >
              <option value="none">{t('webSearchTimeRangeNone') || 'none'}</option>
              <option value="day">{t('webSearchTimeRangeDay') || 'day'}</option>
              <option value="week">{t('webSearchTimeRangeWeek') || 'week'}</option>
              <option value="month">{t('webSearchTimeRangeMonth') || 'month'}</option>
              <option value="year">{t('webSearchTimeRangeYear') || 'year'}</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchStartDateLabel') || 'Start date'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "วันที่เริ่มต้นการค้นหา" : "Filter results starting from this date"}
              >
                i
              </span>
            </span>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 cursor-pointer"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-surface-600 dark:text-surface-300">
              {t('webSearchEndDateLabel') || 'End date'}
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-surface-200 dark:bg-surface-800 text-[9px] text-surface-500 cursor-help select-none font-bold"
                title={t('lang') === 'th' ? "วันที่สิ้นสุดการค้นหา" : "Filter results ending at this date"}
              >
                i
              </span>
            </span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500/40 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="mt-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900/60 p-3 flex flex-col min-h-[240px] max-h-[75vh]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            {t('webSearchTitle')}
          </p>
          <button
            type="button"
            onClick={() => setIsExpandedViewOpen(true)}
            className="p-1.5 rounded-lg text-surface-500 hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title={t('webSearchExpand')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={t('webSearchPlaceholder')}
            className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <button
            type="submit"
            disabled={isSearching || !queryInput.trim()}
            className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t('webSearchButton')}
          </button>
        </form>
        {renderModeControls('mb-3')}

        {error ? (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        ) : null}

        {webSearchResults.length > 0 ? (
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => setAllWebSourceSelections(e.target.checked)}
                  className="rounded border-surface-300 dark:border-surface-600"
                />
                <span>{t('webSearchSelectAll')}</span>
                <span className="text-surface-400">
                  ({selectedWebSourceUrls.length}/{webSearchResults.length})
                </span>
              </label>
              <button
                type="button"
                disabled={isImporting || selectedWebSourceUrls.length === 0}
                onClick={handleImport}
                className="px-2.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {t('webSearchImportButton')}
              </button>
            </div>

            {renderResults('flex-1 min-h-0')}
          </div>
        ) : (
          <p className="text-xs text-surface-500 dark:text-surface-400">{t('webSearchHint')}</p>
        )}
      </div>

      {isExpandedViewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIsExpandedViewOpen(false)}
        >
          <div
            className="w-full max-w-5xl h-[88vh] bg-surface-50 dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between bg-white dark:bg-surface-950">
              <h3 className="font-semibold text-surface-800 dark:text-surface-200">{t('webSearchExpandedTitle')}</h3>
              <button
                type="button"
                onClick={() => setIsExpandedViewOpen(false)}
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
                title={t('webSearchCloseExpanded')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-surface-200 dark:border-surface-800">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder={t('webSearchPlaceholder')}
                  className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
                <button
                  type="submit"
                  disabled={isSearching || !queryInput.trim()}
                  className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {t('webSearchButton')}
                </button>
              </form>
              {renderModeControls('mt-3')}
            </div>

            <div className="p-4 flex-1 min-h-0">
              {webSearchResults.length > 0 ? (
                <div className="h-full flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200 font-medium">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => setAllWebSourceSelections(e.target.checked)}
                        className="rounded border-surface-300 dark:border-surface-600"
                      />
                      <span>{t('webSearchSelectAll')}</span>
                      <span className="text-surface-400">
                        ({selectedWebSourceUrls.length}/{webSearchResults.length})
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={isImporting || selectedWebSourceUrls.length === 0}
                      onClick={handleImport}
                      className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {t('webSearchImportButton')}
                    </button>
                  </div>

                  {error ? <p className="text-sm text-red-500">{error}</p> : null}
                  {renderResults('h-full')}
                </div>
              ) : (
                <p className="text-sm text-surface-500 dark:text-surface-400">{t('webSearchHint')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
