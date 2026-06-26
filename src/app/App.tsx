import { RouterProvider } from "react-router";
import { AuthProvider } from "./hooks/useAuth";
import { DemoModeBanner } from "./components/DemoModeBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SetupRequired } from "./components/SetupRequired";
import { isSupabaseConfigured } from "./lib/supabase";
import { router } from "./routes";

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupRequired />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <DemoModeBanner />
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
