import { motion } from "motion/react";
import { X, Loader2 } from "lucide-react";

export const inputClass =
  "w-full bg-[#F5F5F7] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#001F5B] outline-none transition-all";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] p-5 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#001F5B]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </motion.div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SaveButton({
  onClick,
  saving,
  label = "Simpan",
}: {
  onClick: () => void;
  saving: boolean;
  label?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={saving}
      className="w-full bg-[#001F5B] text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
    >
      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </motion.button>
  );
}
