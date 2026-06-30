import { useEffect, useRef, useState } from "react";
import {
  filterCustomersByNamePrefix,
  filterCustomersByPhonePrefix,
  formatCustomerPhone,
} from "../../lib/customerSearch";
import type { Customer } from "../../types";

interface CustomerFieldsProps {
  name: string;
  phone: string;
  customers: Customer[];
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

type ActiveField = "name" | "phone" | null;

/** Kotak field seragam: tinggi tetap, isi tengah-kiri. */
const fieldShell =
  "w-full min-h-[4.75rem] flex items-center justify-start rounded-xl px-4 bg-[#F5F5F7] focus-within:ring-2 focus-within:ring-[#001F5B] transition-all";

const fieldInner =
  "w-full bg-transparent border-0 outline-none shadow-none text-sm text-left leading-snug placeholder:text-slate-400 p-0 m-0 ring-0 focus:ring-0";

export function CustomerFields({
  name,
  phone,
  customers,
  onNameChange,
  onPhoneChange,
  onSelectCustomer,
}: CustomerFieldsProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameSuggestions =
    activeField === "name" ? filterCustomersByNamePrefix(customers, name) : [];
  const phoneSuggestions =
    activeField === "phone"
      ? filterCustomersByPhonePrefix(customers, phone)
      : [];
  const suggestions =
    activeField === "name"
      ? nameSuggestions
      : activeField === "phone"
      ? phoneSuggestions
      : [];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function focusField(field: ActiveField) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setActiveField(field);
    setOpen(true);
  }

  function scheduleBlur() {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      setActiveField(null);
    }, 150);
  }

  function pick(customer: Customer) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onSelectCustomer(customer);
    setOpen(false);
    setActiveField(null);
  }

  const showDropdown = open && activeField && suggestions.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <div className="grid grid-cols-10 gap-2 items-stretch">
        <div className="col-span-5">
          <div className={fieldShell}>
            <textarea
              value={name}
              onChange={(e) => {
                onNameChange(e.target.value);
                setActiveField("name");
                setOpen(true);
              }}
              onFocus={() => focusField("name")}
              onBlur={scheduleBlur}
              placeholder="Nama pelanggan"
              rows={1}
              className={`${fieldInner} resize-none break-words`}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="col-span-5">
          <div className={fieldShell}>
            <input
              value={phone}
              onChange={(e) => {
                onPhoneChange(e.target.value);
                setActiveField("phone");
                setOpen(true);
              }}
              onFocus={() => focusField("phone")}
              onBlur={scheduleBlur}
              placeholder="No. WhatsApp"
              inputMode="tel"
              className={fieldInner}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {showDropdown && (
        <ul
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                className="w-full min-h-[3.25rem] px-4 flex flex-col items-start justify-center text-left hover:bg-[#001F5B]/5 active:bg-[#001F5B]/10 border-b border-slate-50 last:border-0"
              >
                <span className="text-sm font-medium text-slate-800 break-words leading-snug w-full">
                  {c.name}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 tabular-nums w-full">
                  {formatCustomerPhone(c.phone)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
