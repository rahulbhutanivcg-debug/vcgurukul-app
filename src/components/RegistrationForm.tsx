import React, { useState } from "react";
import { config } from "../config";
import { User, Phone, Mail, MapPin, GraduationCap, Briefcase, AlertCircle, RefreshCw } from "lucide-react";

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

interface RegistrationFormProps {
  onRegister: (student: Student) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [level, setLevel] = useState("Foundation");
  const [batchCode, setBatchCode] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!name.trim() || !phone.trim() || !city.trim()) {
      setError("Please fill in all required fields (Name, Mobile, City).");
      return;
    }
    
    setError(null);
    setLoading(true);

    const studentPayload = {
      action: "registerStudent",
      app_token: config.APP_TOKEN,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      city: city.trim(),
      level,
      batch_code: batchCode.trim()
    };

    try {
      // Use text/plain content type to avoid CORS pre-flight OPTIONS request 
      // which Google Apps Script does not support.
      const response = await fetch(config.API_URL, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(studentPayload)
      });

      const result = await response.json();

      if (result.status === "success" && result.student_id) {
        onRegister({
          student_id: result.student_id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          city: city.trim(),
          level,
          batch_code: batchCode.trim(),
          is_offline: false
        });
      } else {
        setError(result.message || "Registration failed. Please contact admin.");
      }
    } catch (err) {
      console.warn("Network error during registration, logging in offline:", err);
      // Fallback offline sync support - never block the student
      const offlineId = `std_offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      onRegister({
        student_id: offlineId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim(),
        level,
        batch_code: batchCode.trim(),
        is_offline: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-height-screen py-12 px-4 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black min-h-screen">
      <div className="max-w-md w-full space-y-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glow decorations */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight font-heading text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-300 to-indigo-100">
            VC GURUKUL
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter your details once to start practicing
          </p>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-800/50 text-red-300 p-4 rounded-xl flex items-start gap-3 text-sm animate-pulse">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Rahul Bhutani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-100 transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Phone className="w-5 h-5" />
                </span>
                <input
                  type="tel"
                  required
                  placeholder="9999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-100 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address <span className="text-slate-500">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-100 transition-all"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <MapPin className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="New Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-100 transition-all"
                />
              </div>
            </div>

            {/* Level & Batch Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  ICAI Level
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-300 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Foundation">Foundation</option>
                    <option value="Intermediate">Intermediate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Batch Code <span className="text-slate-500">(Opt)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Briefcase className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="BATCH2026"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-950/60 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-100 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-indigo-500 disabled:bg-indigo-800/50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Registering...
                </span>
              ) : (
                "Get Started"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
