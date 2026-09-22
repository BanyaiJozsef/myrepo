import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { UgyfelekPage } from "./pages/Ugyfelek";
import { JarmuvekPage } from "./pages/Jarmuvek";
import { MunkalapokPage } from "./pages/Munkalapok";
import { BeallitasokPage } from "./pages/Beallitasok";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ProtectedLayout() {
  const { bejelentkezve, betoltve } = useAuth();
  if (!betoltve) {
    return null;
  }
  if (!bejelentkezve) {
    return <Navigate to="/bejelentkezes" replace />;
  }
  return <Layout />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/bejelentkezes" element={<LoginPage />} />
          <Route path="/regisztracio" element={<RegisterPage />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/ugyfelek" replace />} />
            <Route path="/ugyfelek" element={<UgyfelekPage />} />
            <Route path="/jarmuvek" element={<JarmuvekPage />} />
            <Route path="/munkalapok" element={<MunkalapokPage />} />
            <Route path="/beallitasok" element={<BeallitasokPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/ugyfelek" replace />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
