import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import Sobre from "./pages/Sobre";
import Dashboard from "./pages/Dashboard";
import Loja from "./pages/Loja";
import ProductDetail from "./pages/ProductDetail";
import PontosColeta from "./pages/PontosColeta";
import Extrato from "./pages/Extrato";
import Admin from "./pages/Admin";
import MinhaLoja from "./pages/MinhaLoja";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/loja" element={<Loja />} />
              <Route path="/loja/:id" element={<ProductDetail />} />
              <Route path="/pontos" element={<PontosColeta />} />
              <Route path="/extrato" element={<Extrato />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/minha-loja" element={<MinhaLoja />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
