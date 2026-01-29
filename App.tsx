import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BookOpen, Plus, BarChart2, Share2, Mic, MicOff, 
  X, Moon, Sun, Star, Brain, ChevronLeft, Download, Home, Sparkles, Activity, Globe
} from 'lucide-react';
import { Dream, Tab, MOODS } from './types';
import * as GeminiService from './services/geminiService';
import DreamGraph from './components/DreamGraph';
import StatsBoard from './components/StatsBoard';
import ReactMarkdown from 'react-markdown';

// --- Utils ---
const loadDreams = (): Dream[] => {
  const saved = localStorage.getItem('dreamweaver_dreams');
  return saved ? JSON.parse(saved) : [];
};

const saveDreams = (dreams: Dream[]) => {
  localStorage.setItem('dreamweaver_dreams', JSON.stringify(dreams));
};

// --- Mock Data for Shared Universe ---
const COLLECTIVE_ECHOES = [
  "I was running through an endless library where books were made of glass.",
  "A giant clock in the sky was melting into the ocean, turning the water into time.",
  "I was trying to speak but flowers grew out of my mouth instead of words.",
  "A cat with three eyes guided me through a neon forest.",
  "I was flying, but I had to swim through the air like it was water."
];

// --- Components ---

// 1. Navigation Bar (Mobile Bottom & Desktop Sidebar)
const Navbar = ({ activeTab, onTabChange, onRecord }: { activeTab: Tab, onTabChange: (t: Tab) => void, onRecord: () => void }) => {
  const navItems = [
    { id: 'journal', icon: Home, label: 'Journal' },
    { id: 'stats', icon: BarChart2, label: 'Insights' },
    { id: 'universe', icon: Sparkles, label: 'Universe' },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-night-950/90 backdrop-blur-lg border-t border-white/10 flex items-center justify-around z-50 pb-safe">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as Tab)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === item.id ? 'text-mystic-400' : 'text-slate-500'}`}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        {/* Floating Action Button for Record - Positioned slightly above */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <button 
            onClick={onRecord}
            className="w-14 h-14 bg-gradient-to-r from-mystic-500 to-accent-pink rounded-full shadow-lg shadow-mystic-500/30 flex items-center justify-center text-white transform active:scale-95 transition-transform"
          >
            <Plus size={28} />
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-night-950/50 backdrop-blur-xl border-r border-white/5 flex-col z-50 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
           <div className="w-8 h-8 bg-gradient-to-tr from-mystic-400 to-accent-pink rounded-lg"></div>
           <h1 className="text-xl font-serif font-bold text-white tracking-tight">DreamWeaver</h1>
        </div>

        <div className="space-y-2 flex-1">
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
          className="w-full bg-gradient-to-r from-mystic-500 to-accent-pink text-white py-3 rounded-xl font-bold shadow-lg shadow-mystic-500/20 hover:shadow-mystic-500/40 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          <span>Record Dream</span>
        </button>
      </nav>
    </>
  );
};

// 2. Journal View (Feed)
const JournalView = ({ dreams, onSelect }: { dreams: Dream[], onSelect: (d: Dream) => void }) => {
  if (dreams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <div className="w-32 h-32 bg-night-800 rounded-full flex items-center justify-center mb-6 animate-pulse-slow">
           <Moon size={48} className="text-mystic-400" />
        </div>
        <h2 className="text-2xl font-serif text-white mb-2">No Dreams Recorded</h2>
        <p className="text-slate-400 max-w-xs">Your subconscious is waiting. Tap the + button to record your first journey.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0 animate-fade-in">
       <header className="flex justify-between items-end mb-6 pt-4 px-2">
         <div>
            <h2 className="text-3xl font-serif text-white">Dream Journal</h2>
            <p className="text-slate-400 text-sm mt-1">{dreams.length} entries recorded</p>
         </div>
       </header>

       <div className="grid grid-cols-1 gap-4">
         {dreams.map((dream) => (
           <div 
             key={dream.id} 
             onClick={() => onSelect(dream)}
             className="glass-card rounded-2xl p-0 cursor-pointer hover:bg-white/5 transition-all group overflow-hidden"
           >
              <div className="flex">
                {/* Image Strip */}
                {dream.imageUrl && (
                  <div className="w-24 md:w-48 h-auto relative">
                    <img src={dream.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="dream thumb" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  </div>
                )}
                
                <div className="p-4 md:p-6 flex-1 min-w-0">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-mystic-400 uppercase tracking-wider">
                        {new Date(dream.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="flex gap-1">
                        {[...Array(dream.clarity)].map((_, i) => <Star key={i} size={10} className="text-yellow-500 fill-current" />)}
                      </div>
                   </div>
                   
                   <h3 className="text-white font-serif font-bold text-lg mb-2 truncate pr-2">
                     {dream.analysis?.themes[0] || 'Untitled Dream'}
                   </h3>
                   
                   <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                     {dream.content}
                   </p>

                   <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-slate-300">
                        {dream.mood}
                      </span>
                      {dream.isRecurring && (
                        <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                          Recurring
                        </span>
                      )}
                      {dream.realityConnection && (
                         <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                           Manifested
                         </span>
                      )}
                   </div>
                </div>
              </div>
           </div>
         ))}
       </div>
    </div>
  );
};

// 3. Stats View
const StatsView = ({ dreams }: { dreams: Dream[] }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzePatterns = async () => {
    setAnalyzing(true);
    try {
      const result = await GeminiService.analyzeSubconsciousPatterns(dreams);
      setInsight(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="pb-24 md:pb-0 animate-fade-in space-y-6 pt-4">
      <header className="px-2 mb-6">
        <h2 className="text-3xl font-serif text-white">Insights</h2>
        <p className="text-slate-400 text-sm mt-1">Analyze your subconscious patterns</p>
      </header>
      
      {dreams.length < 3 ? (
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-slate-300">Record at least 3 dreams to unlock detailed AI insights and pattern recognition.</p>
        </div>
      ) : (
        <>
          <StatsBoard dreams={dreams} />
          
          {/* AI Pattern Analyst */}
          <div className="glass p-6 rounded-2xl border border-white/5">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-serif text-white flex items-center gap-2">
                 <Activity size={18} className="text-accent-cyan" /> 
                 Deep Pattern Recognition
               </h3>
               {!insight && (
                 <button 
                  onClick={handleAnalyzePatterns}
                  disabled={analyzing}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-2"
                 >
                   {analyzing ? <div className="animate-spin w-3 h-3 border-2 border-t-transparent rounded-full"></div> : <Brain size={12} />}
                   Analyze My Psyche
                 </button>
               )}
             </div>
             
             {insight ? (
               <div className="prose prose-invert prose-sm max-w-none bg-black/20 p-4 rounded-xl border border-white/5">
                 <ReactMarkdown>{insight}</ReactMarkdown>
                 <button onClick={() => setInsight(null)} className="text-xs text-slate-500 mt-2 hover:text-white underline">Refresh Analysis</button>
               </div>
             ) : (
               <p className="text-sm text-slate-400">
                 Identify hidden triggers, emotional correlations, and how your dreams compare to the collective human experience.
               </p>
             )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-serif text-mystic-300 mb-4 px-2">Symbol Constellation</h3>
            <DreamGraph dreams={dreams} />
          </div>
        </>
      )}
    </div>
  );
};

// 4. Universe View
const UniverseView = ({ dreams }: { dreams: Dream[] }) => {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleWeave = async () => {
    setLoading(true);
    try {
      // Mix user dreams with Collective Echoes
      const userSnippets = dreams.slice(0, 5).map(d => `User Dream: ${d.content}`);
      const collectiveSnippets = COLLECTIVE_ECHOES.map(e => `Collective Echo: ${e}`);
      const combined = [...userSnippets, ...collectiveSnippets];
      
      const res = await GeminiService.generateUniverseStory(combined);
      setStory(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-0 animate-fade-in pt-4 h-full flex flex-col">
      <header className="px-2 mb-6">
        <h2 className="text-3xl font-serif text-white">The Universe</h2>
        <p className="text-slate-400 text-sm mt-1">Where all dreams connect</p>
      </header>

      <div className="flex-1 glass rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[50vh]">
        {/* Background Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-mystic-900/40 via-night-950 to-night-950 z-0"></div>
        
        <div className="relative z-10 w-full max-w-2xl text-center">
           {!story ? (
             <div className="space-y-8">
               <div className="w-24 h-24 bg-mystic-500/10 rounded-full flex items-center justify-center mx-auto border border-mystic-500/30">
                 <Globe size={40} className="text-mystic-400" />
               </div>
               <div>
                 <h3 className="text-xl text-white font-medium mb-2">Weave the Collective Dream</h3>
                 <p className="text-slate-400 mb-4">
                   Merge your subconscious with anonymous echoes from the void.
                 </p>
                 <div className="text-left bg-black/20 p-4 rounded-xl border border-white/5 mb-4 text-xs text-slate-500 font-mono">
                    <p className="mb-2 uppercase tracking-widest font-bold text-slate-400">Detected Signals:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {COLLECTIVE_ECHOES.slice(0, 3).map((echo, i) => (
                        <li key={i} className="truncate">"{echo}"</li>
                      ))}
                      <li className="italic opacity-50">...and {COLLECTIVE_ECHOES.length - 3} more signals</li>
                    </ul>
                 </div>
               </div>
               <button 
                onClick={handleWeave}
                disabled={loading || dreams.length < 1}
                className="bg-white text-night-950 px-8 py-3 rounded-full font-bold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto shadow-lg shadow-white/10"
               >
                 {loading ? <div className="w-5 h-5 border-2 border-night-950 border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={18} />}
                 {loading ? 'Weaving Reality...' : 'Weave Universe'}
               </button>
             </div>
           ) : (
             <div className="animate-slide-up text-left">
               <div className="prose prose-invert prose-lg max-w-none">
                 <p className="whitespace-pre-wrap font-serif leading-loose text-slate-200 first-letter:text-4xl first-letter:font-bold first-letter:text-mystic-400 first-letter:mr-2 float-none">
                   {story}
                 </p>
               </div>
               <button onClick={() => setStory(null)} className="mt-8 text-sm text-mystic-400 hover:text-white underline block mx-auto">
                 Reset Universe
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// 5. Recording Modal (Focus Mode)
const RecordModal = ({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => Promise<void> }) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(MOODS[0]);
  const [clarity, setClarity] = useState(3);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleRecord = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert("Speech not supported");
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e: any) => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
        }
        if (final) setContent(prev => prev + ' ' + final);
      };
      recognitionRef.current.start();
      setRecording(true);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setProcessing(true);
    await onSave({ content, mood, clarity, isRecurring });
    setProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6 bg-night-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full md:max-w-2xl bg-night-900 md:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h3 className="text-xl font-serif text-white">New Entry</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="relative">
            <textarea
              className="w-full h-48 bg-night-950/50 rounded-2xl p-4 text-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-mystic-500/50 resize-none"
              placeholder="I was walking through a forest of crystals..."
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
             <label className="text-sm font-bold text-slate-500 uppercase mb-3 block">Atmosphere</label>
             <div className="flex flex-wrap gap-2">
               {MOODS.map(m => (
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

          <div className="flex justify-between items-center bg-night-950/30 p-4 rounded-xl border border-white/5">
            <div>
              <label className="text-sm font-bold text-slate-500 uppercase block mb-1">Clarity</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setClarity(s)}>
                    <Star size={20} className={`${s <= clarity ? 'text-yellow-500 fill-current' : 'text-slate-700'}`} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-4"></div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isRecurring ? 'bg-mystic-500' : 'bg-night-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              <span className="text-sm text-slate-400">Recurring</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-night-900/50">
          <button 
            onClick={handleSave}
            disabled={!content.trim() || processing}
            className="w-full bg-white text-night-950 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {processing ? 'Interpreting Dream...' : 'Analyze & Save'}
            {!processing && <Brain size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// 6. Dream Detail Modal (Immersive)
const DreamDetail = ({ dream, onClose, onUpdate }: { dream: Dream, onClose: () => void, onUpdate: (d: Dream) => void }) => {
  const exportDream = () => {
    const text = `# Dream: ${new Date(dream.timestamp).toDateString()}\n\n${dream.content}\n\nAnalysis:\n${dream.analysis?.creativeStory}`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream_${dream.id}.md`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-night-950 animate-fade-in overflow-y-auto">
      {/* Hero Image Background */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] md:h-[50vh] overflow-hidden">
        {dream.imageUrl ? (
           <>
            <img src={dream.imageUrl} className="w-full h-full object-cover opacity-60" alt="hero" />
            <div className="absolute inset-0 bg-gradient-to-b from-night-950/0 via-night-950/60 to-night-950"></div>
           </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-mystic-900 to-night-950 opacity-50"></div>
        )}
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-20">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 border border-white/10">
            <ChevronLeft size={24} />
          </button>
          <div className="flex gap-3">
             <button onClick={exportDream} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/10 border border-white/10">
                <Download size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 mt-[30vh] md:mt-[40vh] px-4 md:px-0 pb-10 max-w-4xl mx-auto">
        <div className="glass p-6 md:p-10 rounded-3xl min-h-screen">
          <div className="flex flex-col gap-4 mb-8">
             <div className="flex items-center gap-3">
               <span className="text-mystic-400 font-mono text-sm uppercase tracking-widest">{new Date(dream.timestamp).toDateString()}</span>
               {dream.isRecurring && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold uppercase">Recurring</span>}
             </div>
             <h1 className="text-3xl md:text-5xl font-serif text-white leading-tight">{dream.analysis?.themes[0]}</h1>
             <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/5 rounded-lg text-slate-300 text-sm border border-white/5">{dream.mood}</span>
                <div className="flex px-3 py-1 bg-white/5 rounded-lg border border-white/5 gap-1">
                  {[...Array(dream.clarity)].map((_, i) => <Star key={i} size={14} className="text-yellow-500 fill-current" />)}
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="md:col-span-2 space-y-8">
              {/* Creative Story */}
              <div className="relative pl-6 border-l-2 border-mystic-500/30">
                <p className="text-lg md:text-xl text-slate-200 font-serif italic leading-relaxed">
                  "{dream.analysis?.creativeStory}"
                </p>
              </div>

              {/* Original Dream */}
              <div className="bg-night-900/50 p-6 rounded-2xl border border-white/5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Original Entry</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{dream.content}</p>
              </div>

               {/* Reality Check */}
               <div className="bg-night-900/50 p-6 rounded-2xl border border-white/5">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Reality Tether</h3>
                 <input 
                   type="text" 
                   className="w-full bg-transparent border-b border-white/10 py-2 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-mystic-500 transition-colors"
                   placeholder="Did any part of this dream manifest in reality?"
                   defaultValue={dream.realityConnection || ''}
                   onBlur={(e) => {
                      if (e.target.value !== dream.realityConnection) {
                        onUpdate({ ...dream, realityConnection: e.target.value });
                      }
                   }}
                 />
                 <p className="text-[10px] text-slate-500 mt-2">Connecting dreams to reality improves the AI's pattern recognition accuracy.</p>
              </div>
            </div>

            <div className="space-y-6">
               {/* Analysis Card */}
               <div className="bg-gradient-to-br from-mystic-900/20 to-night-900 p-6 rounded-2xl border border-white/5">
                 <h3 className="text-xs font-bold text-mystic-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Brain size={14} /> Emotional Core
                 </h3>
                 <p className="text-sm text-slate-300 leading-relaxed">{dream.analysis?.emotionalAnalysis}</p>
               </div>

               {/* Symbols */}
               <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Dream Symbols</h3>
                  <div className="space-y-3">
                    {dream.analysis?.symbols.map((sym, i) => (
                      <div key={i} className="bg-night-800/50 p-3 rounded-xl border border-white/5 hover:border-mystic-500/30 transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white font-medium capitalize">{sym.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase bg-night-950 px-1.5 py-0.5 rounded">{sym.type}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">{sym.meaning}</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Shell ---

function App() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('journal');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);

  useEffect(() => {
    setDreams(loadDreams());
  }, []);

  const handleSaveNewDream = async (data: any) => {
    try {
      const analysis = await GeminiService.analyzeDreamContent(data.content);
      const imageUrl = await GeminiService.generateDreamImage(data.content, analysis.themes);

      const newDream: Dream = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        content: data.content,
        mood: data.mood,
        clarity: data.clarity,
        isRecurring: data.isRecurring,
        analysis,
        imageUrl,
      };

      const updated = [newDream, ...dreams];
      setDreams(updated);
      saveDreams(updated);
      setSelectedDream(newDream); // Open the new dream immediately
    } catch (e) {
      console.error(e);
      alert('Failed to analyze dream. Please check connectivity or API key.');
    }
  };

  const handleUpdateDream = (updated: Dream) => {
    const newDreams = dreams.map(d => d.id === updated.id ? updated : d);
    setDreams(newDreams);
    saveDreams(newDreams);
    setSelectedDream(updated);
  };

  return (
    <div className="min-h-screen text-slate-200">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onRecord={() => setIsRecordOpen(true)} 
      />

      <main className="md:pl-64 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {activeTab === 'journal' && <JournalView dreams={dreams} onSelect={setSelectedDream} />}
          {activeTab === 'stats' && <StatsView dreams={dreams} />}
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
  );
}

export default App;
