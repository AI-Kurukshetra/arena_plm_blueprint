type StatusTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneClasses: Record<StatusTone, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  info: "bg-sky-100 text-sky-800",
};

export function StatusBadge({
  label,
  tone = "default",
}: Readonly<{
  label: string;
  tone?: StatusTone;
}>) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
