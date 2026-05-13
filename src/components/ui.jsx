import { cn } from "../lib/utils";

export function Button({ className, variant = "primary", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" &&
          "bg-ink text-white shadow-[0_12px_30px_rgba(16,24,23,0.16)] hover:-translate-y-0.5 hover:bg-emerald-deep dark:bg-white dark:text-ink",
        variant === "secondary" &&
          "border border-black/10 bg-white/70 text-ink shadow-sm hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
        variant === "ghost" && "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-black/[0.08] bg-white/72 shadow-[0_24px_80px_rgba(16,24,23,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, className, children }) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="min-h-11 rounded-2xl border border-black/10 bg-white/70 px-4 text-sm text-ink outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
      {...props}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      className="min-h-28 resize-y rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500"
      {...props}
    />
  );
}

export function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200",
        className,
      )}
      {...props}
    />
  );
}
