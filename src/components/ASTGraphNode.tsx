export const ASTGraphNode = ({ node }: { node: any }) => {
  if (typeof node !== "object" || node === null) return null;

  let label   = "?";
  let children: any[] = [];
  let border  = "border-slate-200";
  let bg      = "bg-white";
  let text    = "text-slate-500";

  // ── Node type dispatch ────────────────────────────────────────────────────
  if (node.Program) {
    label    = "Program";
    children = node.Program.statements;
    border   = "border-indigo-200"; bg = "bg-indigo-50"; text = "text-indigo-700";

  } else if (node.Assignment) {
    label    = "=";
    children = [node.Assignment.target, node.Assignment.expr];
    border   = "border-slate-300"; bg = "bg-slate-50"; text = "text-slate-700";

  } else if (node.Let) {
    label    = "let";
    children = [node.Let.target, node.Let.expr];
    border   = "border-violet-200"; bg = "bg-violet-50"; text = "text-violet-700";

  } else if (node.Print) {
    label    = "print";
    children = [node.Print.expr];
    border   = "border-sky-200"; bg = "bg-sky-50"; text = "text-sky-700";

  } else if (node.BinaryOp) {
    label    = node.BinaryOp.op;
    children = [node.BinaryOp.left, node.BinaryOp.right];
    border   = "border-red-200"; bg = "bg-red-50"; text = "text-[#A31241]";

  } else if (node.UnaryOp) {
    label    = node.UnaryOp.op;
    children = [node.UnaryOp.expr];
    border   = "border-orange-200"; bg = "bg-orange-50"; text = "text-orange-700";

  } else if (node.BuiltIn) {
    label    = `${node.BuiltIn.func}()`;
    children = [node.BuiltIn.arg];
    border   = "border-teal-200"; bg = "bg-teal-50"; text = "text-teal-700";

  } else if (node.Variable) {
    label  = node.Variable;
    border = "border-amber-200"; bg = "bg-amber-50"; text = "text-amber-800";

  } else if (node.Number !== undefined) {
    label  = node.Number.toString();
    border = "border-emerald-200"; bg = "bg-emerald-50"; text = "text-emerald-800";
  }

  return (
    <li className="relative group">
      <div className={`node-content inline-flex items-center justify-center min-w-[56px] px-3 py-2 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md z-10 relative cursor-default ${bg} ${border}`}>
        <span className={`font-mono text-sm font-black leading-none ${text}`}>{label}</span>
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((c: any, i: number) => (
            <ASTGraphNode key={i} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
};
