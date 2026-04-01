import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { ASTGraphNode } from "./components/ASTGraphNode";
import { PHASES, BADGE_COLORS } from "./components/tokens";
import presetsData from "./presets.json";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Preset { name: string; code: string; }

interface TokenClassSummary {
  count: number;
  items: string[];
}

interface LexicalSummary {
  keywords: TokenClassSummary;
  identifiers: TokenClassSummary;
  numbers: TokenClassSummary;
  operators: TokenClassSummary;
  symbols: TokenClassSummary;
}

interface PipelineResult {
  tokens: string[];
  lexical_summary: LexicalSummary;
  ast: any[];
  semantic: string[];
  tac: Array<{ result: string; arg1: string; op?: string; arg2?: string }>;
  optimized_tac: Array<{ result: string; arg1: string; op?: string; arg2?: string }>;
  machine_code: Array<{ opcode: string; instruction: string; binary: string; cpu_state: CpuState }>;
  assignments: Record<string, number>;
  error?: string | null;
}

interface CpuState {
  pc: number;
  registers: [number, number, number, number];
  memory: Record<string, number>;
}

// ─── Chevron Icon ─────────────────────────────────────────────────────────────
const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`w-3 h-3 text-slate-300 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    fill="currentColor" viewBox="0 0 8 8"
  >
    <path d="M2 1l4 3-4 3V1z" />
  </svg>
);

// ─── JL Language Reference Panel ─────────────────────────────────────────────
function LangRef({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const OVERVIEW = [
    "Every statement must end with ';'.",
    "Use 'let' for declaration and '=' for reassignment.",
    "Single-line comments start with '//'.",
    "Only i32 integer arithmetic is supported.",
  ];

  const KEYWORDS = [
    { kw: "let x = expr;",    desc: "Declare and assign a variable" },
    { kw: "x = expr;",        desc: "Reassign existing variable" },
    { kw: "print expr;",      desc: "Output value to stdout" },
    { kw: "neg x",            desc: "Unary negation (−x)" },
    { kw: "abs(expr)",        desc: "Absolute value built-in" },
    { kw: "sq(expr)",         desc: "Square  x² built-in" },
    { kw: "a mod b",          desc: "Modulo remainder" },
    { kw: "(expr)",           desc: "Parenthesised sub-expression" },
    { kw: "// comment",       desc: "Single-line comment" },
  ];
  const OPCODES = [
    { bin: "0000", mn: "MOV",   ex: "MOV R3, #42" },
    { bin: "0001", mn: "ADD",   ex: "ADD R3, R1, R2" },
    { bin: "0010", mn: "SUB",   ex: "SUB R3, R1, R2" },
    { bin: "0011", mn: "MUL",   ex: "MUL R3, R1, R2" },
    { bin: "0100", mn: "DIV",   ex: "DIV R3, R1, R2" },
    { bin: "0101", mn: "MOD",   ex: "MOD R3, R1, R2" },
    { bin: "0110", mn: "ABS",   ex: "ABS R3, R1" },
    { bin: "0111", mn: "SQ",    ex: "SQ  R3, R1" },
    { bin: "1000", mn: "NEG",   ex: "NEG R3, R1" },
    { bin: "1001", mn: "OUT",   ex: "OUT stdout, R1" },
    { bin: "1010", mn: "STORE", ex: "STORE [dst], R1" },
  ];
  const NODES = [
    { color: "bg-indigo-100 text-indigo-700", label: "Program" },
    { color: "bg-slate-100 text-slate-700",   label: "= (assign)" },
    { color: "bg-violet-100 text-violet-700", label: "let" },
    { color: "bg-sky-100 text-sky-700",       label: "print" },
    { color: "bg-red-100 text-[#A31241]",     label: "op +−×÷%" },
    { color: "bg-orange-100 text-orange-700", label: "neg" },
    { color: "bg-teal-100 text-teal-700",     label: "abs() sq()" },
    { color: "bg-amber-100 text-amber-800",   label: "variable" },
    { color: "bg-emerald-100 text-emerald-800", label: "number" },
  ];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shrink-0">
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
        onClick={onToggle}
        role="button" aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="text-[#A31241] font-black text-[10px] w-4 text-center">ℹ</span>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">JL Language Reference</span>
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">Javagar Language</span>
        </div>
        <Chevron open={open} />
      </div>

      {open && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-[11px]">
          {/* Language at a glance */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Language at a Glance</p>
            <ul className="space-y-2">
              {OVERVIEW.map(item => (
                <li key={item} className="text-[10px] text-slate-500 leading-snug flex gap-2">
                  <span className="text-[#A31241] font-black">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Keywords */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Syntax</p>
            <div className="flex flex-col gap-1.5">
              {KEYWORDS.map(k => (
                <div key={k.kw} className="flex items-start gap-2">
                  <code className="font-mono font-bold text-[10px] text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">{k.kw}</code>
                  <span className="text-slate-400 text-[10px] leading-tight mt-0.5">{k.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ISA */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">16-bit ISA (Opcode Map)</p>
            <table className="w-full">
              <thead>
                <tr className="text-[9px] text-slate-400 uppercase tracking-widest">
                  <th className="text-left pb-1.5 font-black">Bits</th>
                  <th className="text-left pb-1.5 font-black">Mnemonic</th>
                  <th className="text-left pb-1.5 font-black">Example</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-slate-50">
                {OPCODES.map(o => (
                  <tr key={o.mn} className="hover:bg-slate-50">
                    <td className="py-1 text-[10px] text-slate-400 pr-3">{o.bin}</td>
                    <td className="py-1 text-[10px] font-black text-slate-700 pr-3">{o.mn}</td>
                    <td className="py-1 text-[10px] text-slate-400">{o.ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AST node legend */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">AST Node Colors</p>
            <div className="flex flex-col gap-1.5">
              {NODES.map(n => (
                <div key={n.label} className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${n.color}`}>{n.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Editable Preset Manager ──────────────────────────────────────────────────
function PresetManager({
  presets, onClose, onLoad, onSave
}: {
  presets: Preset[];
  onClose: () => void;
  onLoad: (code: string) => void;
  onSave: (presets: Preset[]) => void;
}) {
  const [local, setLocal] = useState<Preset[]>(JSON.parse(JSON.stringify(presets)));
  const [selected, setSelected] = useState(0);
  const [newName, setNewName] = useState("");

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function updateCode(val: string) {
    const copy = [...local];
    copy[selected] = { ...copy[selected], code: val };
    setLocal(copy);
  }
  function updateName(val: string) {
    const copy = [...local];
    copy[selected] = { ...copy[selected], name: val };
    setLocal(copy);
  }
  function addPreset() {
    if (!newName.trim()) return;
    setLocal([...local, { name: newName.trim(), code: "" }]);
    setSelected(local.length);
    setNewName("");
  }
  function removePreset(i: number) {
    const copy = local.filter((_, idx) => idx !== i);
    setLocal(copy);
    setSelected(Math.max(0, i - 1));
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[600px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Test Case Presets</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Edit, add, or remove presets. Changes apply this session.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { onSave(local); onClose(); }}
              className="text-[10px] font-black uppercase tracking-widest bg-[#A31241] text-white px-4 py-2 rounded-md hover:bg-[#850E34] transition-colors focus-visible:ring-2 focus-visible:ring-[#A31241]/50 outline-none"
            >
              Save &amp; Close
            </button>
            <button
              onClick={onClose}
              className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-4 py-2 rounded-md hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
            >
              Discard
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Preset list */}
          <div className="w-52 border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {local.map((p, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer group transition-colors ${selected === i ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  onClick={() => setSelected(i)}
                >
                  <span className="text-[11px] font-semibold text-slate-700 truncate flex-1">{p.name || "(untitled)"}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removePreset(i); }}
                    className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs font-black ml-1 outline-none focus-visible:opacity-100 focus-visible:text-red-400"
                    aria-label={`Remove "${p.name}"`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-200 flex gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPreset()}
                placeholder="New preset…"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#A31241] focus:ring-1 focus:ring-[#A31241]/30 transition-colors"
              />
              <button
                onClick={addPreset}
                className="text-[11px] font-black bg-slate-200 hover:bg-slate-300 px-2.5 py-1.5 rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                +
              </button>
            </div>
          </div>

          {/* Preset editor */}
          {local.length > 0 && local[selected] ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex gap-3 items-center">
                <input
                  value={local[selected].name}
                  onChange={e => updateName(e.target.value)}
                  className="flex-1 text-sm font-bold text-slate-900 outline-none border-b border-transparent focus:border-[#A31241] bg-transparent py-0.5 transition-colors"
                  aria-label="Preset name"
                />
                <button
                  onClick={() => onLoad(local[selected].code)}
                  className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Load →
                </button>
              </div>
              <textarea
                className="flex-1 bg-white font-mono text-[12px] text-slate-800 p-4 outline-none resize-none custom-scrollbar leading-[1.7rem] focus:ring-1 focus:ring-inset focus:ring-[#A31241]/20"
                value={local[selected].code}
                onChange={e => updateCode(e.target.value)}
                spellCheck={false}
                aria-label="Preset source code"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">
              No preset selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Phase Panel ──────────────────────────────────────────────────────────────
function PhasePanel({
  phase, collapsed, result, isCompiling, pc, onToggleCollapse, onHide, onMachineRowClick, cpuState, onStepCPU, onResetCPU
}: {
  phase: typeof PHASES[number];
  collapsed: boolean;
  result: PipelineResult | null;
  isCompiling: boolean;
  pc: number;
  onToggleCollapse: () => void;
  onHide: () => void;
  onMachineRowClick: (i: number) => void;
  cpuState: CpuState | null;
  onStepCPU: () => void;
  onResetCPU: () => void;
}) {
  const id = phase.id;
  const badgeText = id === "lexical" && result ? `${result.tokens.length} tokens` : phase.sublabel;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shrink-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none"
        onClick={onToggleCollapse}
        role="button"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <span className="text-[#A31241] font-black text-[10px] w-4 text-center">{phase.icon}</span>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{phase.label}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${BADGE_COLORS[phase.badge] ?? BADGE_COLORS.slate}`}>
            {badgeText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onHide(); }}
            className="text-slate-300 hover:text-slate-500 transition-colors text-xs leading-none font-bold px-1 outline-none focus-visible:text-slate-500 focus-visible:ring-1 focus-visible:ring-slate-300 rounded"
            title={`Hide ${phase.label} panel`}
            aria-label={`Hide ${phase.label} panel`}
          >
            ✕
          </button>
          <Chevron open={!collapsed} />
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <>
          {/* No result yet */}
          {!result && !isCompiling && (
            <div className="flex items-center justify-center py-7">
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Run pipeline to see output</p>
            </div>
          )}
          {isCompiling && (
            <div className="flex items-center justify-center gap-2 py-7">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-[#A31241] rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Processing…</span>
            </div>
          )}
          {result && !isCompiling && (
            <div>
              {/* ① Lexical */}
              {id === "lexical" && (
                <div className="p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                    {[
                      { label: "Keywords", bucket: result.lexical_summary.keywords },
                      { label: "Identifiers", bucket: result.lexical_summary.identifiers },
                      { label: "Numbers", bucket: result.lexical_summary.numbers },
                      { label: "Operators", bucket: result.lexical_summary.operators },
                      { label: "Symbols", bucket: result.lexical_summary.symbols },
                    ].map(({ label, bucket }) => (
                      <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{label}</p>
                        <p className="text-[16px] leading-none mt-1 text-slate-800 font-black">{bucket.count}</p>
                        <p className="font-mono text-[10px] text-slate-500 mt-1.5 truncate">
                          {bucket.items.length > 0 ? bucket.items.join(", ") : "-"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Token Stream</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {result.tokens.map((tok, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors">
                          <span className="text-[9px] text-slate-400 font-bold block tracking-widest uppercase">T{i}</span>
                          <span className="font-mono text-[11px] text-slate-700 font-semibold truncate block mt-0.5">{tok}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ② Syntax AST */}
              {id === "syntax" && (
                <div className="p-6 overflow-x-auto custom-scrollbar">
                  <div className="css-tree flex justify-center pb-4 min-w-max">
                    <ul>
                      {result.ast.map((node, i) => (
                        <ASTGraphNode key={i} node={node} />
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* ③ Semantic */}
              {id === "semantic" && (
                <div className="divide-y divide-slate-100">
                  {result.semantic.map((log, i) => (
                    <div key={i} className="flex gap-4 items-center px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <span className="text-[#A31241] font-black text-[9px] tracking-widest w-5 text-center shrink-0">{i + 1}</span>
                      <span className="font-mono text-[11px] text-slate-600">{log}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ④ TAC + ⑤ Optimized */}
              {(id === "tac" || id === "optimized") && (
                <div className="divide-y divide-slate-100">
                  {(id === "tac" ? result.tac : result.optimized_tac).map((t, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-2.5 font-mono hover:bg-slate-50 transition-colors">
                      <span className="text-slate-300 text-[10px] font-bold w-6">{i.toString().padStart(2, "0")}</span>
                      <span className="text-emerald-600 font-bold text-[11px]">{t.result}</span>
                      <span className="text-slate-400 text-[11px]">=</span>
                      <span className="text-slate-700 text-[11px]">{t.arg1}</span>
                      {t.op && <span className={`font-black text-[11px] ${id === "tac" ? "text-[#A31241]" : "text-slate-400"}`}>{t.op}</span>}
                      {t.arg2 && <span className="text-slate-700 text-[11px]">{t.arg2}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* ⑥ Machine Code */}
              {id === "machine" && (
                <div className="p-4 flex flex-col gap-4">
                  {/* Compiler Assignments Table */}
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Compiler Symbol Table</p>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-0">
                        <div className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200">
                          Variable
                        </div>
                        <div className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Assigned Value
                        </div>
                      </div>
                      {Object.entries(result.assignments).length > 0 ? (
                        Object.entries(result.assignments).map(([name, value]) => (
                          <div key={name} className="grid grid-cols-2 gap-0 border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="px-4 py-2 text-[11px] font-mono font-bold text-amber-700 border-r border-slate-100">
                              {name}
                            </div>
                            <div className="px-4 py-2 text-[11px] font-mono text-slate-600">
                              {value} &nbsp;<span className="text-slate-400">(0x{value.toString(16).padStart(2, "0").toUpperCase()})</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-[11px] text-slate-400 text-center border-t border-slate-100">
                          —
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Machine Code Instructions */}
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">Machine Code Instructions</p>
                    <div className="divide-y divide-slate-100">
                      {result.machine_code.map((m, i) => (
                        <div
                          key={i}
                          onClick={() => onMachineRowClick(i)}
                          className={`flex items-center gap-5 px-4 py-2.5 font-mono cursor-pointer transition-all border-l-2 ${
                            pc === i ? "bg-red-50 border-[#A31241]" : "hover:bg-slate-50 border-transparent"
                          }`}
                        >
                          <span className={`text-[10px] font-black w-10 ${pc === i ? "text-[#A31241]" : "text-slate-300"}`}>
                            0x{i.toString(16).padStart(2, "0").toUpperCase()}
                          </span>
                          <span className={`font-black text-[11px] w-12 ${pc === i ? "text-slate-900" : "text-slate-500"}`}>{m.opcode}</span>
                          <span className="text-slate-400 text-[11px] flex-1 truncate">{m.instruction.replace(m.opcode, "").trim()}</span>
                          <span className={`text-[10px] tracking-widest font-mono ${pc === i ? "text-[#A31241]" : "text-slate-300"}`}>{m.binary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ⚙ CPU Simulator */}
              {id === "cpu" && (
                <div className="p-5 flex flex-col gap-5">
                  {/* PC + controls */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Program Counter</p>
                      <p className="font-mono text-3xl font-black text-slate-900 tracking-tighter">
                        {(pc * 4).toString(16).padStart(4, "0").toUpperCase()}
                        <span className="text-slate-300 text-base ml-1">h</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={onResetCPU}
                        className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-slate-200 px-3 py-2 rounded-md border border-slate-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      >
                        Reset
                      </button>
                      {pc >= result.machine_code.length ? (
                        <div className="px-4 py-2 bg-red-50 text-[#A31241] text-[10px] font-black uppercase tracking-widest rounded-md border border-red-200">
                          Halted
                        </div>
                      ) : (
                        <button
                          onClick={onStepCPU}
                          className="px-4 py-2 bg-[#A31241] hover:bg-[#850E34] active:scale-95 text-white text-[10px] font-black uppercase tracking-widest rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#A31241]/50"
                        >
                          Step →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registers */}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Registers</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["R1", "R2", "R3", "R4"] as const).map((r, idx) => {
                        const val = cpuState?.registers[idx] ?? 0;
                        const active = val !== 0;
                        return (
                          <div key={r} className={`flex justify-between items-center px-3 py-2.5 rounded-lg border font-mono ${active ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                            <span className={`text-xs font-black ${active ? "text-[#A31241]" : "text-slate-400"}`}>{r}</span>
                            <span className={`text-[11px] font-black tracking-widest ${active ? "text-slate-900" : "text-slate-300"}`}>
                              0x{val.toString(16).padStart(8, "0").toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Memory */}
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Memory</p>
                    {cpuState && Object.keys(cpuState.memory).length > 0 ? (
                      <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                        {Object.entries(cpuState.memory).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center px-4 py-2 font-mono text-[11px] hover:bg-slate-50 transition-colors">
                            <span className="text-amber-600 font-bold">{k}</span>
                            <span className="text-slate-600 font-bold tracking-widest">0x{v.toString(16).padStart(8, "0").toUpperCase()}</span>
                            <span className="text-slate-400">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-300 font-mono">uninitialized — step through instructions first</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [code, setCode] = useState(presetsData[0]?.code ?? "");
  const [presets, setPresets] = useState<Preset[]>(presetsData);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [pc, setPc] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);

  const [visiblePhases, setVisiblePhases] = useState<Set<string>>(
    new Set(PHASES.map(p => p.id))
  );
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [langRefOpen, setLangRefOpen] = useState(true);

  function toggleVisible(id: string) {
    setVisiblePhases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleCollapsed(id: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function compile() {
    setIsCompiling(true);
    setResult(null);
    setCompileError(null);
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await invoke<PipelineResult>("compile_pipeline", { code });
      setResult(res);
      setCompileError(res.error ?? null);
      setPc(0);
    } catch (e: unknown) {
      setCompileError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsCompiling(false);
    }
  }

  const cpuState = result && pc > 0 ? result.machine_code[pc - 1]?.cpu_state ?? null : null;

  const visibleList = PHASES.filter(p => visiblePhases.has(p.id));

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 text-slate-900 font-sans overflow-hidden">

      {/* ── TOP TOOLBAR ──────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <img src="/banner.png" alt="Amrita University logo" className="h-7 object-contain" />
          <div className="h-5 w-px bg-slate-200" />
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">Javagar's Compiler</h1>
            <p className="text-[9px] text-[#A31241] font-bold uppercase tracking-[0.15em] mt-0.5">ATCD Lab · Amrita</p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        <select
          className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md outline-none cursor-pointer hover:bg-slate-200 transition-colors uppercase tracking-widest focus:ring-2 focus:ring-[#A31241]/30"
          onChange={e => {
            const p = presets.find(x => x.name === e.target.value);
            if (p) { setCode(p.code); setResult(null); setCompileError(null); }
          }}
          defaultValue=""
          aria-label="Load preset program"
        >
          <option value="" disabled>Load Preset…</option>
          {presets.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
        </select>

        <button
          onClick={() => setShowPresetManager(true)}
          className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          Edit Presets
        </button>

        <div className="flex-1" />

        {/* Status indicators */}
        {isCompiling && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-widest">
            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            Compiling
          </div>
        )}
        {compileError && !isCompiling && (
          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-md border border-red-200" role="status">Error</span>
        )}
        {result && !isCompiling && (
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200" role="status">OK</span>
        )}

        <button
          onClick={compile}
          disabled={isCompiling}
          className="flex items-center gap-2 bg-[#A31241] hover:bg-[#850E34] active:scale-[0.97] text-white font-black py-2 px-5 rounded-md text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#A31241]/50"
          aria-label={isCompiling ? "Compiling…" : "Run compiler pipeline"}
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <polygon points="2,1 11,6 2,11" />
          </svg>
          {isCompiling ? "Running…" : "Run Pipeline"}
        </button>
      </header>

      {/* ── MAIN WORKSPACE ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─ LEFT: Source Editor ─ */}
        <div className="flex flex-col w-[260px] min-w-[180px] border-r border-slate-200 bg-white shrink-0">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source Code</span>
          </div>
          <div className="flex flex-1 overflow-hidden font-mono">
            <div className="bg-slate-50 text-slate-300 border-r border-slate-100 py-3 px-2 text-right select-none flex flex-col text-[11px] leading-[1.65rem] min-w-[2.5rem]" aria-hidden="true">
              {code.split("\n").map((_, i) => <span key={i}>{i + 1}</span>)}
            </div>
            <textarea
              className="flex-1 bg-white text-slate-800 p-3 outline-none resize-none custom-scrollbar text-[12px] leading-[1.65rem] focus:ring-1 focus:ring-inset focus:ring-[#A31241]/25 transition-shadow"
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              aria-label="Source code editor"
            />
          </div>
        </div>

        {/* ─ SIDEBAR: Phase Toggle Navigator ─ */}
        <nav className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-1.5 shrink-0" aria-label="Phase panels">
          {PHASES.map(p => {
            const visible = visiblePhases.has(p.id);
            return (
              <button
                key={p.id}
                title={`${visible ? "Hide" : "Show"} ${p.label}`}
                aria-label={`${visible ? "Hide" : "Show"} ${p.label}`}
                aria-pressed={visible}
                onClick={() => toggleVisible(p.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                  visible
                    ? "bg-[#A31241] text-white shadow-sm shadow-[#A31241]/20 focus-visible:ring-[#A31241]/50"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 focus-visible:ring-slate-300"
                }`}
              >
                {p.icon}
              </button>
            );
          })}
        </nav>

        {/* ─ CENTER: Phase Panels Canvas ─ */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          <LangRef open={langRefOpen} onToggle={() => setLangRefOpen(v => !v)} />

          {/* Compile error banner */}
          {compileError && (
            <div className="border-l-4 border-red-400 bg-red-50 px-5 py-4 rounded-r-xl border border-red-200" role="alert">
              <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-2">Compilation Error</p>
              <pre className="font-mono text-sm text-red-700 whitespace-pre-wrap leading-relaxed">{compileError}</pre>
            </div>
          )}

          {/* Ambient empty state — only when nothing has run yet */}
          {!result && !compileError && !isCompiling && visibleList.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl text-slate-200 mb-3 select-none" aria-hidden="true">⟁</div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Pipeline ready</p>
              <p className="text-[11px] text-slate-300 mt-1.5">Write code in the editor, then click <strong className="font-black">Run Pipeline</strong>.</p>
            </div>
          )}

          {/* Phase panel stack */}
          <AnimatePresence initial={false}>
            {visibleList.map(p => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <PhasePanel
                  phase={p}
                  collapsed={collapsedPhases.has(p.id)}
                  result={result}
                  isCompiling={isCompiling}
                  pc={pc}
                  onToggleCollapse={() => toggleCollapsed(p.id)}
                  onHide={() => toggleVisible(p.id)}
                  onMachineRowClick={i => {
                    setPc(i);
                    if (collapsedPhases.has("cpu")) toggleCollapsed("cpu");
                    if (!visiblePhases.has("cpu")) toggleVisible("cpu");
                  }}
                  cpuState={cpuState}
                  onStepCPU={() => { if (result && pc < result.machine_code.length) setPc(p => p + 1); }}
                  onResetCPU={() => setPc(0)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* All panels hidden */}
          {visibleList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">No panels visible</p>
              <p className="text-slate-300 text-[11px] mt-2">Use the sidebar icons to show phases.</p>
            </div>
          )}
        </main>
      </div>

      {/* ── PRESET MANAGER ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPresetManager && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PresetManager
              presets={presets}
              onClose={() => setShowPresetManager(false)}
              onLoad={c => { setCode(c); setResult(null); setCompileError(null); setShowPresetManager(false); }}
              onSave={p => setPresets(p)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
