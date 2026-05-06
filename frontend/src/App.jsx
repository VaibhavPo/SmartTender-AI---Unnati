/**
 * SmartTender AI — Main App with Stitch-style Layout
 * ====================================================
 * Top nav bar with horizontal tabs + left sidebar with tender context
 * + main content area. Matches the Stitch Ingestion Portal design.
 */

import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  FileText,
  ClipboardCheck,
  BarChart3,
  FileBarChart,
  Bell,
  Settings,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
  Shield,
  LogOut,
  X,
  FolderOpen,
  Users,
  CheckSquare,
  Sparkles,
  ScrollText,
} from "lucide-react";

import UploadPage from "./pages/UploadPage";
import CriteriaReviewPage from "./pages/CriteriaReviewPage";
import EvaluationDashboardPage from "./pages/EvaluationDashboardPage";
import ManualReviewPage from "./pages/ManualReviewPage";
import ReportPage from "./pages/ReportPage";

// ── Theme Context ──
const ThemeContext = createContext();
export function useTheme() {
  return useContext(ThemeContext);
}

// ── Tender Context (shared across pages) ──
const TenderContext = createContext();
export function useTender() {
  return useContext(TenderContext);
}

// Top nav tabs
const topTabs = [
  { path: "/", label: "Upload" },
  { path: "/criteria", label: "Review" },
  { path: "/evaluation", label: "Dashboard" },
  { path: "/report", label: "Reports" },
];

// Left sidebar items
const sidebarItems = [
  { path: "/", label: "Current Tender", Icon: FolderOpen },
  { path: "/bidder-docs", label: "Bidder Documents", Icon: Users },
  { path: "/criteria", label: "Compliance Matrix", Icon: CheckSquare },
  { path: "/ai-insights", label: "AI Insights", Icon: Sparkles },
  { path: "/audit", label: "Audit Logs", Icon: ScrollText },
];

// ── Settings Dropdown ──
function SettingsDropdown() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const themeOptions = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "system", label: "System", Icon: Monitor },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-200 dark:hover:bg-white/10 transition-colors text-surface-500 dark:text-gray-400"
        aria-label="Settings"
      >
        <Settings size={18} strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1E293B] rounded-xl shadow-xl border border-black/[0.08] dark:border-white/[0.1] z-50 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="font-heading font-bold text-sm text-surface-800 dark:text-gray-100">Settings</span>
            <button onClick={() => setOpen(false)} className="text-surface-400 hover:text-surface-600 dark:text-gray-500 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          </div>
          <div className="p-4">
            <p className="text-[11px] font-bold tracking-wider uppercase text-surface-500 dark:text-gray-400 mb-2.5">Appearance</p>
            <div className="flex gap-1.5 bg-surface-200/60 dark:bg-white/[0.06] rounded-lg p-1">
              {themeOptions.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-semibold transition-all ${
                    theme === value
                      ? "bg-white dark:bg-[#2E66FF] text-brand-500 dark:text-white shadow-sm"
                      : "text-surface-500 dark:text-gray-400 hover:text-surface-700 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon size={13} strokeWidth={2.2} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />
          <div className="p-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200/60 dark:hover:bg-white/[0.06] transition-colors font-medium">
              <Shield size={15} strokeWidth={2} className="text-surface-400 dark:text-gray-500" />
              Privacy & Security
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-gray-300 hover:bg-surface-200/60 dark:hover:bg-white/[0.06] transition-colors font-medium">
              <HelpCircle size={15} strokeWidth={2} className="text-surface-400 dark:text-gray-500" />
              Help & Support
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 transition-colors font-medium">
              <LogOut size={15} strokeWidth={2} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Top Navigation Bar ──
function TopNavBar() {
  return (
    <header className="flex items-center justify-between px-5 py-0 bg-white dark:bg-[#0F172A] border-b border-black/[0.08] dark:border-white/[0.08] h-14">
      {/* Left: Logo + Tabs */}
      <div className="flex items-center gap-8">
        <h1 className="font-heading font-extrabold text-[15px] text-brand-500 dark:text-brand-200 tracking-tight whitespace-nowrap">
          Unnati SmartTender AI
        </h1>
        <nav className="flex items-center gap-1">
          {topTabs.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `px-4 py-4 text-[13px] font-semibold border-b-2 transition-all ${
                  isActive
                    ? "border-brand-500 dark:border-brand-400 text-brand-500 dark:text-brand-300"
                    : "border-transparent text-surface-500 dark:text-gray-400 hover:text-surface-800 dark:hover:text-gray-200"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-200 dark:hover:bg-white/10 transition-colors text-surface-500 dark:text-gray-400 relative">
          <Bell size={18} strokeWidth={2} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white dark:ring-[#0F172A]" />
        </button>
        <SettingsDropdown />
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-brand-500/20 cursor-pointer">
          U
        </div>
      </div>
    </header>
  );
}

// ── Left Sidebar ──
function LeftSidebar() {
  const { activeTender } = useTender();

  return (
    <nav className="w-52 bg-white dark:bg-[#0F172A] border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col">
      {/* Tender info */}
      <div className="px-4 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <p className="text-[11px] font-bold text-brand-500 dark:text-brand-300 tracking-wide">
          {activeTender ? `TENDER-${activeTender.id?.slice(0, 8)?.toUpperCase()}` : "NO TENDER"}
        </p>
        <p className="text-[10px] text-surface-500 dark:text-gray-500 mt-0.5">
          Federal Procurement Div
        </p>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-2 px-2 flex flex-col gap-0.5">
        {sidebarItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path + label}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                isActive
                  ? "bg-brand-400/[0.12] dark:bg-brand-400/[0.15] text-brand-500 dark:text-brand-300 font-extrabold"
                  : "text-surface-500 dark:text-gray-500 hover:bg-surface-200/60 dark:hover:bg-white/[0.06] hover:text-surface-700 dark:hover:text-gray-300"
              }`
            }
          >
            <Icon size={15} strokeWidth={2} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-1">
        <NavLink
          to="/report"
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-brand-500 dark:bg-brand-400 text-white font-bold rounded-lg text-[12px] hover:bg-brand-600 dark:hover:bg-[#004fe6] transition-all shadow-md shadow-brand-500/15"
        >
          <FileBarChart size={14} strokeWidth={2} />
          Generate Report
        </NavLink>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-surface-500 dark:text-gray-500 text-[11px] hover:text-surface-700 dark:hover:text-gray-300 transition-colors font-medium">
          <HelpCircle size={13} strokeWidth={2} />
          Support
        </button>
      </div>
    </nav>
  );
}

// ── Main App ──
function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("st-theme") || "light");
  const [activeTender, setActiveTender] = useState(null);
  const [tenders, setTenders] = useState([]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        if (mq.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      };
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    localStorage.setItem("st-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <TenderContext.Provider value={{ activeTender, setActiveTender, tenders, setTenders }}>
        <Router>
          <div className="flex flex-col h-screen overflow-hidden bg-surface-100 dark:bg-surface-900">
            {/* Top Navigation */}
            <TopNavBar />

            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar */}
              <LeftSidebar />

              {/* Main Content */}
              <main className="flex-1 overflow-y-auto bg-surface-100 dark:bg-surface-900">
                <div className="p-6 max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/" element={<UploadPage />} />
                    <Route path="/bidder-docs" element={<UploadPage initialTab="bidder" />} />
                    <Route path="/criteria" element={<CriteriaReviewPage />} />
                    <Route path="/evaluation" element={<EvaluationDashboardPage />} />
                    <Route path="/review" element={<ManualReviewPage />} />
                    <Route path="/report" element={<ReportPage />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </Router>
      </TenderContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;
