import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import type { BusinessUser } from "../../lib/users";

interface PickupReturnWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: BusinessUser[];
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PickupReturnWorkerDialog({
  open,
  onOpenChange,
  employees,
  selectedId,
  onSelect,
  onConfirm,
  onCancel,
  loading,
}: PickupReturnWorkerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#001F5B]">Yang mengembalikan?</DialogTitle>
          <DialogDescription>
            Pilih karyawan yang menyerahkan pesanan ke pelanggan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-56 overflow-y-auto py-1">
          {employees.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Belum ada karyawan terdaftar.
            </p>
          ) : (
            employees.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => onSelect(emp.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  selectedId === emp.id
                    ? "bg-[#001F5B] text-white"
                    : "bg-[#F5F5F7] text-slate-700 hover:bg-slate-100"
                }`}
              >
                {emp.full_name}
              </button>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-slate-100 text-slate-600 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !selectedId || employees.length === 0}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-[#001F5B] text-white disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Konfirmasi
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
