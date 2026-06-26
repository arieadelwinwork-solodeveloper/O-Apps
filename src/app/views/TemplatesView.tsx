import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Loader2,
  Star,
} from "lucide-react";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type TemplateInput,
} from "../lib/customization";
import { getBusiness, updateBusinessSettings } from "../lib/printDevices";
import { Modal, Field, SaveButton, inputClass } from "../components/formui";
import type { MessageTemplate, TemplateType } from "../types";

const TYPE_LABEL: Record<TemplateType, string> = {
  nota: "Nota",
  selesai: "Pesan Selesai",
};

const VARIABLES = ["{nama}", "{layanan}", "{total}", "{estimasi}", "{sisa}"];

const emptyTemplate: TemplateInput = {
  type: "nota",
  name: "",
  body: "",
  isDefault: false,
};

export function TemplatesView() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<TemplateInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoSendComplete, setAutoSendComplete] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [tpl, biz] = await Promise.all([
        listTemplates(),
        getBusiness().catch(() => null),
      ]);
      setTemplates(tpl);
      setAutoSendComplete(biz?.auto_send_complete_note ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat template");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm({ ...emptyTemplate });
  }
  function openEdit(t: MessageTemplate) {
    setEditingId(t.id);
    setForm({
      type: t.type,
      name: t.name,
      body: t.body,
      isDefault: t.is_default,
    });
  }
  async function save() {
    if (!form || !form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateTemplate(editingId, form);
      } else {
        await createTemplate(form);
      }
      setForm(null);
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  }
  async function remove(t: MessageTemplate) {
    if (!confirm(`Hapus template "${t.name}"?`)) return;
    setError(null);
    try {
      await deleteTemplate(t.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus template");
    }
  }

  function insertVar(v: string) {
    if (!form) return;
    setForm({ ...form, body: (form.body + " " + v).trim() });
  }

  async function toggleAutoSend() {
    const next = !autoSendComplete;
    setSavingSetting(true);
    setError(null);
    try {
      const biz = await updateBusinessSettings({ autoSendCompleteNote: next });
      setAutoSendComplete(biz.auto_send_complete_note ?? next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    } finally {
      setSavingSetting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#001F5B]">Template Pesan</h2>
          <p className="text-xs text-slate-400">Nota & pesan selesai kustom</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openNew}
          className="bg-[#001F5B] text-white rounded-xl px-3 py-2 text-sm font-medium flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Template
        </motion.button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="mb-4 bg-white rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800">
              Langsung Mengirim Nota Selesai
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Setelah proses produksi selesai, buka WhatsApp otomatis dengan
              template pesan selesai.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoSendComplete}
            disabled={savingSetting}
            onClick={toggleAutoSend}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${
              autoSendComplete ? "bg-[#001F5B]" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                autoSendComplete ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-[10px] font-medium mt-2 text-slate-500">
          Status: {autoSendComplete ? "On" : "Off"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada template pesan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{t.name}</h3>
                    <span className="text-[10px] bg-[#001F5B]/10 text-[#001F5B] px-2 py-0.5 rounded-full">
                      {TYPE_LABEL[t.type]}
                    </span>
                    {t.is_default && (
                      <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(t)}
                  className="p-2 rounded-lg hover:bg-black/5 text-slate-500"
                  aria-label="Ubah template"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(t)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  aria-label="Hapus template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-500 whitespace-pre-wrap bg-[#F5F5F7] rounded-xl px-3 py-2">
                {t.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal
          title={editingId ? "Ubah Template" : "Template Baru"}
          onClose={() => setForm(null)}
        >
          <Field label="Jenis template">
            <div className="grid grid-cols-2 gap-2">
              {(["nota", "selesai"] as TemplateType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    form.type === t
                      ? "bg-[#001F5B] text-white"
                      : "bg-[#F5F5F7] text-slate-600"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nama template">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Nota Standar"
              className={inputClass}
            />
          </Field>
          <Field label="Isi pesan">
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Halo {nama}, pesanan {layanan} totalnya {total}..."
              rows={5}
              className={inputClass + " resize-none"}
            />
          </Field>
          <div>
            <p className="text-[11px] text-slate-400 mb-1.5 ml-1">
              Sisipkan variabel:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVar(v)}
                  className="text-xs bg-[#001F5B]/10 text-[#001F5B] rounded-lg px-2 py-1 font-medium"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 mt-1">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-4 h-4 accent-[#001F5B]"
            />
            Jadikan default untuk jenis ini
          </label>
          <SaveButton onClick={save} saving={saving} />
        </Modal>
      )}
    </div>
  );
}
