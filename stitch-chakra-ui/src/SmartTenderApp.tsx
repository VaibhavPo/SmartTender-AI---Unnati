import { Navigate, Route, Routes } from "react-router-dom";
import { OfficerProvider } from "./state/OfficerContext";
import { OfficerShell } from "./components/organisms/OfficerShell";
import { UploadPage } from "./pages/UploadPage";
import { CriteriaReviewPage } from "./pages/CriteriaReviewPage";
import { EvaluationDashboardPage } from "./pages/EvaluationDashboardPage";
import { ManualReviewPage } from "./pages/ManualReviewPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { ReportPage } from "./pages/ReportPage";

export default function SmartTenderApp() {
  return (
    <OfficerProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route
          path="/upload"
          element={
            <OfficerShell title="Document Upload">
              <UploadPage />
            </OfficerShell>
          }
        />
        <Route
          path="/criteria"
          element={
            <OfficerShell title="Criteria Review">
              <CriteriaReviewPage />
            </OfficerShell>
          }
        />
        <Route
          path="/dashboard"
          element={
            <OfficerShell title="Evaluation Dashboard">
              <EvaluationDashboardPage />
            </OfficerShell>
          }
        />
        <Route
          path="/manual"
          element={
            <OfficerShell title="Manual Review Queue">
              <ManualReviewPage />
            </OfficerShell>
          }
        />
        <Route
          path="/audit"
          element={
            <OfficerShell title="Audit Logs">
              <AuditLogsPage />
            </OfficerShell>
          }
        />
        <Route
          path="/report"
          element={
            <OfficerShell title="Final Report">
              <ReportPage />
            </OfficerShell>
          }
        />
      </Routes>
    </OfficerProvider>
  );
}

