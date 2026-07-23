import React, { useState, useEffect } from "react";
import { config } from "../config";
import { LogOut, BookOpen, Layers, Sparkles, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface Student {
  student_id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  level: string;
  batch_code: string;
  is_offline?: boolean;
}

interface Topic {
  topic_id: string;
  chapter_id: string;
  topic_name: string;
  sequence: number;
}

interface Chapter {
  chapter_id: string;
  subject: string;
  chapter_no: number;
  chapter_name: string;
  icai_weightage: string;
  topics: Topic[];
}

interface MainDashboardProps {
  student: Student;
  onLogout: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ student, onLogout }) => {
  const [subject, setSubject] = useState<"QUANT" | "SM">("QUANT");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [appConfig, setAppConfig] = useState<Record<string, string>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Configuration
      const configRes = await fetch(`${config.API_URL}?action=getConfig&app_token=${config.APP_TOKEN}`);
      const configJson = await configRes.json();
      if (configJson.status === "success") {
        setAppConfig(configJson.data);
      }

      // 2. Fetch Chapters for selected subject
      const chaptersRes = await fetch(`${config.API_URL}?action=getChapters&subject=${subject}&app_token=${config.APP_TOKEN}`);
      const chaptersJson = await chaptersRes.json();
      
      if (chaptersJson.status === "success") {
        setChapters(chaptersJson.data);
        
        // Auto-expand first chapter by default
        if (chaptersJson.data.length > 0) {
          setExpandedChapters({ [chaptersJson.data[0].chapter_id]: true });
        }
      } else {
        setError(chaptersJson.message || "Failed to load chapters.");
      }
    } catch (err) {
      console.error("Failed to load backend data, loading offline default state:", err);
      setError("Unable to connect to Sheets backend. Working in offline mock mode.");
      loadOfflineFallbackData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [subject]);

  const loadOfflineFallbackData = () => {
    // Inject fallback sample data in case sheet connection is blocked
    const fallbackConfig = {
      announcement_text: "You are currently offline. Running in demo layout. Check your backend deployment to sync.",
      app_name: "VC Gurukul (Offline)"
    };
    setAppConfig(fallbackConfig);

    const quantFallback: Chapter[] = [
      {
        chapter_id: "ch_q_01",
        subject: "QUANT",
        chapter_no: 1,
        chapter_name: "Ratio and Proportion, Indices, Logarithms (Offline Mock)",
        icai_weightage: "10%",
        topics: [
          { topic_id: "tp_q_01_01", chapter_id: "ch_q_01", topic_name: "Ratios & Proportions Basic Concepts", sequence: 1 },
          { topic_id: "tp_q_01_02", chapter_id: "ch_q_01", topic_name: "Indices Laws & Properties", sequence: 2 }
        ]
      }
    ];

    const smFallback: Chapter[] = [
      {
        chapter_id: "ch_sm_01",
        subject: "SM",
        chapter_no: 1,
        chapter_name: "Introduction to Strategic Management (Offline Mock)",
        icai_weightage: "15%",
        topics: [
          { topic_id: "tp_sm_01_01", chapter_id: "ch_sm_01", topic_name: "Business Policy & Strategy Essentials", sequence: 1 }
        ]
      }
    ];

    setChapters(subject === "QUANT" ? quantFallback : smFallback);
    setExpandedChapters({ [subject === "QUANT" ? "ch_q_01" : "ch_sm_01"]: true });
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation / Student Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              VC
            </div>
            <span className="font-heading font-bold text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">
              VC GURUKUL
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200">{student.name}</span>
              <span className="text-xs text-slate-400">
                {student.level} {student.batch_code ? `• ${student.batch_code}` : ""}
              </span>
            </div>

            {student.is_offline && (
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Offline Mode
              </span>
            )}

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold border border-slate-900"
              title="Switch Student Account"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Switch Student</span>
            </button>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {appConfig.announcement_text && (
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-950/20 to-indigo-950/40 border-b border-indigo-900/30 py-2.5 text-center px-4">
          <p className="text-xs text-indigo-200 font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            {appConfig.announcement_text}
          </p>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Error notification */}
        {error && (
          <div className="mb-6 bg-red-950/20 border border-red-900/40 text-red-300 p-4 rounded-xl flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Backend sync notice</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="px-3 py-1 bg-red-900/40 hover:bg-red-800/50 rounded-lg text-xs font-semibold transition-all shrink-0 self-center"
            >
              Retry
            </button>
          </div>
        )}

        {/* Mobile profile display */}
        <div className="sm:hidden mb-6 p-4 rounded-2xl bg-slate-900/30 border border-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400">
            {student.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-sm font-semibold">{student.name}</h4>
            <p className="text-xs text-slate-400">
              {student.level} {student.batch_code ? `| ${student.batch_code}` : ""}
            </p>
          </div>
        </div>

        {/* Subject Navigation Tabs */}
        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-900/80 mb-8">
          <button
            onClick={() => setSubject("QUANT")}
            className={`flex-1 py-3.5 rounded-xl font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              subject === "QUANT"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            Quantitative Aptitude
          </button>
          <button
            onClick={() => setSubject("SM")}
            className={`flex-1 py-3.5 rounded-xl font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              subject === "SM"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Strategic Management
          </button>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-900/40 rounded-2xl border border-slate-900 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {chapters.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No chapters uploaded for this subject yet.</p>
              </div>
            ) : (
              chapters.map((ch) => {
                const isExpanded = !!expandedChapters[ch.chapter_id];
                return (
                  <div
                    key={ch.chapter_id}
                    className="border border-slate-900/80 bg-slate-900/20 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-800/80"
                  >
                    {/* Chapter Header bar */}
                    <div
                      onClick={() => toggleChapter(ch.chapter_id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/30 transition-all select-none"
                    >
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                            Ch {ch.chapter_no}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            Weightage: {ch.icai_weightage}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-100 font-heading leading-snug">
                          {ch.chapter_name}
                        </h3>
                      </div>
                      
                      <div className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {/* Nested Topics List */}
                    {isExpanded && (
                      <div className="border-t border-slate-900 bg-slate-950/40 px-5 py-4 divide-y divide-slate-900/60">
                        {ch.topics.length === 0 ? (
                          <p className="text-slate-500 text-xs py-2">No topics found for this chapter.</p>
                        ) : (
                          ch.topics.map((tp) => (
                            <div key={tp.topic_id} className="py-4 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <span className="text-xs text-slate-500 font-mono block mb-1">
                                  Topic {ch.chapter_no}.{tp.sequence}
                                </span>
                                <h4 className="text-sm font-medium text-slate-300">
                                  {tp.topic_name}
                                </h4>
                              </div>

                              {/* Drill Action buttons (Phase 3 placeholders) */}
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  disabled
                                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50 select-none"
                                >
                                  {subject === "QUANT" ? "MCQ Practice" : "SM Practice"}
                                </button>
                                <span className="text-[10px] text-slate-600 bg-slate-950 border border-slate-900 px-2 py-1 rounded">
                                  Phase 3
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="border-t border-slate-950 py-6 text-center text-[10px] text-slate-600 max-w-7xl mx-auto w-full">
        <p>© 2026 VC Gurukul. All rights reserved.</p>
        <p className="mt-1">Free for students. Data saved to secure Sheets container.</p>
      </footer>
    </div>
  );
};
