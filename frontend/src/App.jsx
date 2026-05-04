/**
 * SmartTender AI — Main App with Routing
 * ========================================
 * Five screens, one sidebar nav, clean government aesthetic.
 */

import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import CriteriaReviewPage from "./pages/CriteriaReviewPage";
import EvaluationDashboardPage from "./pages/EvaluationDashboardPage";
import ManualReviewPage from "./pages/ManualReviewPage";
import ReportPage from "./pages/ReportPage";

const navItems = [
  { path: "/", label: "Upload", icon: "📄" },
  { path: "/criteria", label: "Criteria Review", icon: "📋" },
  { path: "/evaluation", label: "Evaluation", icon: "⚖️" },
  { path: "/review", label: "Manual Review", icon: "👁️" },
  { path: "/report", label: "Report", icon: "📊" },
];

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        {/* ── Sidebar Navigation ── */}
        <nav className="w-64 bg-surface-800/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <h1 className="text-xl font-bold gradient-text">SmartTender AI</h1>
            <p className="text-xs text-gray-500 mt-1">Tender Evaluation Platform</p>
          </div>

          {/* Nav Links */}
          <div className="flex-1 py-4 space-y-1 px-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary-600/20 text-primary-400 border border-primary-500/20"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5">
            <p className="text-xs text-gray-600 text-center">
              CRPF Hackathon — Theme 3
            </p>
          </div>
        </nav>

        {/* ── Main Content Area ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/criteria" element={<CriteriaReviewPage />} />
              <Route path="/evaluation" element={<EvaluationDashboardPage />} />
              <Route path="/review" element={<ManualReviewPage />} />
              <Route path="/report" element={<ReportPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
