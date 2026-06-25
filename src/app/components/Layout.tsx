import { Outlet, useLocation, useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-slate-900 selection:bg-[#001F5B] selection:text-white flex justify-center">
      <div className="w-full max-w-md bg-[#F5F5F7] min-h-screen shadow-2xl relative flex flex-col overflow-hidden">
        {!isHome && (
          <header className="px-4 py-4 flex items-center gap-3 bg-white border-b border-black/5 z-10 sticky top-0">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-[#001F5B]" />
            </button>
            <h1 className="font-semibold text-lg text-[#001F5B] capitalize">
              {location.pathname.replace('/', '')}
            </h1>
          </header>
        )}
        <main className="flex-1 overflow-y-auto pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
