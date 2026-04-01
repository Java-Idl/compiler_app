export interface TacInstruction {
  result: string;
  arg1: string;
  op?: string;
  arg2?: string;
}

export interface MachineInstructionView {
  opcode: string;
  instruction: string;
  binary: string;
}

export function formatTacText(rows: TacInstruction[]): string {
  return rows
    .map((row, i) => {
      const rhs = `${row.arg1}${row.op ? ` ${row.op}${row.arg2 ? ` ${row.arg2}` : ""}` : ""}`;
      return `${i.toString().padStart(2, "0")}: ${row.result} = ${rhs}`;
    })
    .join("\n");
}

export function formatAssignmentsText(assignments: Record<string, number>): string {
  return Object.entries(assignments)
    .map(([name, value]) => `${name} = ${value} (0x${value.toString(16).padStart(2, "0").toUpperCase()})`)
    .join("\n");
}

export function formatMachineCodeText(rows: MachineInstructionView[]): string {
  return rows
    .map((row, i) => {
      const address = `0x${i.toString(16).padStart(2, "0").toUpperCase()}`;
      const args = row.instruction.replace(row.opcode, "").trim();
      return `${address}: ${row.opcode} ${args} (${row.binary})`;
    })
    .join("\n");
}
