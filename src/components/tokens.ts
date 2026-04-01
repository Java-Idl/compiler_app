/**
 * Design Tokens — Javagar's Compiler
 * Single source of truth for colors, spacing, and variant maps used across the UI.
 */

export const ACCENT = "#A31241";

/** Shared class tokens for consistent UI styling */
export const UI = {
  panelShell: "border border-slate-200 rounded-xl overflow-hidden bg-white shrink-0",
  panelHeader: "flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200",
  panelHeaderInteractive: "cursor-pointer hover:bg-slate-100 transition-colors select-none",
  iconSlot: "w-4 flex items-center justify-center",
  capsLabel10: "text-[10px] font-black uppercase tracking-widest",
  capsLabel9: "text-[9px] font-black uppercase tracking-widest",
  buttonPrimary: "bg-[#A31241] hover:bg-[#850E34] text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#A31241]/50",
  buttonNeutral: "bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
  buttonDangerGhost: "text-slate-300 hover:text-red-400 transition-colors outline-none focus-visible:text-red-400",
} as const;

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

