import ReactMarkdown from 'react-markdown'
import { Bot, User, FileText } from 'lucide-react'
import ThinkingBlock from './ThinkingBlock'
import { useDocumentStore } from '../../stores/documentStore'
import { useLanguageStore } from '../../stores/languageStore.js'

export default function ChatMessage({ message, onThinkingToggle }) {
  const setPreviewPdf = useDocumentStore(state => state.setPreviewPdf)
  const { t } = useLanguageStore()
  // Support both old format (role, content props) and new format (message object)
  const msg = typeof message === 'string'
    ? { role: 'user', content: message, thinking: null, metadata: {} }
    : message || {}

  const { role, content, thinking, id, metadata = {} } = msg
  const isUser = role === 'user'

  const processContent = (text, citations) => {
    if (!text) return text;
    let citeCounter = 1;

    // ค้นหา pattern เช่น [RAG_document.pdf หน้า 5, 6] หรือ [หน้า 5]
    return text.replace(/\[(?:([^\]]+?\.pdf)\s+)?หน้า\s*([0-9\s,\-]+)\]/gi, (match, fileName, pages) => {
      const resolvedFileName = (fileName || (citations && citations.length > 0 ? citations[0].file_name : ''))?.trim();
      const resolvedPages = pages?.trim();
      
      const payload = encodeURIComponent(JSON.stringify({ 
        file: resolvedFileName, 
        pages: resolvedPages, 
        original: match 
      }));
      
      const res = `[${citeCounter}](#cite:${payload})`;
      citeCounter++;
      return res;
    });
  }

  const processedContent = isUser ? content : processContent(content, metadata.citations);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5
          ${isUser
            ? 'bg-primary-500 text-white'
            : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
          }
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        
        {/* Thinking block (if exists) */}
        {!isUser && thinking && (
          <div className="mb-2">
            <ThinkingBlock
              thinking={thinking}
              isExpanded={metadata?.thinkingExpanded || false}
              onToggle={() => onThinkingToggle && onThinkingToggle(id)}
              messageId={id}
            />
          </div>
        )}

        {/* Main message bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser
              ? 'bg-primary-500 text-white rounded-tr-md'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-md border border-surface-200 dark:border-surface-700'
            }
          `}
        >
          {isUser ? (
            <p>{processedContent}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                components={{
                  a: ({node, href, children, ...props}) => {
                    if (href?.startsWith('#cite:')) {
                      try {
                        const dataStr = decodeURIComponent(href.replace('#cite:', ''));
                        const data = JSON.parse(dataStr);
                        // ถ้ามีหลายหน้าให้เอาหน้าแรกมาใช้เลื่อนไป
                        const firstPage = data.pages ? data.pages.split(/[,-]+/)[0].trim() : null;
                        
                        return (
                          <button
                            onClick={(e) => { 
                              e.preventDefault(); 
                              if (data.file) {
                                setPreviewPdf(data.file, firstPage); 
                              }
                            }}
                            title={data.original?.replace(/[\[\]]/g, '')}
                            className="inline-flex cursor-pointer items-center justify-center bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/40 dark:hover:bg-primary-800/60 text-primary-700 dark:text-primary-300 rounded text-[11px] font-bold px-1.5 py-0.5 mx-0.5 transition-colors align-baseline"
                          >
                            {children}
                          </button>
                        )
                      } catch(e) {
                         // parse error
                      }
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline" {...props}>{children}</a>
                  }
                }}
              >
                {processedContent}
              </ReactMarkdown>
              
              {/* Citations section */}
              {metadata?.citations && metadata.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
                  <div className="text-xs font-medium text-surface-500 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {t('citationSourceTitle')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {metadata.citations.map((cite, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setPreviewPdf(cite.file_name, cite.page_label)}
                        className="text-xs bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 px-2 py-1 rounded-md text-surface-700 dark:text-surface-300 cursor-pointer transition-colors border-none text-left"
                        title={cite.text_snippet ? cite.text_snippet.trim() : ''}
                      >
                        {cite.file_name} <span className="opacity-60">({t('citationPageLabel')} {cite.page_label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Model info (for AI responses) */}
        {!isUser && metadata?.model && (
          <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 px-1">
            {metadata.model}
          </div>
        )}
      </div>
    </div>
  )
}
