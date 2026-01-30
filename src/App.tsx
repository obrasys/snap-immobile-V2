import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/app/RequireAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import OAuthCallback from "./pages/auth/OAuthCallback"; // Importar o componente OAuthCallback
import Properties from "./pages/app/Properties";
import Settings from "./pages/app/Settings";
import PropertyDetail from "./pages/app/PropertyDetail";
import Plan from "./pages/app/Plan";
import Account from "./pages/app/Account";
import CameraCapture from "./pages/app/CameraCapture";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />

            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<OAuthCallback />} /> {/* Adicionar esta rota */}

            <Route
              path="/app/properties"
              element={
                <RequireAuth>
                  <Properties />
                </RequireAuth>
              }
            />
            <Route
              path="/app/properties/new"
              element={
                <RequireAuth>
                  <Properties openCreateOnMount />
                </RequireAuth>
              }
            />
            <Route
              path="/app/properties/:id"
              element={
                <RequireAuth>
                  <PropertyDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/app/properties/:id/camera"
              element={
                <RequireAuth>
                  <CameraCapture />
                </RequireAuth>
              }
            />
            <Route
              path="/app/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
            <Route
              path="/app/plan"
              element={
                <RequireAuth>
                  <Plan />
                </RequireAuth>
              }
            />
            <Route
              path="/app/account"
              element={
                <RequireAuth>
                  <Account />
                </RequireAuth>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;