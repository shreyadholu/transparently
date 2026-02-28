import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import Auth from "./pages/Auth";
import StudentLayout from "./components/StudentLayout";
import StudentDashboard from "./pages/student/Dashboard";
import JobBoard from "./pages/student/JobBoard";
import Feedback from "./pages/student/Feedback";
import Profile from "./pages/student/Profile";
import AdminLayout from "./components/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import JobManagement from "./pages/admin/JobManagement";
import ActivePostings from "./pages/admin/ActivePostings";
import ApplicantReview from "./pages/admin/ApplicantReview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role: 'student' | 'recruiter' }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'student' ? '/student' : '/admin'} replace />;
  return <>{children}</>;
};

const AuthRoute = () => {
  const { user } = useApp();
  if (user) return <Navigate to={user.role === 'student' ? '/student' : '/admin'} replace />;
  return <Auth />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/" element={<AuthRoute />} />
            <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
              <Route index element={<StudentDashboard />} />
              <Route path="jobs" element={<JobBoard />} />
              <Route path="activity" element={<Feedback />} />
              <Route path="feedback" element={<Navigate to="/student/activity" replace />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute role="recruiter"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="jobs" element={<JobManagement />} />
              <Route path="active-postings" element={<ActivePostings />} />
              <Route path="applicants" element={<ApplicantReview />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
