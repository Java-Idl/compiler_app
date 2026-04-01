/**
 * Design Tokens — Javagar's Compiler
 * Single source of truth for colors, spacing, and variant maps used across the UI.
 */

export const ACCENT = "#A31241";

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
  { id: "lexical",   icon: "L", label: "Lexical",    sublabel: "Tokens",    badge: "amber"   },
  { id: "syntax",    icon: "S", label: "Syntax AST", sublabel: "Graph",     badge: "indigo"  },
  { id: "semantic",  icon: "M", label: "Semantic",   sublabel: "Symbols",   badge: "amber"   },
  { id: "tac",       icon: "T", label: "TAC",        sublabel: "IR",        badge: "slate"   },
  { id: "optimized", icon: "O", label: "Optimized",  sublabel: "Folded",    badge: "emerald" },
  { id: "machine",   icon: "G", label: "Code Gen",   sublabel: "16-bit",    badge: "violet"  },
  { id: "cpu",       icon: "C", label: "CPU Sim",    sublabel: "Simulator", badge: "crimson" },
] as const;

