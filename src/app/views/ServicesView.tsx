import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2, Package, ListOrdered, Loader2 } from "lucide-react";
import {
  listServices,
  createService,
  updateService,
  deleteService,
  createStage,
  updateStage,
  deleteStage,
  type ServiceInput,
  type StageInput,
} from "../lib/customization";
import { SERVICE_UNITS, formatServiceUnit, isServiceUnit } from "../lib/serviceUnits";
import { Modal, Field, SaveButton, inputClass } from "../components/formui";
import type { Service, ServiceStage, CommissionType, ServiceUnit } from "../types";

function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const emptyService: ServiceInput = { name: "", price: 0, unit: "kg", isActive: true };
const emptyStage: StageInput = {
  name: "",
  commissionType: "nominal",
  commissionValue: 0,
};

export function ServicesView() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [serviceForm, setServiceForm] = useState<ServiceInput | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [stageForm, setStageForm] = useState<StageInput | null>(null);
  const [stageServiceId, setStageServiceId] = useState<string | null>(null);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setServices(await listServices());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat layanan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---------- Service handlers ----------
  function openNewService() {
    setEditingServiceId(null);
    setServiceForm({ ...emptyService });
  }
  function openEditService(svc: Service) {
    setEditingServiceId(svc.id);
    setServiceForm({
      name: svc.name,
      price: svc.price,
      unit: isServiceUnit(svc.unit) ? svc.unit : "pcs",
      isActive: svc.is_active,
    });
  }
  async function saveService() {
    if (!serviceForm || !serviceForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingServiceId) {
        await updateService(editingServiceId, serviceForm);
      } else {
        await createService(serviceForm);
      }
      setServiceForm(null);
      setEditingServiceId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan layanan");
    } finally {
      setSaving(false);
    }
  }
  async function removeService(svc: Service) {
    if (!confirm(`Hapus layanan "${svc.name}" beserta tahapnya?`)) return;
    setError(null);
    try {
      await deleteService(svc.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus layanan");
    }
  }

  // ---------- Stage handlers ----------
  function openNewStage(serviceId: string, nextOrder: number) {
    setStageServiceId(serviceId);
    setEditingStageId(null);
    setStageForm({ ...emptyStage, sortOrder: nextOrder });
  }
  function openEditStage(serviceId: string, stage: ServiceStage) {
    setStageServiceId(serviceId);
    setEditingStageId(stage.id);
    setStageForm({
      name: stage.name,
      sortOrder: stage.sort_order,
      commissionType: stage.commission_type,
      commissionValue: stage.commission_value,
    });
  }
  async function saveStage() {
    if (!stageForm || !stageServiceId || !stageForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingStageId) {
        await updateStage(stageServiceId, editingStageId, stageForm);
      } else {
        await createStage(stageServiceId, stageForm);
      }
      setStageForm(null);
      setStageServiceId(null);
      setEditingStageId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan tahap");
    } finally {
      setSaving(false);
    }
  }
  async function removeStage(serviceId: string, stage: ServiceStage) {
    if (!confirm(`Hapus tahap "${stage.name}"?`)) return;
    setError(null);
    try {
      await deleteStage(serviceId, stage.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus tahap");
    }
  }

  function commissionLabel(s: ServiceStage): string {
    return s.commission_type === "percent"
      ? `${s.commission_value}%`
      : rupiah(s.commission_value);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#001F5B]">Jenis Layanan</h2>
          <p className="text-xs text-slate-400">Atur jasa, tahap, & komisi</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openNewService}
          className="bg-[#001F5B] text-white rounded-xl px-3 py-2 text-sm font-medium flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Jasa
        </motion.button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Belum ada layanan. Tambahkan jasa pertama.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="bg-white rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.03]"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{svc.name}</h3>
                    {!svc.is_active && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {rupiah(svc.price)}{" "}
                    <span className="text-slate-400">/ {formatServiceUnit(svc.unit)}</span>
                  </div>
                </div>
                <button
                  onClick={() => openEditService(svc)}
                  className="p-2 rounded-lg hover:bg-black/5 text-slate-500"
                  aria-label="Ubah layanan"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeService(svc)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  aria-label="Hapus layanan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 border-t border-dashed border-black/[0.06] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <ListOrdered className="w-3.5 h-3.5" /> Tahap & Komisi
                  </span>
                  <button
                    onClick={() => openNewStage(svc.id, svc.stages.length)}
                    className="text-xs text-[#001F5B] font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tahap
                  </button>
                </div>
                {svc.stages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada tahap.</p>
                ) : (
                  <div className="space-y-1.5">
                    {svc.stages.map((stage, i) => (
                      <div
                        key={stage.id}
                        className="flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#001F5B]/10 text-[#001F5B] text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700 flex-1">
                          {stage.name}
                        </span>
                        <span className="text-xs font-medium text-emerald-600">
                          {commissionLabel(stage)}
                        </span>
                        <button
                          onClick={() => openEditStage(svc.id, stage)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          aria-label="Ubah tahap"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeStage(svc.id, stage)}
                          className="p-1 text-slate-400 hover:text-red-500"
                          aria-label="Hapus tahap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Service modal ---------- */}
      {serviceForm && (
        <Modal
          title={editingServiceId ? "Ubah Layanan" : "Layanan Baru"}
          onClose={() => setServiceForm(null)}
        >
          <Field label="Nama layanan">
            <input
              autoFocus
              value={serviceForm.name}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, name: e.target.value })
              }
              placeholder="Contoh: Cuci Reguler"
              className={inputClass}
            />
          </Field>
          <Field label="Harga (Rp)">
            <input
              type="number"
              value={serviceForm.price || ""}
              onChange={(e) =>
                setServiceForm({
                  ...serviceForm,
                  price: Number(e.target.value) || 0,
                })
              }
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <Field label="Satuan">
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_UNITS.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() =>
                    setServiceForm({
                      ...serviceForm,
                      unit: u.value as ServiceUnit,
                    })
                  }
                  className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    serviceForm.unit === u.value
                      ? "bg-[#001F5B] text-white"
                      : "bg-[#F5F5F7] text-slate-600"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600 mt-1">
            <input
              type="checkbox"
              checked={serviceForm.isActive ?? true}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, isActive: e.target.checked })
              }
              className="w-4 h-4 accent-[#001F5B]"
            />
            Aktif (tampil di kasir)
          </label>
          <SaveButton onClick={saveService} saving={saving} />
        </Modal>
      )}

      {/* ---------- Stage modal ---------- */}
      {stageForm && (
        <Modal
          title={editingStageId ? "Ubah Tahap" : "Tahap Baru"}
          onClose={() => setStageForm(null)}
        >
          <Field label="Nama tahap">
            <input
              autoFocus
              value={stageForm.name}
              onChange={(e) =>
                setStageForm({ ...stageForm, name: e.target.value })
              }
              placeholder="Contoh: Cuci, Setrika, Packing"
              className={inputClass}
            />
          </Field>
          <Field label="Tipe komisi">
            <div className="grid grid-cols-2 gap-2">
              {(["nominal", "percent"] as CommissionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setStageForm({ ...stageForm, commissionType: t })
                  }
                  className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    stageForm.commissionType === t
                      ? "bg-[#001F5B] text-white"
                      : "bg-[#F5F5F7] text-slate-600"
                  }`}
                >
                  {t === "nominal" ? "Nominal (Rp)" : "Persen (%)"}
                </button>
              ))}
            </div>
          </Field>
          <Field
            label={
              stageForm.commissionType === "percent"
                ? "Nilai komisi (%)"
                : "Nilai komisi (Rp)"
            }
          >
            <input
              type="number"
              value={stageForm.commissionValue || ""}
              onChange={(e) =>
                setStageForm({
                  ...stageForm,
                  commissionValue: Number(e.target.value) || 0,
                })
              }
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <SaveButton onClick={saveStage} saving={saving} />
        </Modal>
      )}
    </div>
  );
}
