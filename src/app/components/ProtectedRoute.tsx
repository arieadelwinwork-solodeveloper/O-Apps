import { Navigate, Outlet } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#001F5B]" />
    </div>
  );
}

/** Wajib login. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Wajib login + role tertentu (mis. owner). */
export function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
