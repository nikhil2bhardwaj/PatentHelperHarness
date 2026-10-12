import { useState, useEffect } from 'react'
import {
  Play, Check, Edit3, MessageSquare, Save, RotateCcw,
  Loader2, ChevronRight, Cpu, Eye, FileJson, AlignLeft,
  Zap, X, Square, FolderOpen, Clock, FileText, FileType,
  Link2, Sparkles, Copy, Layers, AlertCircle
} from 'lucide-react'
import ReadableOutput from './ReadableOutput.jsx'

const API = '/api'

const PRESET_IDEAS = [
  {
    title: 'EV Battery Immersion Cooling',
    desc: 'Immersion dielectric cooling system with micro-channel phase change heat exchangers for ultra-fast charging.',
  },
  {
    title: 'Neuromorphic Edge Coprocessor',
    desc: 'Spiking neural network accelerator with analog in-memory crossbar arrays for sub-milliwatt robotics.',
  },
  {
    title: 'Surgical Teleoperation Haptics',
    desc: 'Bilateral teleoperation harness with magnetic levitation actuator feedback for minimally invasive microsurgery.',
  },
]

const LOADING_MILESTONES = [
  'Analyzing technical scope & inventor intent...',
  'Extracting novel patentable claim elements...',
  'Cross-referencing antecedent basis & dependency tree...',
  'Formulating formal specification & technical disclosure...',
  'Finalizing structured JSON output...'
]

function JsonView({ data, depth = 0 }) {
  if (data === null) return <span className="text-slate-400">null</span>
  if (typeof data === 'boolean') return <span className="text-indigo-600 font-semibold">{String(data)}</span>
  if (typeof data === 'number') return <span className="text-amber-700 font-mono">{data}</span>
  if (typeof data === 'string') return <span className="text-emerald-700">"{data}"</span>
  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data)
  const indent = '  '.repeat(depth)
  return (
    <span>
      {isArray ? '[' : '{'}
      {entries.map(([key, val], i) => (
        <div key={i} style={{ paddingLeft: '1.25rem' }}>
          {!isArray && <span className="text-slate-800 font-medium">"{key}"</span>}
          {!isArray && ': '}
          <JsonView data={val} depth={depth + 1} />
          {i < entries.length - 1 && ','}
        </div>
      ))}
      <span>{indent}{isArray ? ']' : '}'}</span>
    </span>
  )
}

function PhaseSidebar({ phases, currentPhase, completedPhases, phaseStatus, onSelect }) {
  const progressPercent = Math.round((completedPhases.length / (phases.length || 1)) * 100)

  return (
    <aside className="w-80 bg-white/85 backdrop-blur-md border-r border-slate-200/80 h-full flex flex-col select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-white shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">Patent Harness</h1>
              <span className="badge-pill badge-slate text-[9px] py-0 px-1.5">v2.0</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">R&D Ideation Pipeline</p>
          </div>
        </div>
      </div>

      {/* Stepper List */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400 flex items-center justify-between">
          <span>Phases</span>
          <span className="font-mono text-[10px] text-slate-700">{completedPhases.length}/{phases.length}</span>
        </div>

        {phases.map((p) => {
          const isCompleted = completedPhases.includes(p.phase)
          const isCurrent = p.phase === currentPhase
          const isRunning = phaseStatus === 'running' && isCurrent
          const isAwaiting = phaseStatus === 'awaiting_gate' && isCurrent

          return (
            <button
              key={p.phase}
              onClick={() => onSelect(p.phase)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all border cursor-pointer ${
                isCurrent
                  ? 'bg-white border-slate-300 shadow-xs'
                  : isCompleted
                  ? 'bg-transparent border-transparent hover:bg-white/60'
                  : 'bg-transparent border-transparent hover:bg-white/50 opacity-75 hover:opacity-100'
              }`}
            >
              {/* Node indicator */}
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-mono font-semibold transition-all ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  p.phase
                )}
              </div>

              {/* Title & Phase Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium truncate ${
                      isCurrent
                        ? 'text-slate-900 font-semibold'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-600'
                    }`}
                  >
                    Phase {p.phase}
                  </span>
                  {isAwaiting && (
                    <span className="badge-pill badge-amber text-[9px] py-0 px-1.5 animate-pulse">
                      Gate
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {p.name}
                </div>
              </div>

              {isCurrent && !isRunning && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Progress Footer */}
      <div className="p-3.5 border-t border-slate-200/80 bg-white/50">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 font-medium text-[11px]">Completion</span>
          <span className="font-mono text-slate-700 font-semibold text-[11px]">{progressPercent}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </aside>
  )
}

function GatePanel({ onAccept, onEdit, onFeedback, onExit, onRerun, onViewCumulative }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [feedbackText, setFeedbackText] = useState('')

  return (
    <div className="border-t border-slate-200/80 bg-white/90 backdrop-blur-md p-3.5 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="badge-pill badge-amber text-[10px] mr-1">
            Review Gate
          </span>
          <button
            onClick={onAccept}
            className="btn-primary text-xs py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Accept & Advance
          </button>
          <button
            onClick={() => { setShowEdit(!showEdit); setShowFeedback(false); }}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Edit3 className="w-3.5 h-3.5" /> Refine
          </button>
          <button
            onClick={() => { setShowFeedback(!showFeedback); setShowEdit(false); }}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Feedback
          </button>
          <button
            onClick={onRerun}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Rerun
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewCumulative}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Eye className="w-3.5 h-3.5" /> Cumulative
          </button>
          <button
            onClick={onExit}
            className="btn-secondary text-xs py-1.5 px-3 text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <Save className="w-3.5 h-3.5" /> Save & Exit
          </button>
        </div>
      </div>

      {/* Edit Drawer */}
      {showEdit && (
        <div className="max-w-6xl mx-auto mt-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Edit Phase Output
            </span>
            <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-700 p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none custom-scrollbar"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="Edit raw JSON or markdown text here..."
          />
          <div className="flex justify-end gap-2 mt-2.5">
            <button onClick={() => setShowEdit(false)} className="btn-secondary text-xs py-1 px-3">
              Cancel
            </button>
            <button
              onClick={() => { onEdit(editContent); setShowEdit(false); }}
              className="btn-primary text-xs py-1 px-3"
            >
              Save Edit & Advance
            </button>
          </div>
        </div>
      )}

      {/* Feedback Drawer */}
      {showFeedback && (
        <div className="max-w-6xl mx-auto mt-3 p-4 bg-amber-50/70 rounded-xl border border-amber-200 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Guidance for Next Phase
            </span>
            <button onClick={() => setShowFeedback(false)} className="text-slate-400 hover:text-slate-700 p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            className="w-full bg-white border border-amber-200 rounded-lg p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="e.g. Ensure independent claim 1 covers the dielectric immersion manifold..."
          />
          <div className="flex justify-end gap-2 mt-2.5">
            <button onClick={() => setShowFeedback(false)} className="btn-secondary text-xs py-1 px-3">
              Cancel
            </button>
            <button
              onClick={() => { onFeedback(feedbackText); setShowFeedback(false); }}
              className="btn-primary text-xs py-1 px-3"
            >
              Submit & Advance
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [phases, setPhases] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [sessionDir, setSessionDir] = useState('')
  const [currentPhase, setCurrentPhase] = useState(0)
  const [completedPhases, setCompletedPhases] = useState([])
  const [phaseStatus, setPhaseStatus] = useState('idle')
  const [phaseOutput, setPhaseOutput] = useState(null)
  const [parsedOutput, setParsedOutput] = useState(null)
  const [tokenCount, setTokenCount] = useState(0)
  const [error, setError] = useState(null)
  const [showCumulative, setShowCumulative] = useState(false)
  const [cumulativeContent, setCumulativeContent] = useState('')
  const [viewMode, setViewMode] = useState('formatted')
  const [userInput, setUserInput] = useState('')
  const [provider, setProvider] = useState('openai')
  const [mockMode, setMockMode] = useState(false)
  const [showStart, setShowStart] = useState(true)
  const [activePhase, setActivePhase] = useState(0)
  const [viewingPhase, setViewingPhase] = useState(null)
  const [autonomousMode, setAutonomousMode] = useState(false)
  const [autoRunning, setAutoRunning] = useState(false)
  const [savedSessions, setSavedSessions] = useState([])
  const [showResume, setShowResume] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [referencedPhases, setReferencedPhases] = useState([])
  const [showRefPanel, setShowRefPanel] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [milestoneIndex, setMilestoneIndex] = useState(0)

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2000)
  }

  // Timer for lively loading stage
  useEffect(() => {
    let interval
    if (phaseStatus === 'running') {
      setElapsedSeconds(0)
      setMilestoneIndex(0)
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
        setMilestoneIndex(prev => (prev + 1) % LOADING_MILESTONES.length)
      }, 1800)
    }
    return () => clearInterval(interval)
  }, [phaseStatus])

  useEffect(() => {
    fetch(`${API}/phases`).then(r => r.json()).then(d => setPhases(d.phases || [])).catch(() => {})
  }, [])

  const startSession = async () => {
    setError(null)
    try {
      const res = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: userInput, provider, mock: mockMode }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to start session')
      }
      const data = await res.json()
      setSessionId(data.session_id)
      setSessionDir(data.session_dir)
      setPhases(data.phases || [])
      setCurrentPhase(0)
      setActivePhase(0)
      setViewingPhase(null)
      setCompletedPhases([])
      setPhaseStatus('idle')
      setPhaseOutput(null)
      setParsedOutput(null)
      setShowStart(false)
      triggerToast('Pipeline session initialized')
      if (autonomousMode) {
        setAutoRunning(true)
        runPhaseAuto(0)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  const fetchSavedSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await fetch(`${API}/sessions/list`)
      if (!res.ok) throw new Error('Failed to list sessions')
      const data = await res.json()
      setSavedSessions(data.sessions || [])
    } catch (e) {
      setError(e.message)
    }
    setLoadingSessions(false)
  }

  const resumeSession = async (sDir) => {
    setError(null)
    try {
      const res = await fetch(`${API}/sessions/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_dir: sDir }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to resume session')
      }
      const data = await res.json()
      setSessionId(data.session_id)
      setSessionDir(data.session_dir)
      setPhases(data.phases || [])
      setCurrentPhase(data.current_phase)
      setActivePhase(data.current_phase)
      setViewingPhase(null)
      setCompletedPhases(data.completed_phases || [])
      setPhaseStatus('idle')
      setPhaseOutput(null)
      setParsedOutput(null)
      setShowStart(false)
      setShowResume(false)
      setUserInput(data.user_input || '')
      setProvider(data.provider || 'openai')
      triggerToast(`Resumed: ${data.session_id}`)
    } catch (e) {
      setError(e.message)
    }
  }

  const runPhase = async (phase) => {
    if (!sessionId) return
    setError(null)
    setPhaseStatus('running')
    setPhaseOutput(null)
    setParsedOutput(null)
    setCurrentPhase(phase)
    setActivePhase(phase)
    setViewingPhase(null)
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/run/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenced_phases: referencedPhases }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to run phase')
      }
      const data = await res.json()
      setPhaseOutput(data.output)
      setParsedOutput(data.parsed)
      setTokenCount(data.estimated_input_tokens || 0)
      setPhaseStatus('awaiting_gate')
    } catch (e) {
      setError(e.message)
      setPhaseStatus('error')
    }
  }

  const handleGate = async (action, extra = {}) => {
    if (!sessionId) return
    setError(null)
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) throw new Error('Gate action failed')
      const data = await res.json()
      if (data.action === 'rerun') {
        setPhaseStatus('idle')
        runPhase(currentPhase)
        return
      }
      if (data.action === 'saved') {
        setPhaseStatus('exited')
        triggerToast('Session state saved safely')
        return
      }
      setCompletedPhases(prev => [...new Set([...prev, currentPhase])])
      setPhaseStatus('idle')
      triggerToast(`Phase ${currentPhase} accepted`)
      if (data.completed) {
        setPhaseStatus('completed')
      } else if (data.next_phase !== null && data.next_phase !== undefined) {
        runPhase(data.next_phase)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  const autoAcceptAndChain = async (phase) => {
    if (!sessionId) return
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      if (!res.ok) throw new Error('Auto-accept failed')
      const data = await res.json()
      setCompletedPhases(prev => [...new Set([...prev, phase])])
      if (data.completed) {
        setPhaseStatus('completed')
        setAutoRunning(false)
        return
      }
      if (data.next_phase !== null && data.next_phase !== undefined) {
        setPhaseStatus('idle')
        await new Promise(r => setTimeout(r, 600))
        await runPhaseAuto(data.next_phase)
      }
    } catch (e) {
      setError(e.message)
      setPhaseStatus('error')
      setAutoRunning(false)
    }
  }

  const runPhaseAuto = async (phase) => {
    if (!sessionId) return
    setError(null)
    setPhaseStatus('running')
    setPhaseOutput(null)
    setParsedOutput(null)
    setCurrentPhase(phase)
    setActivePhase(phase)
    setViewingPhase(null)
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/run/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenced_phases: referencedPhases }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to run phase')
      }
      const data = await res.json()
      setPhaseOutput(data.output)
      setParsedOutput(data.parsed)
      setTokenCount(data.estimated_input_tokens || 0)
      if (autoRunning) {
        setPhaseStatus('awaiting_gate')
        await autoAcceptAndChain(phase)
      } else {
        setPhaseStatus('awaiting_gate')
      }
    } catch (e) {
      setError(e.message)
      setPhaseStatus('error')
      setAutoRunning(false)
    }
  }

  const viewCompletedPhase = async (phase) => {
    if (!sessionId) return
    setError(null)
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/phase/${phase}`)
      if (!res.ok) throw new Error('Failed to load phase output')
      const data = await res.json()
      setCurrentPhase(phase)
      setViewingPhase(phase)
      setPhaseOutput(data.output)
      setParsedOutput(data.parsed)
      setTokenCount(0)
      setPhaseStatus('viewing')
    } catch (e) {
      setError(e.message)
    }
  }

  const returnToActivePhase = () => {
    setViewingPhase(null)
    setCurrentPhase(activePhase)
    if (phaseStatus === 'viewing') {
      setPhaseStatus('idle')
      setPhaseOutput(null)
      setParsedOutput(null)
    }
  }

  const viewCumulative = async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/cumulative`)
      const data = await res.json()
      setCumulativeContent(data.content)
      setShowCumulative(true)
    } catch (e) {
      setError(e.message)
    }
  }

  const toggleReferencedPhase = (phaseNum) => {
    setReferencedPhases(prev =>
      prev.includes(phaseNum)
        ? prev.filter(p => p !== phaseNum)
        : [...prev, phaseNum]
    )
  }

  const exportPhase = async (format) => {
    if (!sessionId) return
    setExporting(true)
    try {
      const res = await fetch(`${API}/sessions/${sessionId}/phase/${currentPhase}/export?format=${format}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Export failed')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `phase_${currentPhase}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      triggerToast(`Exported .${format}`)
    } catch (e) {
      setError(e.message)
    }
    setExporting(false)
  }

  const currentPhaseObj = phases.find(p => p.phase === currentPhase)
  const phaseName = currentPhaseObj?.name || `Phase ${currentPhase}`

  const statusBadge = {
    running: { class: 'badge-pill badge-blue animate-pulse', label: 'Processing' },
    awaiting_gate: { class: 'badge-pill badge-amber', label: 'Review Gate' },
    completed: { class: 'badge-pill badge-emerald', label: 'Complete' },
    idle: { class: 'badge-pill badge-slate', label: 'Ready' },
    error: { class: 'badge-pill badge-rose', label: 'Error' },
    exited: { class: 'badge-pill badge-slate', label: 'Saved' },
    viewing: { class: 'badge-pill badge-slate', label: 'Inspection' },
  }

  // --- START SCREEN (LIVELY LIGHT THEME WITH GRADIENTS) ---
  if (showStart) {
    return (
      <div className="min-h-screen lively-canvas-bg lively-grid-texture flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Soft Ambient Floating Orbs */}
        <div className="absolute top-1/6 left-1/6 w-80 h-80 rounded-full bg-blue-200/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/6 right-1/6 w-80 h-80 rounded-full bg-amber-200/40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />

        <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4 z-10 animate-fade-in my-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Patent Helper Harness
                </h1>
                <p className="text-xs text-slate-500">
                  Human-in-the-loop phased patent ideation & drafting pipeline
                </p>
              </div>
            </div>

            <button
              onClick={() => { setShowResume(true); fetchSavedSessions(); }}
              className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-center"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-600" /> Saved Sessions
            </button>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Presets
              </span>
              <span className="text-[11px] text-slate-400">Click to autofill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_IDEAS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => setUserInput(preset.desc)}
                  className="p-3 rounded-xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer text-left group"
                >
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 line-clamp-1">
                    {preset.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {preset.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invention Prompt Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Invention Concept / Technical Disclosure
            </label>
            <textarea
              className="w-full h-24 bg-white/90 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all custom-scrollbar"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder="e.g., A multi-rotor drone package release mechanism with magnetic detachment and parachute fail-safe..."
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LLM Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                LLM Provider
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'openai', label: 'OpenAI', desc: 'GPT-4o' },
                  { id: 'groq', label: 'Groq', desc: 'Fast' },
                  { id: 'nararouter', label: 'Nararouter', desc: 'Agnes' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProvider(p.id); setMockMode(false) }}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      provider === p.id && !mockMode
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-medium">{p.label}</div>
                    <div className={`text-[10px] ${provider === p.id && !mockMode ? 'text-slate-300' : 'text-slate-400'}`}>{p.desc}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMockMode(!mockMode)}
                className={`w-full py-1.5 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                  mockMode
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                    : 'bg-white/80 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>Mock Mode (Offline Simulation)</span>
                <span className="badge-pill badge-amber text-[9px] py-0">No API Key</span>
              </button>
            </div>

            {/* Workflow Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Execution Workflow
              </label>
              <div className="grid grid-cols-2 gap-2 h-[calc(100%-1.75rem)]">
                <button
                  onClick={() => setAutonomousMode(false)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    !autonomousMode
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-medium">Human in Loop</div>
                  <div className={`text-[10px] mt-1 ${!autonomousMode ? 'text-slate-300' : 'text-slate-400'}`}>Review each phase</div>
                </button>
                <button
                  onClick={() => setAutonomousMode(true)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    autonomousMode
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-medium flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Autonomous
                  </div>
                  <div className={`text-[10px] mt-1 ${autonomousMode ? 'text-slate-300' : 'text-slate-400'}`}>Auto-chain all phases</div>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Execution Error
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">{error}</p>
              {error.includes('llama') && (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1 border border-amber-200">
                  Tip: Select <strong>OpenAI</strong> or <strong>Mock Mode</strong> above to execute successfully without model access limits.
                </p>
              )}
            </div>
          )}

          {/* Launch Button */}
          <button
            onClick={startSession}
            className="btn-primary w-full py-2.5 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" /> Start Patent Pipeline
          </button>
        </div>

        {/* Saved Sessions Modal */}
        {showResume && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowResume(false)}>
            <div className="bg-white/95 backdrop-blur-xl w-full max-w-lg max-h-[75vh] rounded-2xl flex flex-col border border-white/80 shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Saved Sessions</h3>
                </div>
                <button onClick={() => setShowResume(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                  </div>
                ) : savedSessions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No existing sessions found.
                  </div>
                ) : (
                  savedSessions.map(s => (
                    <div
                      key={s.session_dir}
                      onClick={() => resumeSession(s.session_dir)}
                      className="p-3 rounded-xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">
                          {s.session_name}
                        </span>
                        <span className="badge-pill badge-slate text-[9px]">
                          {s.provider}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {s.user_input || '(No description)'}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Check className="w-3 h-3" /> {s.completed_phases?.length || 0}/13 phases
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Next: Phase {s.current_phase}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- MAIN WORKSPACE VIEW (LIVELY LIGHT THEME) ---
  return (
    <div className="h-screen flex lively-workspace-bg lively-grid-texture overflow-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Stepper Sidebar */}
      <PhaseSidebar
        phases={phases}
        currentPhase={currentPhase}
        completedPhases={completedPhases}
        phaseStatus={phaseStatus}
        onSelect={(p) => {
          if (completedPhases.includes(p) && p !== activePhase) {
            viewCompletedPhase(p)
          } else if (p === activePhase && viewingPhase !== null) {
            returnToActivePhase()
          } else if (completedPhases.includes(p) || p === currentPhase) {
            setCurrentPhase(p)
          }
        }}
      />

      {/* Main Document Studio */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-semibold text-xs text-slate-800">
              P{currentPhase}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  {phaseName}
                </h2>
                <span className={statusBadge[phaseStatus]?.class || 'badge-pill badge-slate'}>
                  {statusBadge[phaseStatus]?.label || phaseStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className="truncate max-w-xs">{sessionDir}</span>
                {tokenCount > 0 && (
                  <span className="text-slate-600 font-medium">~{tokenCount.toLocaleString()} tokens</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export format buttons */}
            <div className="flex items-center bg-slate-100/80 rounded-lg p-0.5 border border-slate-200/80">
              {['md', 'pdf', 'docx'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => exportPhase(fmt)}
                  disabled={exporting}
                  className="px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  .{fmt}
                </button>
              ))}
            </div>

            <button
              onClick={viewCumulative}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              <Layers className="w-3.5 h-3.5" /> Cumulative
            </button>

            <button
              onClick={() => setShowStart(true)}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              New
            </button>
          </div>
        </header>

        {/* Central Document Workspace */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {/* LIVELY LOADING STAGE */}
          {phaseStatus === 'running' && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="relative max-w-md w-full animate-fade-in">
                {/* Lively Ambient Glowing Pastel Aura */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-300 via-amber-200 to-emerald-300 opacity-60 blur-xl animate-pulse" />

                {/* Main Loading Card */}
                <div className="relative bg-white/95 backdrop-blur-xl p-8 rounded-2xl border border-white/80 shadow-[0_12px_40px_rgba(15,23,42,0.08)] space-y-5 text-center">
                  {/* Concentric Animated Spinner Nucleus */}
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-3 border-blue-100 animate-ping opacity-30" />
                    <div className="w-14 h-14 rounded-full border-3 border-slate-100 border-t-blue-600 border-r-indigo-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-amber-500 absolute" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-mono font-medium mb-1.5">
                      <Clock className="w-3 h-3" /> {elapsedSeconds}s elapsed
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Synthesizing Phase {currentPhase}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1 h-5 transition-all">
                      {LOADING_MILESTONES[milestoneIndex]}
                    </p>
                  </div>

                  {/* Shimmer Skeleton Anticipation Lines */}
                  <div className="space-y-2 py-1 max-w-xs mx-auto">
                    <div className="h-2 rounded-full shimmer-line w-full" />
                    <div className="h-2 rounded-full shimmer-line w-4/5 mx-auto" />
                    <div className="h-2 rounded-full shimmer-line w-3/5 mx-auto" />
                  </div>

                  {autoRunning && (
                    <button
                      onClick={() => { setAutoRunning(false); setPhaseStatus('awaiting_gate'); }}
                      className="btn-secondary text-xs py-1.5 px-3 text-rose-700 border-rose-200 hover:bg-rose-50 mx-auto"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop Auto-Run
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Idle / Ready to Run State */}
          {phaseStatus === 'idle' && phaseOutput === null && (
            <div className="flex items-center justify-center h-full min-h-[350px]">
              <div className="relative max-w-md w-full animate-fade-in">
                {/* Subtle Ambient Aura */}
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-200/50 via-amber-100/50 to-emerald-200/50 opacity-50 blur-lg" />

                <div className="relative text-center bg-white/95 backdrop-blur-xl p-8 rounded-2xl border border-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)] space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-sm">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Ready to Execute Phase {currentPhase}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      {currentPhaseObj?.description || `Execute Phase ${currentPhase}: ${phaseName} to generate the patent disclosure.`}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => runPhase(currentPhase)}
                      className="btn-primary py-2 px-5 text-xs font-semibold shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Run Phase {currentPhase}
                    </button>
                    {autonomousMode && !autoRunning && (
                      <button
                        onClick={() => { setAutoRunning(true); runPhaseAuto(currentPhase); }}
                        className="btn-secondary text-xs py-2 px-3"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Run All Automatically
                      </button>
                    )}
                  </div>

                  {/* Reference Prior Completed Phases */}
                  {completedPhases.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/80">
                      <button
                        onClick={() => setShowRefPanel(!showRefPanel)}
                        className="text-xs text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" /> Reference Completed Phase Outputs
                        {referencedPhases.length > 0 && (
                          <span className="badge-pill badge-slate text-[9px] py-0">{referencedPhases.length}</span>
                        )}
                      </button>

                      {showRefPanel && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
                          <p className="text-[11px] text-slate-500">
                            Select previous phases to include in context:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {completedPhases.map(p => {
                              const isSelected = referencedPhases.includes(p)
                              return (
                                <button
                                  key={p}
                                  onClick={() => toggleReferencedPhase(p)}
                                  className={`px-2 py-0.5 rounded-md text-xs border font-medium transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-slate-900 border-slate-900 text-white'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  Phase {p}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Structured Document Content */}
          {(phaseOutput !== null || parsedOutput !== null) && phaseStatus !== 'running' && (
            <div className="max-w-5xl mx-auto space-y-3.5 animate-fade-in">
              {/* Document Header Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm p-1 rounded-lg border border-slate-200/80 shadow-xs">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'formatted'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" /> Document View
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      viewMode === 'raw'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileJson className="w-3.5 h-3.5" /> Raw JSON
                  </button>
                </div>

                {viewingPhase !== null && (
                  <button
                    onClick={returnToActivePhase}
                    className="btn-primary text-xs py-1 px-3 shadow-xs"
                  >
                    Return to Active Phase {activePhase}
                  </button>
                )}
              </div>

              {/* Document Body */}
              {viewMode === 'formatted' && parsedOutput ? (
                <ReadableOutput data={parsedOutput} />
              ) : (
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-sm">
                  <pre className="text-xs font-mono text-slate-900 overflow-auto custom-scrollbar max-h-[60vh] whitespace-pre-wrap leading-relaxed">
                    {parsedOutput ? <JsonView data={parsedOutput} /> : phaseOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* All Completed */}
          {phaseStatus === 'completed' && (
            <div className="flex items-center justify-center h-full min-h-[350px]">
              <div className="text-center max-w-sm bg-white/95 backdrop-blur-xl p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-3 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    All Pipeline Phases Completed
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {sessionDir}
                  </p>
                </div>
                <button
                  onClick={viewCumulative}
                  className="btn-primary py-2 px-4 text-xs mx-auto shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> View Cumulative Patent Document
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => runPhase(currentPhase)}
                className="btn-secondary text-xs py-0.5 px-2.5 ml-2 flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}
        </main>

        {/* Docked Review Gate */}
        {phaseStatus === 'awaiting_gate' && !autoRunning && (
          <GatePanel
            onAccept={() => handleGate('accept')}
            onEdit={(c) => handleGate('edit', { edited_content: c })}
            onFeedback={(fb) => handleGate('feedback', { feedback: fb })}
            onExit={() => handleGate('exit')}
            onRerun={() => handleGate('rerun')}
            onViewCumulative={viewCumulative}
          />
        )}
      </div>

      {/* Cumulative Output Modal */}
      {showCumulative && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowCumulative(false)}>
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-3xl h-[80vh] rounded-2xl flex flex-col border border-white/80 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cumulative Patent Document</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(cumulativeContent)
                    triggerToast('Copied to clipboard')
                  }}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
                <button onClick={() => setShowCumulative(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/70">
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                {cumulativeContent || 'No cumulative output generated yet.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
