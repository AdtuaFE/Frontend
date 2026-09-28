import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Browse from "./pages/Browse";
import MySpaces from "./pages/MySpaces";
import CampaignDetail from "./pages/CampaignDetail";
import BookingDetail from "./pages/BookingDetail";
import SpaceDetail from "./pages/SpaceDetail";
import BrowseCampaigns from "./pages/BrowseCampaigns";
import Bookings from "./pages/Bookings";
import NotFound from "./pages/NotFound";
import PlayerPage from "./pages/PlayerPage";
import Settings from "./pages/Settings";
import PlanUpgrade from "./pages/PlanUpgrade";
import PlanConfirmation from "./pages/PlanConfirmation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
            <Route path="/spaces" element={<ProtectedRoute requiredRole="broadcaster"><MySpaces /></ProtectedRoute>} />
            <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
            <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
            <Route path="/spaces/:id" element={<ProtectedRoute><SpaceDetail /></ProtectedRoute>} />
            <Route
              path="/campaigns"
              element={<ProtectedRoute requiredRole="advertiser"><BrowseCampaigns /></ProtectedRoute>}
            />
            <Route
              path="/campaigns/marketplace"
              element={
                <ProtectedRoute requiredRole="broadcaster">
                  <BrowseCampaigns isMarketplace />
                </ProtectedRoute>
              }
            />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/upgrade/:role" element={<ProtectedRoute><PlanUpgrade /></ProtectedRoute>} />
            <Route path="/settings/upgrade/:role/confirmation" element={<ProtectedRoute><PlanConfirmation /></ProtectedRoute>} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/player/:deviceId" element={<PlayerPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
