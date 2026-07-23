import { useState, useEffect } from "react";
import { RegistrationForm } from "./components/RegistrationForm";
import { MainDashboard } from "./components/MainDashboard";
import { TestScreen } from "./components/TestScreen";
import { TestResult } from "./components/TestResult";
import { WifiOff, AlertTriangle } from "lucide-react";

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

type ViewState = "dashboard" | "test" | "result";

function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Navigation Router States
  const [view, setView] = useState<ViewState>("dashboard");
  const [activeTestMode, setActiveTestMode] = useState<string>("");
  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [activeTopicId, setActiveTopicId] = useState<string>("");
  const [activeTestResult, setActiveTestResult] = useState<any>(null);

  // Resume Test state
  const [hasSavedTest, setHasSavedTest] = useState(false);
  const [savedTestData, setSavedTestData] = useState<any>(null);

  useEffect(() => {
    // 1. Check student profile in localStorage
    const savedStudent = localStorage.getItem("vcg_student");
    if (savedStudent) {
      try {
        const parsedStudent = JSON.parse(savedStudent);
        setStudent(parsedStudent);
        checkSavedTest(parsedStudent.student_id);
      } catch (e) {
        console.error("Failed to parse saved student data", e);
        localStorage.removeItem("vcg_student");
      }
    }

    // 2. Register network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkSavedTest = (studentId: string) => {
    const saveKey = `vcg_active_test_${studentId}`;
    const savedTestStr = localStorage.getItem(saveKey);
    if (savedTestStr) {
      try {
        const parsedTest = JSON.parse(savedTestStr);
        setSavedTestData(parsedTest);
        setHasSavedTest(true);
      } catch (e) {
        console.error("Failed to parse saved test state", e);
        localStorage.removeItem(saveKey);
      }
    }
  };

  const handleRegister = (studentData: Student) => {
    localStorage.setItem("vcg_student", JSON.stringify(studentData));
    setStudent(studentData);
    checkSavedTest(studentData.student_id);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to switch student accounts? This will clear your current profile details.")) {
      if (student) {
        localStorage.removeItem(`vcg_active_test_${student.student_id}`);
      }
      localStorage.removeItem("vcg_student");
      setStudent(null);
      setView("dashboard");
      setHasSavedTest(false);
    }
  };

  const handleStartTest = (mode: string, chapterId: string, topicId: string) => {
    setActiveTestMode(mode);
    setActiveChapterId(chapterId);
    setActiveTopicId(topicId);
    setView("test");
  };

  const handleResumeTest = () => {
    if (savedTestData) {
      setActiveTestMode(savedTestData.mode);
      setActiveChapterId(savedTestData.chapterId || "");
      setActiveTopicId(savedTestData.topicId || "");
      setView("test");
    }
    setHasSavedTest(false);
  };

  const handleDiscardTest = () => {
    if (student) {
      localStorage.removeItem(`vcg_active_test_${student.student_id}`);
    }
    setHasSavedTest(false);
    setSavedTestData(null);
  };

  const handleFinishTest = (resultData: any) => {
    setActiveTestResult(resultData);
    setView("result");
  };

  const handleCloseResults = () => {
    setView("dashboard");
    setActiveTestResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Global Offline Header Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-slate-950 font-semibold text-xs py-2 px-4 flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You are currently disconnected. We will auto-save your attempts locally.</span>
        </div>
      )}

      {/* Main View Router */}
      {!student ? (
        <RegistrationForm onRegister={handleRegister} />
      ) : (
        <>
          {view === "dashboard" && (
            <MainDashboard 
              student={student} 
              onLogout={handleLogout} 
              onStartTest={handleStartTest} 
            />
          )}

          {view === "test" && (
            <TestScreen
              student={student}
              mode={activeTestMode}
              chapterId={activeChapterId}
              topicId={activeTopicId}
              onFinish={handleFinishTest}
              onCancel={handleCloseResults}
            />
          )}

          {view === "result" && activeTestResult && (
            <TestResult
              result={activeTestResult}
              mode={activeTestMode}
              subject={activeTestMode === "Retry Wrong" ? "Mixed" : "QUANT"} // Mock Subject context
              onClose={handleCloseResults}
            />
          )}
        </>
      )}

      {/* RESUME TEST POPUP DIALOG */}
      {hasSavedTest && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in duration-200">
            <h3 className="text-lg font-heading font-bold text-slate-100 mb-2 flex items-center gap-2">
              <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0" />
              Interrupted Practice Found
            </h3>
            <p className="text-xs text-slate-400 leading-normal mb-6">
              We detected an unfinished **{savedTestData?.mode}** on this device. Would you like to resume it and continue from where you left off?
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDiscardTest}
                className="flex-1 py-3 text-xs font-semibold rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:text-red-400 text-slate-400 transition-all cursor-pointer"
              >
                Discard Test
              </button>
              
              <button
                onClick={handleResumeTest}
                className="flex-1 py-3 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                Resume Test
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
