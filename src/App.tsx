import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DocumentViewer from "./pages/DocumentViewer";
import Search from "./pages/Search";
import Flashcards from "./pages/Flashcards";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={
            <Layout>
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<DocumentViewer />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/flashcards" element={<Flashcards />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ProtectedRoute>
            </Layout>
          } />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
