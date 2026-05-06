import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/templates/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { IngestionPortalPage } from './pages/IngestionPortalPage';
import { CriteriaReviewPage } from './pages/CriteriaReviewPage';
import { ManualReviewPage } from './pages/ManualReviewPage';
import { ReportPage } from './pages/ReportPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="upload" element={<IngestionPortalPage />} />
          <Route path="review" element={<CriteriaReviewPage />} />
          <Route path="manual-review" element={<ManualReviewPage />} />
          <Route path="reports" element={<ReportPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
