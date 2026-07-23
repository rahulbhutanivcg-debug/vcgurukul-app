import { useState, useEffect } from "react";
import { RegistrationForm } from "./components/RegistrationForm";
import { MainDashboard } from "./components/MainDashboard";
import { WifiOff } from "lucide-react";

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

function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check localStorage for student details on mount
    const savedStudent = localStorage.getItem("vcg_student");
    if (savedStudent) {
      try {
        setStudent(JSON.parse(savedStudent));
      } catch (e) {
        console.error("Failed to parse saved student data", e);
        localStorage.removeItem("vcg_student");
      }
    }

    // Register online/offline status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRegister = (studentData: Student) => {
    localStorage.setItem("vcg_student", JSON.stringify(studentData));
    setStudent(studentData);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to switch student accounts? This will clear your current profile details.")) {
      localStorage.removeItem("vcg_student");
      setStudent(null);
    }
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
        <MainDashboard student={student} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
