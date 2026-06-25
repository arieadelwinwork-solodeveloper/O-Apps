import { RouterProvider } from "react-router";
import { AuthProvider } from "./hooks/useAuth";
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
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
