import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Payments from "@/pages/Payments";
import Vehicles from "@/pages/Vehicles";
import CashLedger from "@/pages/CashLedger";
import ShiftAudits from "@/pages/ShiftAudits";
import Reservations from "@/pages/Reservations";
import Guests from "@/pages/Guests";
import Housekeeping from "@/pages/Housekeeping";
import Maintenance from "@/pages/Maintenance";
import CheckInVerification from "@/pages/CheckInVerification";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

function ProtectedApp() {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
          Preparing your workspace...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Dashboard} />
        <Route path={"/dashboard"} component={Dashboard} />
        <Route path={"/payments"} component={Payments} />
        <Route path={"/vehicles"} component={Vehicles} />
        <Route path={"/cash-ledger"} component={CashLedger} />
        <Route path={"/shift-audits"} component={ShiftAudits} />
        <Route path={"/reservations"} component={Reservations} />
        <Route path={"/checkin"} component={CheckInVerification} />
        <Route path={"/guests"} component={Guests} />
        <Route path={"/housekeeping"} component={Housekeeping} />
        <Route path={"/maintenance"} component={Maintenance} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/" component={ProtectedApp} />
      <Route path="/dashboard" component={ProtectedApp} />
      <Route path="/payments" component={ProtectedApp} />
      <Route path="/vehicles" component={ProtectedApp} />
      <Route path="/cash-ledger" component={ProtectedApp} />
      <Route path="/shift-audits" component={ProtectedApp} />
      <Route path="/reservations" component={ProtectedApp} />
      <Route path="/checkin" component={CheckInVerification} />
      <Route path="/guests" component={ProtectedApp} />
      <Route path="/housekeeping" component={ProtectedApp} />
      <Route path="/maintenance" component={ProtectedApp} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster richColors closeButton />
          <AuthProvider>
            <PublicRoutes />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
