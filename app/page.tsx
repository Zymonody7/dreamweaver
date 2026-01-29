'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  BookOpen,
  Plus,
  BarChart2,
  Share2,
  Mic,
  MicOff,
  X,
  Moon,
  Sun,
  Star,
  Brain,
  ChevronLeft,
  Download,
  Home,
  Sparkles,
  Activity,
  Globe,
  Users,
  Edit,
  Save,
  Trash2,
  FileText,
  FileDown
} from 'lucide-react'
import { Dream, Tab, MOODS } from '@/types'
import * as DoubaoService from '@/services/doubaoService'
import DreamGraph from '@/components/DreamGraph'
import StatsBoard from '@/components/StatsBoard'
import { exportDreamAsPDF, exportDreamAsMarkdown } from '@/lib/exportUtils'

// --- Utils ---
const loadDreams = async (): Promise<Dream[]> => {
  try {
    const response = await fetch('/api/dreams')
    if (!response.ok) throw new Error('Failed to fetch dreams')
    return await response.json()
  } catch (error) {
    console.error('Error loading dreams:', error)
    return []
  }
}

const saveDream = async (dream: Dream) => {
  try {
    const response = await fetch('/api/dreams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dream)
    })
    if (!response.ok) throw new Error('Failed to save dream')
    return await response.json()
  } catch (error) {
    console.error('Error saving dream:', error)
    throw error
  }
}

const updateDream = async (dream: Dream) => {
  try {
    const response = await fetch(`/api/dreams/${dream.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dream)
    })
    if (!response.ok) throw new Error('Failed to update dream')
    return await response.json()
  } catch (error) {
    console.error('Error updating dream:', error)
    throw error
  }
}

// --- Components ---

// 1. Navigation Bar (Mobile Bottom & Desktop Sidebar)
const Navbar = ({
  activeTab,
  onTabChange,
  onRecord
}: {
  activeTab: Tab
  onTabChange: (t: Tab) => void
  onRecord: () => void
}) => {
  const navItems = [
    { id: 'journal', icon: Home, label: 'Journal' },
    { id: 'stats', icon: BarChart2, label: 'Insights' },
    { id: 'community', icon: Users, label: 'Community' },
    { id: 'universe', icon: Sparkles, label: 'Universe' }
  ]

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className='md:hidden fixed bottom-0 left-0 right-0 h-16 bg-night-950/90 backdrop-blur-lg border-t border-white/10 flex items-center justify-around z-50 pb-safe'>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as Tab)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === item.id ? 'text-mystic-400' : 'text-slate-500'}`}
          >
            <item.icon
              size={22}
              strokeWidth={activeTab === item.id ? 2.5 : 2}
            />
            <span className='text-[10px] font-medium'>{item.label}</span>
          </button>
        ))}
        {/* Floating Action Button for Record - Positioned slightly above */}
        <div className='absolute -top-6 left-1/2 -translate-x-1/2'>
          <button
            onClick={onRecord}
            className='w-14 h-14 bg-gradient-to-r from-mystic-500 to-accent-pink rounded-full shadow-lg shadow-mystic-500/30 flex items-center justify-center text-white transform active:scale-95 transition-transform'
          >
            <Plus size={28} />
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className='hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-night-950/50 backdrop-blur-xl border-r border-white/5 flex-col z-50 p-6'>
        <div className='flex items-center gap-3 mb-10 px-2'>
          <div className='w-8 h-8 bg-gradient-to-tr from-mystic-400 to-accent-pink rounded-lg'></div>
          <h1 className='text-xl font-serif font-bold text-white tracking-tight'>
            DreamWeaver
          </h1>
        </div>

        <div className='space-y-2 flex-1'>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as Tab)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-mystic-500/10 text-mystic-400 font-medium' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onRecord}
          className='w-full bg-gradient-to-r from-mystic-500 to-accent-pink text-white py-3 rounded-xl font-bold shadow-lg shadow-mystic-500/20 hover:shadow-mystic-500/40 transition-all flex items-center justify-center gap-2'
        >
          <Plus size={20} />
          <span>Record Dream</span>
        </button>
      </nav>
    </>
  )
}

// 2. Journal View (Feed)
const JournalView = ({
  dreams,
  onSelect
}: {
  dreams: Dream[]
  onSelect: (d: Dream) => void
}) => {
  const [filterMood, setFilterMood] = useState<string>('all')
  const [filterClarity, setFilterClarity] = useState<number>(0)
  const [sortBy, setSortBy] = useState<'date' | 'clarity'>('date')

  // Filter and sort dreams
  const filteredDreams = dreams
    .filter((dream) => {
      if (filterMood !== 'all' && dream.mood !== filterMood) return false
      if (filterClarity > 0 && dream.clarity < filterClarity) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return b.timestamp - a.timestamp
      } else {
        return b.clarity - a.clarity
      }
    })

  if (dreams.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-[70vh] text-center p-6'>
        <div className='w-32 h-32 bg-night-800 rounded-full flex items-center justify-center mb-6 animate-pulse-slow'>
          <Moon
            size={48}
            className='text-mystic-400'
          />
        </div>
        <h2 className='text-2xl font-serif text-white mb-2'>
          No Dreams Recorded
        </h2>
        <p className='text-slate-400 max-w-xs'>
          Your subconscious is waiting. Tap the + button to record your first
          journey.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-24 md:pb-0 animate-fade-in'>
      <header className='flex flex-col gap-4 mb-6 pt-4 px-2'>
        <div className='flex justify-between items-end'>
          <div>
            <h2 className='text-3xl font-serif text-white'>Dream Journal</h2>
            <p className='text-slate-400 text-sm mt-1'>
              {filteredDreams.length} of {dreams.length} entries
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className='flex flex-wrap gap-3'>
          {/* Mood Filter */}
          <select
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
            className='px-3 py-2 bg-night-800 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-mystic-500'
          >
            <option value='all'>All Moods</option>
            {MOODS.map((mood) => (
              <option
                key={mood}
                value={mood}
              >
                {mood}
              </option>
            ))}
          </select>

          {/* Clarity Filter */}
          <select
            value={filterClarity}
            onChange={(e) => setFilterClarity(Number(e.target.value))}
            className='px-3 py-2 bg-night-800 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-mystic-500'
          >
            <option value={0}>All Clarity</option>
            <option value={5}>5 Stars</option>
            <option value={4}>4+ Stars</option>
            <option value={3}>3+ Stars</option>
            <option value={2}>2+ Stars</option>
            <option value={1}>1+ Stars</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'clarity')}
            className='px-3 py-2 bg-night-800 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-mystic-500'
          >
            <option value='date'>Sort by Date</option>
            <option value='clarity'>Sort by Clarity</option>
          </select>

          {/* Reset Filters */}
          {(filterMood !== 'all' || filterClarity > 0 || sortBy !== 'date') && (
            <button
              onClick={() => {
                setFilterMood('all')
                setFilterClarity(0)
                setSortBy('date')
              }}
              className='px-3 py-2 bg-mystic-500/10 border border-mystic-500/30 rounded-lg text-sm text-mystic-400 hover:bg-mystic-500/20 transition-colors'
            >
              Reset Filters
            </button>
          )}
        </div>
      </header>

      <div className='grid grid-cols-1 gap-4'>
        {filteredDreams.map((dream) => (
          <div
            key={dream.id}
            onClick={() => onSelect(dream)}
            className='glass-card rounded-2xl p-0 cursor-pointer hover:bg-white/5 transition-all group overflow-hidden'
          >
            <div className='flex'>
              {/* Image Strip */}
              {dream.imageUrl && (
                <div className='w-24 md:w-48 h-auto relative'>
                  <img
                    src={dream.imageUrl}
                    className='absolute inset-0 w-full h-full object-cover'
                    alt='dream thumb'
                  />
                  <div className='absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors'></div>
                </div>
              )}

              <div className='p-4 md:p-6 flex-1 min-w-0'>
                <div className='flex justify-between items-start mb-2'>
                  <span className='text-xs font-mono text-mystic-400 uppercase tracking-wider'>
                    {new Date(dream.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <div className='flex gap-1'>
                    {[...Array(dream.clarity)].map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className='text-yellow-500 fill-current'
                      />
                    ))}
                  </div>
                </div>

                <h3 className='text-white font-serif font-bold text-lg mb-2 truncate pr-2'>
                  {dream.analysis?.themes[0] || 'Untitled Dream'}
                </h3>

                <p className='text-slate-400 text-sm line-clamp-2 leading-relaxed'>
                  {dream.content}
                </p>

                <div className='mt-4 flex flex-wrap gap-2'>
                  <span className='px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-slate-300'>
                    {dream.mood}
                  </span>
                  {dream.isRecurring && (
                    <span className='px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-300'>
                      Recurring
                    </span>
                  )}
                  {dream.realityConnection && (
                    <span className='px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300'>
                      Manifested
                    </span>
                  )}
                  {dream.isPublic ? (
                    <span className='px-2 py-1 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-xs text-accent-cyan flex items-center gap-1'>
                      <Globe size={10} /> Public
                    </span>
                  ) : (
                    <span className='px-2 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-xs text-slate-400'>
                      Private
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 3. Stats View
const StatsView = ({ dreams }: { dreams: Dream[] }) => {
  const [insight, setInsight] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load saved insight on mount
  useEffect(() => {
    const loadInsight = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/insights')
        if (response.ok) {
          const data = await response.json()
          if (data.insight) {
            setInsight(data.insight.analysis)
          }
        }
      } catch (error) {
        console.error('Error loading insight:', error)
      } finally {
        setLoading(false)
      }
    }
    if (dreams.length >= 3) {
      loadInsight()
    } else {
      setLoading(false)
    }
  }, [dreams.length])

  const handleAnalyzePatterns = async () => {
    setAnalyzing(true)
    try {
      const result = await DoubaoService.analyzeSubconsciousPatterns(dreams)
      setInsight(result)

      // Save to database
      await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: result })
      })
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRefreshAnalysis = () => {
    setInsight(null)
  }

  return (
    <div className='pb-24 md:pb-0 animate-fade-in space-y-6 pt-4'>
      <header className='px-2 mb-6'>
        <h2 className='text-3xl font-serif text-white'>Insights</h2>
        <p className='text-slate-400 text-sm mt-1'>
          Analyze your subconscious patterns
        </p>
      </header>

      {dreams.length < 3 ? (
        <div className='glass p-8 rounded-2xl text-center'>
          <p className='text-slate-300'>
            Record at least 3 dreams to unlock detailed AI insights and pattern
            recognition.
          </p>
        </div>
      ) : (
        <>
          <StatsBoard dreams={dreams} />

          {/* AI Pattern Analyst */}
          <div className='glass p-6 rounded-2xl border border-white/5'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-serif text-white flex items-center gap-2'>
                <Activity
                  size={18}
                  className='text-accent-cyan'
                />
                Deep Pattern Recognition
              </h3>
              {!insight && (
                <button
                  onClick={handleAnalyzePatterns}
                  disabled={analyzing}
                  className='text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-2'
                >
                  {analyzing ? (
                    <div className='animate-spin w-3 h-3 border-2 border-t-transparent rounded-full'></div>
                  ) : (
                    <Brain size={12} />
                  )}
                  Analyze My Psyche
                </button>
              )}
            </div>

            {insight ? (
              <div className='prose prose-invert prose-sm max-w-none bg-black/20 p-4 rounded-xl border border-white/5'>
                <ReactMarkdown>{insight}</ReactMarkdown>
                <button
                  onClick={handleRefreshAnalysis}
                  className='text-xs text-slate-500 mt-2 hover:text-white underline'
                >
                  Refresh Analysis
                </button>
              </div>
            ) : loading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='animate-spin w-6 h-6 border-2 border-mystic-500 border-t-transparent rounded-full'></div>
              </div>
            ) : (
              <p className='text-sm text-slate-400'>
                Identify hidden triggers, emotional correlations, and how your
                dreams compare to the collective human experience.
              </p>
            )}
          </div>

          <div className='mt-8'>
            <h3 className='text-lg font-serif text-mystic-300 mb-4 px-2'>
              Symbol Constellation
            </h3>
            <DreamGraph dreams={dreams} />
          </div>
        </>
      )}
    </div>
  )
}

// 4. Universe View
const UniverseView = ({ dreams }: { dreams: Dream[] }) => {
  const [story, setStory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [publicDreams, setPublicDreams] = useState<any[]>([])
  const [loadingPublic, setLoadingPublic] = useState(false)
  const [lastCollectiveDream, setLastCollectiveDream] = useState<any>(null)

  // Load public dreams and last collective dream from backend
  useEffect(() => {
    const loadData = async () => {
      setLoadingPublic(true)
      try {
        // Load public dreams
        const publicResponse = await fetch('/api/dreams/public?limit=10')
        if (publicResponse.ok) {
          const publicData = await publicResponse.json()
          setPublicDreams(publicData)
        }

        // Load last collective dream
        const collectiveResponse = await fetch('/api/collective-dreams')
        if (collectiveResponse.ok) {
          const collectiveData = await collectiveResponse.json()
          if (collectiveData.collectiveDreams && collectiveData.collectiveDreams.length > 0) {
            const latest = collectiveData.collectiveDreams[0]
            setLastCollectiveDream(latest)
            setStory(latest.story)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingPublic(false)
      }
    }
    loadData()
  }, [])

  const handleWeave = async () => {
    setLoading(true)
    try {
      // Mix user dreams with public dreams from database
      const userSnippets = dreams
        .slice(0, 5)
        .map((d) => `User Dream: ${d.content}`)
      const collectiveSnippets = publicDreams
        .slice(0, 10)
        .map((d) => `Collective Echo: ${d.content}`)
      const combined = [...userSnippets, ...collectiveSnippets]

      // Generate the story with markdown formatting
      const res = await DoubaoService.generateUniverseStory(combined)
      setStory(res)

      // Save the collective dream to database
      const dreamIds = [
        ...dreams.slice(0, 5).map(d => d.id),
        ...publicDreams.slice(0, 10).map(d => d.id)
      ]

      await fetch('/api/collective-dreams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: res,
          dreamIds
        })
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='pb-24 md:pb-0 animate-fade-in pt-4 h-full flex flex-col'>
      <header className='px-2 mb-6'>
        <h2 className='text-3xl font-serif text-white'>The Universe</h2>
        <p className='text-slate-400 text-sm mt-1'>Where all dreams connect</p>
      </header>

      <div className='flex-1 glass rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[50vh]'>
        {/* Background Effect */}
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-mystic-900/40 via-night-950 to-night-950 z-0'></div>

        <div className='relative z-10 w-full max-w-2xl text-center'>
          {!story ? (
            <div className='space-y-8'>
              <div className='w-24 h-24 bg-mystic-500/10 rounded-full flex items-center justify-center mx-auto border border-mystic-500/30'>
                <Globe
                  size={40}
                  className='text-mystic-400'
                />
              </div>
              <div>
                <h3 className='text-xl text-white font-medium mb-2'>
                  Weave the Collective Dream
                </h3>
                <p className='text-slate-400 mb-4'>
                  Merge your subconscious with anonymous echoes from the void.
                </p>
                {loadingPublic ? (
                  <div className='text-slate-500 text-sm'>
                    Loading collective dreams...
                  </div>
                ) : publicDreams.length > 0 ? (
                  <div className='text-left bg-black/20 p-4 rounded-xl border border-white/5 mb-4 text-xs text-slate-500 font-mono'>
                    <p className='mb-2 uppercase tracking-widest font-bold text-slate-400'>
                      Detected Signals ({publicDreams.length}):
                    </p>
                    <ul className='list-disc pl-4 space-y-1'>
                      {publicDreams.slice(0, 3).map((dream, i) => (
                        <li
                          key={i}
                          className='truncate'
                        >
                          "{dream.content.substring(0, 80)}..."
                        </li>
                      ))}
                      {publicDreams.length > 3 && (
                        <li className='italic opacity-50'>
                          ...and {publicDreams.length - 3} more signals
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className='text-slate-500 text-sm mb-4'>
                    No public dreams available yet. Be the first to share!
                  </div>
                )}
              </div>
              <button
                onClick={handleWeave}
                disabled={
                  loading || dreams.length < 1 || publicDreams.length === 0
                }
                className='bg-white text-night-950 px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto shadow-lg shadow-white/10'
              >
                {loading ? (
                  <div className='w-5 h-5 border-2 border-night-950 border-t-transparent rounded-full animate-spin'></div>
                ) : (
                  <Sparkles size={18} />
                )}
                {loading ? 'Weaving Reality...' : 'Weave Universe'}
              </button>
            </div>
          ) : (
            <div className='animate-slide-up text-left'>
              <div className='prose prose-invert prose-lg max-w-none prose-headings:text-mystic-300 prose-strong:text-mystic-400 prose-em:text-slate-300 prose-blockquote:border-mystic-500 prose-blockquote:text-slate-300'>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {story}
                </ReactMarkdown>
              </div>
              <button
                onClick={() => setStory(null)}
                className='mt-8 text-sm text-mystic-400 hover:text-white underline block mx-auto'
              >
                Reset Universe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 5. Community View
const CommunityView = ({ onSelect }: { onSelect: (d: any) => void }) => {
  const [publicDreams, setPublicDreams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPublicDreams = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/dreams/public?limit=50')
        if (response.ok) {
          const data = await response.json()
          setPublicDreams(data)
        }
      } catch (error) {
        console.error('Error loading public dreams:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPublicDreams()
  }, [])

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-[70vh] text-center p-6'>
        <div className='w-16 h-16 border-4 border-mystic-500 border-t-transparent rounded-full animate-spin mb-4'></div>
        <p className='text-slate-400'>Loading community dreams...</p>
      </div>
    )
  }

  if (publicDreams.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-[70vh] text-center p-6'>
        <div className='w-32 h-32 bg-night-800 rounded-full flex items-center justify-center mb-6'>
          <Users
            size={48}
            className='text-mystic-400'
          />
        </div>
        <h2 className='text-2xl font-serif text-white mb-2'>
          No Public Dreams Yet
        </h2>
        <p className='text-slate-400 max-w-xs'>
          Be the first to share your dreams with the community!
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6 pb-24 md:pb-0 animate-fade-in'>
      <header className='flex justify-between items-end mb-6 pt-4 px-2'>
        <div>
          <h2 className='text-3xl font-serif text-white'>Community Dreams</h2>
          <p className='text-slate-400 text-sm mt-1'>
            {publicDreams.length} shared dreams from the collective
          </p>
        </div>
      </header>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {publicDreams.map((dream) => (
          <div
            key={dream.id}
            onClick={() => onSelect(dream)}
            className='glass-card rounded-2xl p-0 cursor-pointer hover:bg-white/5 transition-all group overflow-hidden'
          >
            <div className='flex flex-col'>
              {/* Image */}
              {dream.imageUrl && (
                <div className='w-full h-48 relative'>
                  <img
                    src={dream.imageUrl}
                    className='absolute inset-0 w-full h-full object-cover'
                    alt='dream'
                  />
                  <div className='absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors'></div>
                </div>
              )}

              <div className='p-4 md:p-6'>
                <div className='flex justify-between items-start mb-2'>
                  <span className='text-xs font-mono text-mystic-400 uppercase tracking-wider'>
                    {new Date(dream.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <div className='flex gap-1'>
                    {[...Array(dream.clarity || 3)].map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className='text-yellow-500 fill-current'
                      />
                    ))}
                  </div>
                </div>

                <h3 className='text-white font-serif font-bold text-lg mb-2 line-clamp-1'>
                  {dream.analysis?.themes?.[0] || 'Untitled Dream'}
                </h3>

                <p className='text-slate-400 text-sm line-clamp-3 leading-relaxed mb-4'>
                  {dream.content}
                </p>

                <div className='flex flex-wrap gap-2'>
                  <span className='px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-slate-300'>
                    {dream.mood || 'Unknown'}
                  </span>
                  <span className='px-2 py-1 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-xs text-accent-cyan'>
                    Public
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 6. Recording Modal (Focus Mode)
const RecordModal = ({
  onClose,
  onSave
}: {
  onClose: () => void
  onSave: (d: any) => Promise<void>
}) => {
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [clarity, setClarity] = useState(3)
  const [isRecurring, setIsRecurring] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)

  const toggleRecord = () => {
    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
    } else {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) return alert('Speech not supported')

      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.onresult = (e: any) => {
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript
        }
        if (final) setContent((prev) => prev + ' ' + final)
      }
      recognitionRef.current.start()
      setRecording(true)
    }
  }

  const handleSave = async () => {
    if (!content.trim()) return
    setProcessing(true)
    await onSave({ content, mood, clarity, isRecurring, isPublic })
    setProcessing(false)
    onClose()
  }

  return (
    <div className='fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6 bg-night-950/80 backdrop-blur-sm animate-fade-in'>
      <div className='w-full md:max-w-2xl bg-night-900 md:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='flex justify-between items-center p-6 border-b border-white/5'>
          <h3 className='text-xl font-serif text-white'>New Entry</h3>
          <button
            onClick={onClose}
            className='p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white'
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className='p-6 overflow-y-auto flex-1 space-y-6'>
          <div className='relative'>
            <textarea
              className='w-full h-48 bg-night-950/50 rounded-2xl p-4 text-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-mystic-500/50 resize-none'
              placeholder='I was walking through a forest of crystals...'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
            <button
              onClick={toggleRecord}
              className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${recording ? 'bg-red-500 animate-pulse text-white' : 'bg-night-800 text-mystic-400 hover:bg-mystic-500 hover:text-white'}`}
            >
              {recording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>

          <div>
            <label className='text-sm font-bold text-slate-500 uppercase mb-3 block'>
              Atmosphere
            </label>
            <div className='flex flex-wrap gap-2'>
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mood === m ? 'bg-mystic-500 text-white shadow-lg shadow-mystic-500/25' : 'bg-night-800 text-slate-400 border border-white/5'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className='space-y-3'>
            <div className='flex justify-between items-center bg-night-950/30 p-4 rounded-xl border border-white/5'>
              <div>
                <label className='text-sm font-bold text-slate-500 uppercase block mb-1'>
                  Clarity
                </label>
                <div className='flex gap-1'>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setClarity(s)}
                    >
                      <Star
                        size={20}
                        className={`${s <= clarity ? 'text-yellow-500 fill-current' : 'text-slate-700'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className='h-8 w-px bg-white/10 mx-4'></div>

              <label className='flex items-center gap-3 cursor-pointer'>
                <div
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${isRecurring ? 'bg-mystic-500' : 'bg-night-800'}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0'}`}
                  ></div>
                </div>
                <input
                  type='checkbox'
                  className='hidden'
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <span className='text-sm text-slate-400'>Recurring</span>
              </label>
            </div>

            <div className='flex items-center justify-between bg-night-950/30 p-4 rounded-xl border border-white/5'>
              <div>
                <label className='text-sm font-bold text-slate-500 uppercase block mb-1'>
                  Share to Universe
                </label>
                <p className='text-xs text-slate-600'>
                  Make this dream visible to the collective
                </p>
              </div>
              <label className='flex items-center gap-3 cursor-pointer'>
                <div
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-accent-cyan' : 'bg-night-800'}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`}
                  ></div>
                </div>
                <input
                  type='checkbox'
                  className='hidden'
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span className='text-sm text-slate-400'>
                  {isPublic ? 'Public' : 'Private'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='p-6 border-t border-white/5 bg-night-900/50'>
          <button
            onClick={handleSave}
            disabled={!content.trim() || processing}
            className='w-full bg-white text-night-950 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2'
          >
            {processing ? 'Interpreting Dream...' : 'Analyze & Save'}
            {!processing && <Brain size={20} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// 7. Dream Detail Modal (Immersive)
const DreamDetail = ({
  dream,
  onClose,
  onUpdate
}: {
  dream: Dream
  onClose: () => void
  onUpdate: (d: Dream) => void
}) => {
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editedContent, setEditedContent] = useState(dream.content)
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false)
  const [editedEmotionalAnalysis, setEditedEmotionalAnalysis] = useState(
    dream.analysis?.emotionalAnalysis || ''
  )
  const [editedCreativeStory, setEditedCreativeStory] = useState(
    dream.analysis?.creativeStory || ''
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [similarDreams, setSimilarDreams] = useState<any[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])

  // Load similar dreams on mount
  useEffect(() => {
    const loadSimilarDreams = async () => {
      setLoadingSimilar(true)
      try {
        const response = await fetch('/api/dreams/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dreamContent: dream.content,
            dreamId: dream.id,
            limit: 3,
            includePublic: false
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSimilarDreams(data.dreams || [])
        }
      } catch (error) {
        console.error('Error loading similar dreams:', error)
      } finally {
        setLoadingSimilar(false)
      }
    }

    loadSimilarDreams()
  }, [dream.id, dream.content])

  const exportDream = () => {
    setShowExportMenu(!showExportMenu)
  }

  const handleExportPDF = async () => {
    setShowExportMenu(false)
    await exportDreamAsPDF(dream)
  }

  const handleExportMarkdown = async () => {
    setShowExportMenu(false)
    await exportDreamAsMarkdown(dream)
  }

  const handleSaveContent = () => {
    if (editedContent.trim() && editedContent !== dream.content) {
      onUpdate({ ...dream, content: editedContent })
    }
    setIsEditingContent(false)
  }

  const handleCancelEdit = () => {
    setEditedContent(dream.content)
    setIsEditingContent(false)
  }

  const handleSaveAnalysis = () => {
    if (dream.analysis) {
      const updatedAnalysis = {
        ...dream.analysis,
        emotionalAnalysis: editedEmotionalAnalysis,
        creativeStory: editedCreativeStory
      }
      onUpdate({ ...dream, analysis: updatedAnalysis })
    }
    setIsEditingAnalysis(false)
  }

  const handleCancelAnalysisEdit = () => {
    setEditedEmotionalAnalysis(dream.analysis?.emotionalAnalysis || '')
    setEditedCreativeStory(dream.analysis?.creativeStory || '')
    setIsEditingAnalysis(false)
  }

  const handleDeleteDream = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this dream? This action cannot be undone.'
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/dreams/${dream.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onClose()
        window.location.reload() // Refresh to update the list
      } else {
        alert('Failed to delete dream')
      }
    } catch (error) {
      console.error('Error deleting dream:', error)
      alert('Failed to delete dream')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='fixed inset-0 z-[60] bg-night-950 animate-fade-in overflow-y-auto'>
      {/* Hero Image Background */}
      <div className='absolute top-0 left-0 right-0 h-[40vh] md:h-[50vh] overflow-hidden'>
        {dream.imageUrl ? (
          <>
            <img
              src={dream.imageUrl}
              className='w-full h-full object-cover opacity-60'
              alt='hero'
            />
            <div className='absolute inset-0 bg-gradient-to-b from-night-950/0 via-night-950/60 to-night-950'></div>
          </>
        ) : (
          <div className='w-full h-full bg-gradient-to-br from-mystic-900 to-night-950 opacity-50'></div>
        )}

        {/* Top Nav */}
        <div className='absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-20'>
          <button
            onClick={onClose}
            className='w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 border border-white/10'
          >
            <ChevronLeft size={24} />
          </button>
          <div className='flex gap-3 relative'>
            <div className='relative' ref={exportMenuRef}>
              <button
                onClick={exportDream}
                className='w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 border border-white/10'
                title='Export'
              >
                <Download size={20} />
              </button>

              {/* Export Menu Dropdown */}
              {showExportMenu && (
                <div className='absolute top-12 right-0 bg-night-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[200px] animate-fade-in'>
                  <button
                    onClick={handleExportPDF}
                    className='w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5'
                  >
                    <FileDown size={16} className='text-mystic-400' />
                    <div>
                      <div className='text-sm font-medium'>Export as PDF</div>
                      <div className='text-xs text-slate-400'>Page-matching layout</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className='w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3'
                  >
                    <FileText size={16} className='text-accent-cyan' />
                    <div>
                      <div className='text-sm font-medium'>Export as Markdown</div>
                      <div className='text-xs text-slate-400'>Complete data + images</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleDeleteDream}
              disabled={isDeleting}
              className='w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center text-red-300 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50'
              title='Delete'
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className='relative z-10 mt-[30vh] md:mt-[40vh] px-4 md:px-0 pb-10 max-w-4xl mx-auto'>
        <div id='dream-detail-content' className='glass p-6 md:p-10 rounded-3xl min-h-screen'>
          <div className='flex flex-col gap-4 mb-8'>
            <div className='flex items-center gap-3'>
              <span className='text-mystic-400 font-mono text-sm uppercase tracking-widest'>
                {new Date(dream.timestamp).toDateString()}
              </span>
              {dream.isRecurring && (
                <span className='px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold uppercase'>
                  Recurring
                </span>
              )}
            </div>
            <h1 className='text-3xl md:text-5xl font-serif text-white leading-tight'>
              {dream.analysis?.themes[0]}
            </h1>
            <div className='flex items-center gap-2'>
              <span className='px-3 py-1 bg-white/5 rounded-lg text-slate-300 text-sm border border-white/5'>
                {dream.mood}
              </span>
              <div className='flex px-3 py-1 bg-white/5 rounded-lg border border-white/5 gap-1'>
                {[...Array(dream.clarity)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className='text-yellow-500 fill-current'
                  />
                ))}
              </div>
              {dream.isPublic && (
                <span className='px-3 py-1 bg-accent-cyan/10 rounded-lg text-accent-cyan text-sm border border-accent-cyan/20'>
                  Public
                </span>
              )}
              {!dream.isPublic && (
                <span className='px-3 py-1 bg-white/5 rounded-lg text-slate-400 text-sm border border-white/5'>
                  Private
                </span>
              )}
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12'>
            <div className='md:col-span-2 space-y-8'>
              {/* Creative Story */}
              <div className='bg-night-900/50 p-6 rounded-2xl border border-white/5'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest'>
                    AI Creative Story
                  </h3>
                  {!isEditingAnalysis ? (
                    <button
                      onClick={() => setIsEditingAnalysis(true)}
                      className='flex items-center gap-2 text-xs text-mystic-400 hover:text-mystic-300 transition-colors'
                    >
                      <Edit size={14} />
                      Edit Analysis
                    </button>
                  ) : (
                    <div className='flex gap-2'>
                      <button
                        onClick={handleSaveAnalysis}
                        className='flex items-center gap-1 text-xs bg-mystic-500 text-white px-3 py-1.5 rounded-lg hover:bg-mystic-600 transition-colors'
                      >
                        <Save size={12} />
                        Save
                      </button>
                      <button
                        onClick={handleCancelAnalysisEdit}
                        className='text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors'
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {isEditingAnalysis ? (
                  <textarea
                    value={editedCreativeStory}
                    onChange={(e) => setEditedCreativeStory(e.target.value)}
                    className='w-full h-48 bg-night-950/50 rounded-xl p-4 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-mystic-500/50 resize-none font-serif italic'
                    placeholder='Edit creative story...'
                  />
                ) : (
                  <div className='relative pl-6 border-l-2 border-mystic-500/30'>
                    <p className='text-lg md:text-xl text-slate-200 font-serif italic leading-relaxed'>
                      "{dream.analysis?.creativeStory}"
                    </p>
                  </div>
                )}
              </div>

              {/* Original Dream */}
              <div className='bg-night-900/50 p-6 rounded-2xl border border-white/5'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest'>
                    Original Entry
                  </h3>
                  {!isEditingContent ? (
                    <button
                      onClick={() => setIsEditingContent(true)}
                      className='flex items-center gap-2 text-xs text-mystic-400 hover:text-mystic-300 transition-colors'
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  ) : (
                    <div className='flex gap-2'>
                      <button
                        onClick={handleSaveContent}
                        className='flex items-center gap-1 text-xs bg-mystic-500 text-white px-3 py-1.5 rounded-lg hover:bg-mystic-600 transition-colors'
                      >
                        <Save size={12} />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className='text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors'
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {isEditingContent ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className='w-full h-48 bg-night-950/50 rounded-xl p-4 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-mystic-500/50 resize-none'
                    placeholder='Edit your dream...'
                  />
                ) : (
                  <p className='text-slate-300 leading-relaxed whitespace-pre-wrap'>
                    {dream.content}
                  </p>
                )}
              </div>

              {/* Reality Check */}
              <div className='bg-night-900/50 p-6 rounded-2xl border border-white/5'>
                <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest mb-2'>
                  Reality Tether
                </h3>
                <input
                  type='text'
                  className='w-full bg-transparent border-b border-white/10 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-mystic-500 transition-colors'
                  placeholder='Did any part of this dream manifest in reality?'
                  defaultValue={dream.realityConnection || ''}
                  onBlur={(e) => {
                    if (e.target.value !== dream.realityConnection) {
                      onUpdate({ ...dream, realityConnection: e.target.value })
                    }
                  }}
                />
                <p className='text-[10px] text-slate-500 mt-2'>
                  Connecting dreams to reality improves the AI's pattern
                  recognition accuracy.
                </p>
              </div>
            </div>

            <div className='space-y-6'>
              {/* Public/Private Toggle */}
              <div className='bg-night-900/50 p-6 rounded-2xl border border-white/5'>
                <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest mb-4'>
                  Visibility
                </h3>
                <label className='flex items-center justify-between cursor-pointer group'>
                  <div className='flex items-center gap-3'>
                    <Globe
                      size={16}
                      className={
                        dream.isPublic ? 'text-accent-cyan' : 'text-slate-500'
                      }
                    />
                    <div>
                      <p className='text-sm text-white font-medium'>
                        {dream.isPublic ? 'Public' : 'Private'}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {dream.isPublic
                          ? 'Visible in Community'
                          : 'Only you can see this'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${dream.isPublic ? 'bg-accent-cyan' : 'bg-night-800'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdate({ ...dream, isPublic: !dream.isPublic })
                    }}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${dream.isPublic ? 'translate-x-6' : 'translate-x-0'}`}
                    ></div>
                  </div>
                </label>
              </div>

              {/* Emotional Analysis Card */}
              <div className='bg-gradient-to-br from-mystic-900/20 to-night-900 p-6 rounded-2xl border border-white/5'>
                <h3 className='text-xs font-bold text-mystic-400 uppercase tracking-widest mb-4 flex items-center gap-2'>
                  <Brain size={14} /> Emotional Core
                </h3>
                {isEditingAnalysis ? (
                  <textarea
                    value={editedEmotionalAnalysis}
                    onChange={(e) => setEditedEmotionalAnalysis(e.target.value)}
                    className='w-full h-32 bg-night-950/50 rounded-xl p-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-mystic-500/50 resize-none'
                    placeholder='Edit emotional analysis...'
                  />
                ) : (
                  <p className='text-sm text-slate-300 leading-relaxed'>
                    {dream.analysis?.emotionalAnalysis}
                  </p>
                )}
              </div>

              {/* Symbols */}
              <div>
                <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest mb-4'>
                  Dream Symbols
                </h3>
                <div className='space-y-3'>
                  {dream.analysis?.symbols.map((sym, i) => (
                    <div
                      key={i}
                      className='bg-night-800/50 p-3 rounded-xl border border-white/5 hover:border-mystic-500/30 transition-colors'
                    >
                      <div className='flex justify-between items-center mb-1'>
                        <span className='text-white font-medium capitalize'>
                          {sym.name}
                        </span>
                        <span className='text-[10px] text-slate-500 uppercase bg-night-950 px-1.5 py-0.5 rounded'>
                          {sym.type}
                        </span>
                      </div>
                      <p className='text-xs text-slate-400 leading-normal'>
                        {sym.meaning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Dreams */}
              <div>
                <h3 className='text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2'>
                  <Sparkles size={12} /> Similar Dreams
                </h3>
                {loadingSimilar ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='w-6 h-6 border-2 border-mystic-500 border-t-transparent rounded-full animate-spin'></div>
                  </div>
                ) : similarDreams.length > 0 ? (
                  <div className='space-y-3'>
                    {similarDreams.map((similar) => (
                      <div
                        key={similar.id}
                        className='bg-night-800/50 p-3 rounded-xl border border-white/5 hover:border-mystic-500/30 transition-colors cursor-pointer group'
                      >
                        <div className='flex justify-between items-start mb-2'>
                          <span className='text-xs text-mystic-400 font-mono'>
                            {new Date(similar.timestamp).toLocaleDateString(
                              undefined,
                              { month: 'short', day: 'numeric' }
                            )}
                          </span>
                          <span className='text-[10px] text-slate-500 bg-night-950 px-2 py-0.5 rounded'>
                            {Math.round((similar.similarityScore || 0) * 100)}%
                            match
                          </span>
                        </div>
                        <p className='text-xs text-slate-300 line-clamp-2 leading-relaxed group-hover:text-white transition-colors'>
                          {similar.content}
                        </p>
                        {similar.analysis?.themes &&
                          similar.analysis.themes.length > 0 && (
                            <div className='mt-2 flex flex-wrap gap-1'>
                              {similar.analysis.themes
                                .slice(0, 2)
                                .map((theme: string, i: number) => (
                                  <span
                                    key={i}
                                    className='text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-slate-400'
                                  >
                                    {theme}
                                  </span>
                                ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-xs text-slate-500 italic'>
                    No similar dreams found yet. Record more dreams to discover
                    connections.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main App Shell ---

function App() {
  const [dreams, setDreams] = useState<Dream[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('journal')
  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
          loadDreams().then(setDreams)
        } else {
          // Redirect to auth page
          window.location.href = '/auth'
        }
      } catch (error) {
        console.error('Auth check error:', error)
        window.location.href = '/auth'
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleSaveNewDream = async (data: any) => {
    try {
      const analysis = await DoubaoService.analyzeDreamContent(data.content)
      const imageUrl = await DoubaoService.generateDreamImage(
        data.content,
        analysis.themes
      )

      const newDream: Dream = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        content: data.content,
        mood: data.mood,
        clarity: data.clarity,
        isRecurring: data.isRecurring,
        isPublic: data.isPublic || false,
        analysis,
        imageUrl
      }

      await saveDream(newDream)
      const updated = [newDream, ...dreams]
      setDreams(updated)
      setSelectedDream(newDream) // Open the new dream immediately
    } catch (e) {
      console.error(e)
      alert('Failed to analyze dream. Please check connectivity or API key.')
    }
  }

  const handleUpdateDream = async (updated: Dream) => {
    try {
      await updateDream(updated)
      const newDreams = dreams.map((d) => (d.id === updated.id ? updated : d))
      setDreams(newDreams)
      setSelectedDream(updated)
    } catch (e) {
      console.error(e)
      alert('Failed to update dream.')
    }
  }

  return (
    <div className='min-h-screen text-slate-200'>
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRecord={() => setIsRecordOpen(true)}
      />

      <main className='md:pl-64 min-h-screen'>
        <div className='max-w-5xl mx-auto p-4 md:p-8'>
          {activeTab === 'journal' && (
            <JournalView
              dreams={dreams}
              onSelect={setSelectedDream}
            />
          )}
          {activeTab === 'stats' && <StatsView dreams={dreams} />}
          {activeTab === 'community' && (
            <CommunityView onSelect={setSelectedDream} />
          )}
          {activeTab === 'universe' && <UniverseView dreams={dreams} />}
        </div>
      </main>

      {/* Modals */}
      {isRecordOpen && (
        <RecordModal
          onClose={() => setIsRecordOpen(false)}
          onSave={handleSaveNewDream}
        />
      )}

      {selectedDream && (
        <DreamDetail
          dream={selectedDream}
          onClose={() => setSelectedDream(null)}
          onUpdate={handleUpdateDream}
        />
      )}
    </div>
  )
}

export default App
