import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageUp, X } from "lucide-react";

interface PaymentProofFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function PaymentProofField({ file, onChange }: PaymentProofFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(selected: File | undefined) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) return;
    onChange(selected);
  }

  function clear() {
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-500 ml-1">
        Bukti Transfer <span className="text-red-500">*</span>
      </label>

      {file && previewUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img
              src={previewUrl}
              alt="Pratinjau bukti transfer"
              className="w-full max-h-48 object-contain"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white"
              aria-label="Hapus bukti"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 rounded-xl px-3 py-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="flex-1 truncate">{file.name}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#F5F5F7] text-slate-600 py-4 text-xs font-medium transition-colors hover:bg-slate-100"
          >
            <ImageUp className="size-5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-[#F5F5F7] text-slate-600 py-4 text-xs font-medium transition-colors hover:bg-slate-100"
          >
            <Camera className="size-5" />
            Ambil Foto
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
