# Javagar's Compiler

A desktop application that compiles programs written in the Javagar Language (JL) through a complete compiler pipeline. The app shows each stage of compilation: lexical analysis, parsing, semantic analysis, three-address code generation, optimization, machine code generation, and a CPU simulator. Built with Tauri (Rust backend) and React (frontend).

## Features

- Edit JL source code in a text editor
- Run the full compiler pipeline with a single click
- View each compilation stage in separate panels:
  - Lexical analysis: token stream and summary statistics
  - Syntax analysis: abstract syntax tree (AST) as a graph
  - Semantic analysis: symbol table and type checking logs
  - Three-address code (TAC) intermediate representation
  - Optimized TAC after constant folding and copy propagation
  - 16-bit machine code generation with binary opcodes
  - CPU simulator that executes the machine code step by step
- Load example programs from a preset list
- Edit, add, or remove presets
- Hide or expand any phase panel to focus on specific stages

## Technology Stack

- **Frontend**: React (TypeScript) with Vite, Tailwind CSS, Framer Motion
- **Backend**: Rust with Tauri framework
- **Compiler core**: Written in Rust (lexer, parser, semantic analyzer, TAC generator, optimizer, code generator)
- **CPU simulator**: Runs inside the Rust backend; state is sent to the frontend after each instruction

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/) (with Cargo)
- Tauri CLI (`cargo install tauri-cli`)

For Tauri system dependencies, see the [Tauri documentation](https://tauri.app/v1/guides/getting-started/prerequisites).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Java-Idl/compiler_app.git
   cd compiler_app
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Build and run the app in development mode:
   ```bash
   npm run tauri dev
   ```

This will launch the application in a native window.

### Building for Production

To create a standalone executable:

```bash
npm run tauri build
```

The output will be placed in `src-tauri/target/release/`.

## Usage

1. Write JL code in the left editor pane. The code editor shows line numbers.
2. Click the **Run Pipeline** button in the top toolbar.
3. The compiler processes the code through all phases. Results appear in the panels on the right.
4. Use the sidebar buttons (① through ⚙) to show or hide each phase panel.
5. Click the arrow (▶) in each panel header to collapse or expand the panel.
6. Use the preset dropdown to load example programs.
7. Click **Edit Presets** to manage your own set of test programs.

The CPU Simulator panel (⚙) allows you to step through the generated machine code instruction by instruction. It shows the program counter, registers, and memory after each step. Click on any machine code instruction to jump directly to that point.

## Language Specification (JL)

JL is a small language designed for teaching compiler concepts. It supports integer arithmetic, variables, and a few built-in functions.

### Data Types

- Only `i32` (signed 32-bit integers) are supported.

### Statements

Each statement must end with a semicolon `;`.

- **Variable declaration**  
  `let name = expression;`  
  Introduces a new variable. The variable must be declared before use.

- **Assignment**  
  `name = expression;`  
  Updates an existing variable.

- **Print**  
  `print expression;`  
  Prints the value of the expression.

### Expressions

Expressions can be:

- Integer literals (e.g., `42`, `-7`)
- Variable names (e.g., `x`, `counter`)
- Binary operations: `+`, `-`, `*`, `/`, `%` (modulo)
- Unary negation: `neg expression` (e.g., `neg 5`)
- Built-in functions:
  - `abs(expression)` – absolute value
  - `sq(expression)` – square (x²)
- Parentheses for grouping

### Comments

Single-line comments start with `//` and continue to the end of the line.

### Keywords

| Keyword | Use |
|---------|-----|
| `let`   | Variable declaration |
| `print` | Output value |
| `abs`   | Absolute value |
| `sq`    | Square |
| `neg`   | Unary negation |
| `mod`   | Modulo (alternate spelling of `%`) |

### Example Program

```
// Compute Fahrenheit from Celsius
let celsius = 25;
let scaled = celsius * 9;
let divided = scaled / 5;
let fahrenheit = divided + 32;
print fahrenheit;
```

## Compiler Pipeline

The compiler processes the source code through the following stages:

1. **Lexical Analysis** – Converts the source string into a list of tokens (keywords, identifiers, numbers, operators, symbols).
2. **Parsing** – Builds an abstract syntax tree (AST) from the tokens. If syntax errors occur, the pipeline stops here.
3. **Semantic Analysis** – Checks that variables are declared before use and builds a symbol table. Reports usage errors.
4. **Three-Address Code (TAC)** – Translates the AST into a linear sequence of instructions with temporary variables.
5. **Optimization** – Applies constant folding and copy propagation to simplify the TAC.
6. **Code Generation** – Converts TAC into a 16-bit machine code format. Each instruction has an opcode, binary encoding, and an assembly-like mnemonic.
7. **CPU Simulator** – Interprets the machine code, updating registers and memory. You can step through execution manually.

## License

This project is open source. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

Developed as part of the Automata Theory and Compiler Design (ATCD) lab at Amrita University.
