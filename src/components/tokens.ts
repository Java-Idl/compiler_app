/**
 * Design Tokens — Javagar's Compiler
 * Single source of truth for colors, spacing, and variant maps used across the UI.
 */

export const ACCENT = "#A31241";
export const ACCENT_HOVER = "#850E34";

/** Badge color presets keyed by semantic intent */
export const BADGE_COLORS: Record<string, string> = {
  slate:   "bg-slate-100 text-slate-500",
  amber:   "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  indigo:  "bg-indigo-50 text-indigo-600",
  violet:  "bg-violet-50 text-violet-600",
  crimson: "bg-red-50 text-[#A31241]",
  red:     "bg-red-50 text-red-600",
};

/** Phase navigator sidebar config */
export const PHASES = [
  { id: "lexical",   icon: "①", label: "Lexical",    sublabel: "Tokens",    badge: "amber"   },
  { id: "syntax",    icon: "②", label: "Syntax AST", sublabel: "Graph",     badge: "indigo"  },
  { id: "semantic",  icon: "③", label: "Semantic",   sublabel: "Symbols",   badge: "amber"   },
  { id: "tac",       icon: "④", label: "TAC",        sublabel: "IR",        badge: "slate"   },
  { id: "optimized", icon: "⑤", label: "Optimized",  sublabel: "Folded",    badge: "emerald" },
  { id: "machine",   icon: "⑥", label: "Code Gen",   sublabel: "16-bit",    badge: "violet"  },
  { id: "cpu",       icon: "⚙", label: "CPU Sim",    sublabel: "Simulator", badge: "crimson" },
] as const;

export type PhaseId = typeof PHASES[number]["id"];

/** Framer Motion stagger animation presets */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.04 } }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0   }
};
