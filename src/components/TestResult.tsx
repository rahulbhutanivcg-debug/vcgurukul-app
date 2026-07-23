import React, { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Zap, 
  Brain, 
  ArrowLeft, 
  BookOpen, 
  Flame, 
  ChevronDown, 
  ChevronUp,
  Clock
} from "lucide-react";

interface ResponseDetail {
  q_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option: string;
  correct_option: string;
  is_correct: boolean;
  solution_steps: string;
  distractor_notes: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  time_taken_sec: number;
}

interface TestResultProps {
  result: {
    attempt_id: string;
    score: number;
    max_score: number;
    accuracy_pct: number;
    attempted: number;
    correct: number;
    wrong: number;
    skipped: number;
    time_taken_sec: number;
    guess_analysis: string;
    error_dna: Record<string, number>;
    responses: ResponseDetail[];
  };
  mode: string;
  subject: string;
  onClose: () => void;
}

export const TestResult: React.FC<TestResultProps> = ({
  result,
  mode,
  subject,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "review">("summary");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // 1. Calculate negative marks lost
  // We can calculate it based on (result.wrong * 0.25)
  // Let's assume standard negative marking is 0.25 per wrong answer.
  const negativeLoss = result.wrong * 0.25;

  // 2. Identify Speed vs Accuracy topics
  // We need to map responses by topic_id or topic_name (we can mock group or extract from solution)
  // Let's simulate grouping responses by a dummy topic based on the q_id or section
  const getTopicGroup = (q: ResponseDetail) => {
    if (q.q_id.includes("prop")) return "Ratios & Proportions";
    if (q.q_id.includes("ind")) return "Indices Laws";
    if (q.q_id.includes("log")) return "Logarithms";
    return "Basic Core Concepts";
  };

  const topicsStats: Record<string, { correct: number; total: number; totalTime: number }> = {};
  result.responses.forEach(r => {
    const tGroup = getTopicGroup(r);
    if (!topicsStats[tGroup]) {
      topicsStats[tGroup] = { correct: 0, total: 0, totalTime: 0 };
    }
    topicsStats[tGroup].total++;
    topicsStats[tGroup].totalTime += r.time_taken_sec;
    if (r.is_correct) {
      topicsStats[tGroup].correct++;
    }
  });

  const quadrants: Record<string, string[]> = {
    Strong: [],       // Acc >= 70%, Speed: Avg Time < 60s
    Careless: [],     // Acc < 70%, Speed: Avg Time < 60s
    SlowSure: [],     // Acc >= 70%, Speed: Avg Time >= 60s
    Danger: []        // Acc < 70%, Speed: Avg Time >= 60s
  };

  for (const tName in topicsStats) {
    const stats = topicsStats[tName];
    const acc = (stats.correct / stats.total) * 100;
    const avgTime = stats.totalTime / stats.total;

    if (acc >= 70) {
      if (avgTime < 60) quadrants.Strong.push(tName);
      else quadrants.SlowSure.push(tName);
    } else {
      if (avgTime < 60) quadrants.Careless.push(tName);
      else quadrants.Danger.push(tName);
    }
  }

  // 3. Rushing Detection
  const rushingCount = result.responses.filter(r => !r.is_correct && r.selected_option !== "" && r.time_taken_sec < 15).length;
  const isRushing = rushingCount >= (result.wrong * 0.3) && result.wrong > 0;

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-900 bg-slate-900/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <div className="text-right">
            <span className="text-xs text-slate-500 font-mono">Attempt ID: {result.attempt_id}</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-indigo-200 to-slate-400">
            Performance Diagnostics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Diagnostic report for your {subject} - {mode} attempt
          </p>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-slate-900">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-3.5 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "summary"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Summary & Analytics
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`px-6 py-3.5 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "review"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Question Review ({result.responses.length})
          </button>
        </div>

        {/* Tab 1: Summary Dashboard */}
        {activeTab === "summary" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Top Score Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Score Card */}
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-900/30 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-48 shadow-xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Score Obtained</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-heading">
                      {result.score.toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-sm">/ {result.max_score} marks</span>
                  </div>
                </div>

                <div className="border-t border-slate-900/80 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Accuracy Rate:</span>
                  <span className="font-bold text-indigo-400">{result.accuracy_pct.toFixed(1)}%</span>
                </div>
              </div>

              {/* Grid counts */}
              <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl flex flex-col justify-between h-48">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Deduction Penalty</span>
                  <span className="text-2xl font-bold text-red-400 mt-2 block">
                    -{negativeLoss.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Lost to negative marking</span>
                </div>
                <div className="text-xs text-slate-400">
                  {result.wrong} wrong answers
                </div>
              </div>

              {/* Time taken */}
              <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl flex flex-col justify-between h-48">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Time Taken</span>
                  <span className="text-2xl font-bold text-slate-200 mt-2 block flex items-center gap-1.5">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    {formatTime(result.time_taken_sec)}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Avg {(result.time_taken_sec / (result.responses.length || 1)).toFixed(0)}s per question
                </div>
              </div>

            </div>

            {/* Answer Rate Split */}
            <div className="grid grid-cols-3 gap-4 text-center bg-slate-900/10 border border-slate-900 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Correct</span>
                <span className="text-sm font-bold text-green-400 flex items-center justify-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {result.correct}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Wrong</span>
                <span className="text-sm font-bold text-red-400 flex items-center justify-center gap-1 mt-1">
                  <XCircle className="w-3.5 h-3.5" />
                  {result.wrong}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Skipped</span>
                <span className="text-sm font-bold text-slate-400 flex items-center justify-center gap-1 mt-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {result.skipped}
                </span>
              </div>
            </div>

            {/* Strategy Analyser & DNA Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Guess Analyser */}
              <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl">
                <h3 className="text-sm font-semibold font-heading text-slate-200 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Attempt Strategy Analyser
                </h3>

                <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                  <p className="whitespace-pre-line text-slate-300">
                    {result.guess_analysis}
                  </p>
                  
                  {isRushing && (
                    <div className="bg-amber-950/20 border border-amber-900/40 text-amber-300 p-3.5 rounded-xl flex gap-2.5 mt-4">
                      <Flame className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Rushing Pattern Flagged</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          You spent less than 15 seconds on {rushingCount} of the questions you got wrong. You are rushing; reading the question twice before tapping would likely prevent these.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error DNA */}
              <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl">
                <h3 className="text-sm font-semibold font-heading text-slate-200 mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Error DNA Distribution
                </h3>

                <div className="space-y-4">
                  {Object.entries(result.error_dna || {}).map(([key, count]) => {
                    const totalWrong = result.wrong || 1;
                    const pct = (count / totalWrong) * 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">{key}</span>
                          <span className="text-slate-500 font-mono">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-900/80 pt-4 mt-6 text-[10px] text-slate-500 leading-normal">
                  Error types are determined from distractor tags mapping to your selected wrong options.
                </div>
              </div>

            </div>

            {/* Speed vs Accuracy Quadrant */}
            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl">
              <h3 className="text-sm font-semibold font-heading text-slate-200 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Topic Strength Quadrants
              </h3>

              <div className="grid grid-cols-2 gap-4">
                
                {/* Strong Quadrant */}
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-950/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Strong (Speed & Accuracy)</span>
                  <div className="mt-2 space-y-1">
                    {quadrants.Strong.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">None</span>
                    ) : (
                      quadrants.Strong.map(t => <p key={t} className="text-xs text-slate-300">• {t}</p>)
                    )}
                  </div>
                </div>

                {/* Careless */}
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-950/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Careless (Fast but Inaccurate)</span>
                  <div className="mt-2 space-y-1">
                    {quadrants.Careless.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">None</span>
                    ) : (
                      quadrants.Careless.map(t => <p key={t} className="text-xs text-slate-300">• {t}</p>)
                    )}
                  </div>
                </div>

                {/* Slow but Sure */}
                <div className="bg-slate-950 p-4 rounded-xl border border-blue-950/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Slow but Sure (Slow but Accurate)</span>
                  <div className="mt-2 space-y-1">
                    {quadrants.SlowSure.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">None</span>
                    ) : (
                      quadrants.SlowSure.map(t => <p key={t} className="text-xs text-slate-300">• {t}</p>)
                    )}
                  </div>
                </div>

                {/* Danger */}
                <div className="bg-slate-950 p-4 rounded-xl border border-red-950/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Danger (Slow & Inaccurate)</span>
                  <div className="mt-2 space-y-1">
                    {quadrants.Danger.length === 0 ? (
                      <span className="text-xs text-slate-600 italic">None</span>
                    ) : (
                      quadrants.Danger.map(t => <p key={t} className="text-xs text-slate-300">• {t}</p>)
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Review Screen */}
        {activeTab === "review" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {result.responses.map((q, idx) => {
              const isExpanded = !!expandedQuestions[q.q_id];
              return (
                <div 
                  key={q.q_id}
                  className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => toggleQuestion(q.q_id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/20 transition-all select-none"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs font-bold text-slate-500 font-mono">Q{idx + 1}</span>
                        {q.selected_option === "" ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-slate-950 text-slate-500 uppercase tracking-wider font-mono">Skipped</span>
                        ) : q.is_correct ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider font-mono">Correct</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider font-mono">Incorrect</span>
                        )}
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-indigo-500" /> {q.time_taken_sec}s
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-slate-200 line-clamp-1 leading-relaxed">
                        {q.question_text}
                      </p>
                    </div>

                    <div className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-900/80 bg-slate-950/40 p-6 space-y-6">
                      
                      {/* Full Question Text */}
                      <p className="text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-line">
                        {q.question_text}
                      </p>

                      {/* Options listing */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: "A", text: q.option_a },
                          { label: "B", text: q.option_b },
                          { label: "C", text: q.option_c },
                          { label: "D", text: q.option_d }
                        ].map((opt) => {
                          const isCorrect = q.correct_option === opt.label;
                          const isSelected = q.selected_option === opt.label;
                          
                          let cardStyle = "border-slate-900 bg-slate-950/40 text-slate-400";
                          let labelStyle = "bg-slate-900 border border-slate-800 text-slate-500";
                          
                          if (isCorrect) {
                            cardStyle = "border-green-600 bg-green-950/10 text-green-200";
                            labelStyle = "bg-green-600 text-white";
                          } else if (isSelected && !isCorrect) {
                            cardStyle = "border-red-600 bg-red-950/10 text-red-200";
                            labelStyle = "bg-red-600 text-white";
                          }

                          return (
                            <div 
                              key={opt.label}
                              className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-3 transition-all ${cardStyle}`}
                            >
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${labelStyle}`}>
                                {opt.label}
                              </span>
                              <span className="leading-normal">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Distractor feedback warning (only if wrong option selected) */}
                      {!q.is_correct && q.selected_option !== "" && (
                        <div className="bg-red-950/20 border border-red-900/30 text-red-300 p-4 rounded-xl text-xs">
                          <p className="font-semibold mb-1">Feedback on Option {q.selected_option}:</p>
                          <p className="text-slate-400">
                            {q.selected_option === "A" && q.distractor_notes.A}
                            {q.selected_option === "B" && q.distractor_notes.B}
                            {q.selected_option === "C" && q.distractor_notes.C}
                            {q.selected_option === "D" && q.distractor_notes.D}
                          </p>
                        </div>
                      )}

                      {/* Solution steps */}
                      <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-heading">
                          Solution Steps
                        </h4>
                        <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {q.solution_steps || "No explanation provided for this question."}
                        </p>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
