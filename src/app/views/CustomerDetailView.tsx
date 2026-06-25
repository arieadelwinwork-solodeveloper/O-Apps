import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Loader2, MessageCircle, Crown, ExternalLink } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  getCustomerDetail,
  formatRupiah,
  formatMemberSince,
  formatMemberDuration,
  waLink,
} from "../lib/customers";
import { MEMBERSHIP_TYPE_LABEL } from "../lib/membership";
import type { CustomerDetail } from "../lib/customers";

const WORK_LABEL: Record<string, string> = {
  antri: "Antri",
  proses: "Proses",
  selesai: "Selesai",
  diambil: "Diambil",
};

export function CustomerDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setData(await getCustomerDetail(id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat detail");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">
        {error ?? "Konsumen tidak ditemukan"}
      </div>
    );
  }

  const { customer, orders, memberships } = data;
  const wa = waLink(customer.phone, `Halo ${customer.name}`);

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="bg-white rounded-[20px] p-5 shadow-sm border border-black/[0.03]">
        <h2 className="text-lg font-semibold text-[#001F5B]">{customer.name}</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {customer.phone || "Tanpa nomor HP"}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <Stat
            label="Member sejak"
            value={formatMemberSince(customer.member_since)}
          />
          <Stat label="Lama" value={formatMemberDuration(customer.member_since)} />
          <Stat
            label="Total transaksi"
            value={String(customer.total_transaksi)}
          />
          {isOwner && customer.omset_total !== undefined && (
            <Stat
              label="Omset total"
              value={formatRupiah(customer.omset_total)}
              highlight
            />
          )}
        </div>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-medium rounded-xl py-3 text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Hubungi WhatsApp
          </a>
        )}
      </div>

      {memberships.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
            Membership
          </h3>
          <div className="space-y-2">
            {memberships.map((m) => (
              <div
                key={m.id}
                className="bg-amber-50 rounded-2xl p-3 border border-amber-100 flex items-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="text-sm text-slate-700">
                  {MEMBERSHIP_TYPE_LABEL[m.type]}
                  {m.type === "saldo"
                    ? ` · ${formatRupiah(m.balance)}`
                    : m.services
                    ? ` · ${m.quota_remaining} ${m.services.unit} (${m.services.name})`
                    : ` · ${m.quota_remaining} unit`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
          Riwayat Transaksi
        </h3>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Belum ada transaksi.
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate(`/transaksi/${o.id}`)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-black/[0.02] text-left flex justify-between items-center gap-2"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {o.order_no}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(o.created_at).toLocaleDateString("id-ID")} ·{" "}
                    {WORK_LABEL[o.work_status] ?? o.work_status}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner && o.total !== undefined && (
                    <span className="text-sm font-semibold text-[#001F5B]">
                      {formatRupiah(o.total)}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-[#F5F5F7] rounded-xl p-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`text-sm font-semibold mt-0.5 ${
          highlight ? "text-[#001F5B]" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
