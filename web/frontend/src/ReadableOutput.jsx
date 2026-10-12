import { useState } from 'react'
import {
  Copy, Check, ChevronDown, ChevronRight, BookOpen, ShieldCheck,
  Search, Cpu, Sparkles, Layers
} from 'lucide-react'

function formatKey(key) {
  return key
    .replace(/^\d+_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()
    const content = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text)
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="p-1 rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer inline-flex items-center gap-1 text-xs"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied && <span className="text-[10px] text-emerald-600 font-medium">Copied</span>}
    </button>
  )
}

function SectionCard({ title, icon: Icon, children, badge, defaultOpen = true, rawData }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="ui-card mb-3.5 overflow-hidden border border-[var(--border-subtle)]">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] flex items-center justify-between cursor-pointer border-b border-[var(--border-subtle)] transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          )}
          {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">{title}</h3>
          {badge && <span className="badge-pill badge-slate text-[10px] ml-1">{badge}</span>}
        </div>
        <div className="flex items-center gap-2">
          {rawData && <CopyButton text={rawData} />}
        </div>
      </div>
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-3 bg-[var(--bg-surface)] animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

function RenderClaimCard({ claimNum, claimText, type }) {
  const isIndependent = !claimText?.toLowerCase().includes('claim ') && !claimText?.toLowerCase().includes('of claim')

  return (
    <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--border-subtle)]">
            Claim {claimNum}
          </span>
          <span className={`badge-pill text-[10px] ${isIndependent ? 'badge-amber' : 'badge-slate'}`}>
            {isIndependent ? 'Independent' : 'Dependent'}
          </span>
          {type && <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">{type}</span>}
        </div>
        <CopyButton text={claimText} />
      </div>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans pl-2 border-l-2 border-[var(--border-medium)]">
        {claimText}
      </p>
    </div>
  )
}

function renderValue(val, depth = 0) {
  if (val === null || val === undefined) return <span className="text-[var(--text-muted)] italic text-xs">N/A</span>
  if (typeof val === 'boolean') {
    return (
      <span className={`badge-pill ${val ? 'badge-emerald' : 'badge-rose'}`}>
        {val ? 'PASSED' : 'FLAGGED'}
      </span>
    )
  }
  if (typeof val === 'number') {
    return <span className="font-mono text-[var(--text-primary)] font-semibold">{val.toLocaleString()}</span>
  }
  if (typeof val === 'string') {
    if (val.startsWith('CPC:') || val.startsWith('IPC:') || val.startsWith('US') || val.startsWith('EP')) {
      return (
        <div className="flex items-center justify-between p-2 rounded-[var(--radius-xs)] bg-[var(--bg-canvas)] font-mono text-xs text-[var(--text-primary)] border border-[var(--border-subtle)]">
          <span>{val}</span>
          <CopyButton text={val} />
        </div>
      )
    }
    if (val.length > 180) {
      return <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{val}</p>
    }
    return <span className="text-xs sm:text-sm text-[var(--text-primary)]">{val}</span>
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-[var(--text-muted)] italic text-xs">None</span>

    if (val.every(item => typeof item === 'string')) {
      return (
        <ul className="space-y-2">
          {val.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] mt-2 flex-shrink-0" />
              <span className="flex-1 leading-relaxed">{item}</span>
              <CopyButton text={item} />
            </li>
          ))}
        </ul>
      )
    }

    return (
      <div className="space-y-2.5">
        {val.map((item, i) => (
          <div key={i} className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5">
            {typeof item === 'object' && item !== null ? (
              Object.entries(item).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 text-xs">
                  <span className="font-medium text-[var(--text-muted)] sm:w-36 flex-shrink-0">
                    {formatKey(k)}:
                  </span>
                  <div className="flex-1 text-[var(--text-primary)]">{renderValue(v, depth + 1)}</div>
                </div>
              ))
            ) : (
              <span className="text-xs sm:text-sm">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof val === 'object') {
    return (
      <div className="space-y-2.5">
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
              {formatKey(k)}
            </span>
            <div className="pl-0.5">{renderValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-xs sm:text-sm text-[var(--text-primary)]">{String(val)}</span>
}

export default function ReadableOutput({ data }) {
  if (!data || typeof data !== 'object') {
    return (
      <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
        {String(data)}
      </div>
    )
  }

  const entries = Object.entries(data).filter(([k]) => !['status', 'phase', 'note'].includes(k))

  return (
    <div className="space-y-3.5">
      {/* Overview Metadata Bar */}
      {(data.phase_name || data.phase !== undefined || data.status) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {data.phase_name || `Phase ${data.phase}`} Summary
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data.status && (
              <span className="badge-pill badge-emerald text-[10px]">
                {data.status}
              </span>
            )}
            <CopyButton text={data} />
          </div>
        </div>
      )}

      {/* Structured Sections */}
      {entries.map(([key, value]) => {
        const lowerKey = key.toLowerCase()
        let Icon = BookOpen
        if (lowerKey.includes('claim')) Icon = ShieldCheck
        else if (lowerKey.includes('prior') || lowerKey.includes('search')) Icon = Search
        else if (lowerKey.includes('technical') || lowerKey.includes('element')) Icon = Cpu
        else if (lowerKey.includes('novelty') || lowerKey.includes('feature')) Icon = Sparkles
        else if (lowerKey.includes('spec') || lowerKey.includes('summary')) Icon = Layers

        if (lowerKey.includes('claim') && Array.isArray(value)) {
          return (
            <SectionCard key={key} title={formatKey(key)} icon={Icon} badge={`${value.length} Claims`} rawData={value}>
              <div className="space-y-2.5">
                {value.map((cl, idx) => {
                  if (typeof cl === 'string') {
                    return <RenderClaimCard key={idx} claimNum={idx + 1} claimText={cl} />
                  }
                  if (typeof cl === 'object' && cl !== null) {
                    return (
                      <RenderClaimCard
                        key={idx}
                        claimNum={cl.number || cl.claim_number || idx + 1}
                        claimText={cl.text || cl.claim_text || cl.content || JSON.stringify(cl)}
                        type={cl.type || cl.category}
                      />
                    )
                  }
                  return null
                })}
              </div>
            </SectionCard>
          )
        }

        return (
          <SectionCard key={key} title={formatKey(key)} icon={Icon} rawData={value}>
            {renderValue(value)}
          </SectionCard>
        )
      })}
    </div>
  )
}
