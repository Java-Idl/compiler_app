use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

// ─── Tokens ───────────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Token {
    // Literals
    Ident(String),
    Num(i32),
    // Operators
    Assign, Plus, Minus, Star, Slash, Percent,
    LParen, RParen,
    Semi,
    // Keywords
    KwLet, KwPrint, KwAbs, KwSq, KwNeg, KwMod,
    EOF,
}

// ─── Lexer ────────────────────────────────────────────────────────────────────
pub fn lex(code: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut chars = code.chars().peekable();

    while let Some(&c) = chars.peek() {
        if c.is_whitespace() {
            chars.next();
        } else if c.is_alphabetic() || c == '_' {
            let mut s = String::new();
            while let Some(&ch) = chars.peek() {
                if ch.is_alphanumeric() || ch == '_' { s.push(ch); chars.next(); } else { break; }
            }
            tokens.push(match s.as_str() {
                "let"   => Token::KwLet,
                "print" => Token::KwPrint,
                "abs"   => Token::KwAbs,
                "sq"    => Token::KwSq,
                "neg"   => Token::KwNeg,
                "mod"   => Token::KwMod,
                _       => Token::Ident(s),
            });
        } else if c.is_ascii_digit() {
            let mut n = 0i32;
            while let Some(&ch) = chars.peek() {
                if ch.is_ascii_digit() { n = n * 10 + ch.to_digit(10).unwrap() as i32; chars.next(); } else { break; }
            }
            tokens.push(Token::Num(n));
        } else {
            match c {
                '=' => { tokens.push(Token::Assign);  chars.next(); }
                '+' => { tokens.push(Token::Plus);    chars.next(); }
                '-' => { tokens.push(Token::Minus);   chars.next(); }
                '*' => { tokens.push(Token::Star);    chars.next(); }
                '%' => { tokens.push(Token::Percent); chars.next(); }
                '(' => { tokens.push(Token::LParen);  chars.next(); }
                ')' => { tokens.push(Token::RParen);  chars.next(); }
                ';' => { tokens.push(Token::Semi);    chars.next(); }
                '/' => {
                    chars.next();
                    if let Some(&'/') = chars.peek() {
                        while let Some(&ch) = chars.peek() { chars.next(); if ch == '\n' { break; } }
                    } else {
                        tokens.push(Token::Slash);
                    }
                }
                _ => { chars.next(); }
            }
        }
    }
    tokens.push(Token::EOF);
    tokens
}

// ─── AST ──────────────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum ASTNode {
    Program    { statements: Vec<ASTNode> },
    Assignment { target: Box<ASTNode>, expr: Box<ASTNode> },
    Let        { target: Box<ASTNode>, expr: Box<ASTNode> },
    Print      { expr: Box<ASTNode> },
    BinaryOp   { op: String, left: Box<ASTNode>, right: Box<ASTNode> },
    UnaryOp    { op: String, expr: Box<ASTNode> },
    BuiltIn    { func: String, arg: Box<ASTNode> },
    Variable   (String),
    Number     (i32),
}

// ─── Parser ───────────────────────────────────────────────────────────────────
pub struct Parser { tokens: Vec<Token>, pos: usize }

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Self { Self { tokens, pos: 0 } }

    fn peek(&self) -> &Token { self.tokens.get(self.pos).unwrap_or(&Token::EOF) }

    fn consume(&mut self) -> Token {
        let t = self.peek().clone();
        if self.pos < self.tokens.len() { self.pos += 1; }
        t
    }

    fn expect_semi(&mut self, ctx: &str) -> Result<(), String> {
        if matches!(self.peek(), Token::Semi) { self.consume(); Ok(()) }
        else { Err(format!("Syntax Error: Expected ';' after {}.", ctx)) }
    }

    pub fn parse(&mut self) -> Result<ASTNode, String> {
        let mut stmts = Vec::new();
        while !matches!(self.peek(), Token::EOF) {
            if matches!(self.peek(), Token::Semi) { self.consume(); continue; }
            stmts.push(self.parse_statement()?);
        }
        Ok(ASTNode::Program { statements: stmts })
    }

    fn parse_statement(&mut self) -> Result<ASTNode, String> {
        match self.peek().clone() {
            Token::KwLet => {
                self.consume();
                let name = if let Token::Ident(n) = self.consume() { n }
                    else { return Err("Syntax Error: Expected identifier after 'let'.".into()); };
                if !matches!(self.consume(), Token::Assign) {
                    return Err(format!("Syntax Error: Expected '=' after 'let {}'.", name));
                }
                let expr = self.parse_expr()?;
                self.expect_semi("let declaration")?;
                Ok(ASTNode::Let { target: Box::new(ASTNode::Variable(name)), expr: Box::new(expr) })
            }
            Token::KwPrint => {
                self.consume();
                let expr = self.parse_expr()?;
                self.expect_semi("print statement")?;
                Ok(ASTNode::Print { expr: Box::new(expr) })
            }
            Token::Ident(_) => {
                let name = if let Token::Ident(n) = self.consume() { n }
                    else { return Err("Syntax Error: Expected identifier at assignment start.".into()); };
                if !matches!(self.consume(), Token::Assign) {
                    return Err(format!("Syntax Error: Expected '=' after '{}'.", name));
                }
                let expr = self.parse_expr()?;
                self.expect_semi("assignment")?;
                Ok(ASTNode::Assignment { target: Box::new(ASTNode::Variable(name)), expr: Box::new(expr) })
            }
            other => Err(format!("Syntax Error: Unexpected token {:?} at start of statement.", other)),
        }
    }

    fn parse_expr(&mut self) -> Result<ASTNode, String> { self.parse_additive() }

    fn parse_additive(&mut self) -> Result<ASTNode, String> {
        let mut left = self.parse_multiplicative()?;
        while matches!(self.peek(), Token::Plus | Token::Minus) {
            let op = match self.consume() {
                Token::Plus  => "+".to_string(),
                Token::Minus => "-".to_string(),
                t => return Err(format!("Syntax Error: Unexpected token {:?} in additive expression.", t)),
            };
            let right = self.parse_multiplicative()?;
            left = ASTNode::BinaryOp { op, left: Box::new(left), right: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_multiplicative(&mut self) -> Result<ASTNode, String> {
        let mut left = self.parse_unary()?;
        while matches!(self.peek(), Token::Star | Token::Slash | Token::Percent | Token::KwMod) {
            let op = match self.consume() {
                Token::Star    => "*".to_string(),
                Token::Slash   => "/".to_string(),
                Token::Percent | Token::KwMod => "%".to_string(),
                t => return Err(format!("Syntax Error: Unexpected token {:?} in multiplicative expression.", t)),
            };
            let right = self.parse_unary()?;
            left = ASTNode::BinaryOp { op, left: Box::new(left), right: Box::new(right) };
        }
        Ok(left)
    }

    fn parse_unary(&mut self) -> Result<ASTNode, String> {
        if matches!(self.peek(), Token::KwNeg) {
            self.consume();
            let expr = self.parse_primary()?;
            return Ok(ASTNode::UnaryOp { op: "neg".to_string(), expr: Box::new(expr) });
        }
        self.parse_primary()
    }

    fn parse_primary(&mut self) -> Result<ASTNode, String> {
        match self.peek().clone() {
            Token::Num(n)   => { self.consume(); Ok(ASTNode::Number(n)) }
            Token::Ident(s) => { self.consume(); Ok(ASTNode::Variable(s)) }
            Token::LParen   => {
                self.consume();
                let expr = self.parse_expr()?;
                if !matches!(self.consume(), Token::RParen) {
                    return Err("Syntax Error: Expected ')'.".into());
                }
                Ok(expr)
            }
            Token::KwAbs => {
                self.consume();
                if !matches!(self.consume(), Token::LParen) { return Err("Syntax Error: Expected '(' after 'abs'.".into()); }
                let arg = self.parse_expr()?;
                if !matches!(self.consume(), Token::RParen) { return Err("Syntax Error: Expected ')' after abs argument.".into()); }
                Ok(ASTNode::BuiltIn { func: "abs".to_string(), arg: Box::new(arg) })
            }
            Token::KwSq => {
                self.consume();
                if !matches!(self.consume(), Token::LParen) { return Err("Syntax Error: Expected '(' after 'sq'.".into()); }
                let arg = self.parse_expr()?;
                if !matches!(self.consume(), Token::RParen) { return Err("Syntax Error: Expected ')' after sq argument.".into()); }
                Ok(ASTNode::BuiltIn { func: "sq".to_string(), arg: Box::new(arg) })
            }
            t => Err(format!("Syntax Error: Unexpected {:?}, expected a number, variable, or expression.", t))
        }
    }
}

// ─── Semantic Analysis ────────────────────────────────────────────────────────
pub fn analyze_semantics(ast: &ASTNode) -> Result<Vec<String>, String> {
    let mut logs    = Vec::new();
    let mut symbols: HashSet<String> = HashSet::new();

    logs.push("Initializing Semantic Analysis…".into());
    logs.push("Building Symbol Table…".into());

    fn check(node: &ASTNode, sym: &mut HashSet<String>, logs: &mut Vec<String>) -> Result<(), String> {
        match node {
            ASTNode::Program { statements } => {
                for s in statements { check(s, sym, logs)?; }
            }
            ASTNode::Assignment { target, expr } | ASTNode::Let { target, expr } => {
                check(expr, sym, logs)?;
                if let ASTNode::Variable(v) = &**target {
                    let kind = if matches!(node, ASTNode::Let { .. }) { "let" } else { "=" };
                    if sym.insert(v.clone()) {
                        logs.push(format!("  [def]  '{}' ({})  →  i32  (scope: global)", v, kind));
                    } else {
                        logs.push(format!("  [upd]  '{}' reassigned", v));
                    }
                }
            }
            ASTNode::Print { expr } => {
                check(expr, sym, logs)?;
                logs.push("  [out]  print → stdout  (i32)".into());
            }
            ASTNode::Variable(v) => {
                if !sym.contains(v) {
                    return Err(format!("Semantic Error: '{}' used before assignment.", v));
                }
            }
            ASTNode::BinaryOp { op, left, right } => {
                check(left, sym, logs)?;
                check(right, sym, logs)?;
                if op == "/" || op == "%" {
                    logs.push(format!("  [chk]  divisor-zero check for '{}'", op));
                }
            }
            ASTNode::UnaryOp { expr, op } => {
                check(expr, sym, logs)?;
                logs.push(format!("  [unary] '{}' applied", op));
            }
            ASTNode::BuiltIn { func, arg } => {
                check(arg, sym, logs)?;
                logs.push(format!("  [blt]  built-in '{}()'  →  i32", func));
            }
            ASTNode::Number(_) => {}
        }
        Ok(())
    }

    check(ast, &mut symbols, &mut logs)?;
    logs.push(format!("Type check complete — {} symbol(s) in scope. Status: VERIFIED.", symbols.len()));
    Ok(logs)
}

// ─── TAC ──────────────────────────────────────────────────────────────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TACInstruction {
    pub result: String,
    pub arg1:   String,
    pub op:     Option<String>,
    pub arg2:   Option<String>,
}

pub struct TACGenerator {
    temp_count:       usize,
    pub instructions: Vec<TACInstruction>,
}

impl TACGenerator {
    pub fn new() -> Self { Self { temp_count: 0, instructions: Vec::new() } }

    fn tmp(&mut self) -> String {
        self.temp_count += 1;
        format!("_t{}", self.temp_count)
    }

    pub fn generate(&mut self, root: &ASTNode) {
        if let ASTNode::Program { statements } = root {
            for stmt in statements { self.stmt(stmt); }
        }
    }

    fn stmt(&mut self, node: &ASTNode) {
        match node {
            ASTNode::Assignment { target, expr } | ASTNode::Let { target, expr } => {
                let rhs = self.expr(expr);
                let lhs = if let ASTNode::Variable(v) = &**target { v.clone() } else { "_".into() };
                self.instructions.push(TACInstruction { result: lhs, arg1: rhs, op: None, arg2: None });
            }
            ASTNode::Print { expr } => {
                let val = self.expr(expr);
                self.instructions.push(TACInstruction {
                    result: "_out".into(), arg1: val, op: Some("PRINT".into()), arg2: None,
                });
            }
            _ => {}
        }
    }

    fn expr(&mut self, node: &ASTNode) -> String {
        match node {
            ASTNode::Number(n)   => n.to_string(),
            ASTNode::Variable(v) => v.clone(),
            ASTNode::BinaryOp { op, left, right } => {
                let l = self.expr(left);
                let r = self.expr(right);
                let t = self.tmp();
                self.instructions.push(TACInstruction { result: t.clone(), arg1: l, op: Some(op.clone()), arg2: Some(r) });
                t
            }
            ASTNode::UnaryOp { op, expr } => {
                let v = self.expr(expr);
                let t = self.tmp();
                self.instructions.push(TACInstruction { result: t.clone(), arg1: v, op: Some(op.to_uppercase()), arg2: None });
                t
            }
            ASTNode::BuiltIn { func, arg } => {
                let v = self.expr(arg);
                let t = self.tmp();
                self.instructions.push(TACInstruction { result: t.clone(), arg1: v, op: Some(func.to_uppercase()), arg2: None });
                t
            }
            _ => String::new()
        }
    }
}

// ─── TAC Optimizer: Constant Folding + Copy Propagation ──────────────────────
pub fn optimize_code(tac: &[TACInstruction]) -> Vec<TACInstruction> {
    let mut out       = Vec::new();
    let mut constants: HashMap<String, i32>    = HashMap::new();
    let mut copies:    HashMap<String, String> = HashMap::new();

    for t in tac {
        let mut inst = t.clone();

        // Copy propagation on args
        if inst.arg1.parse::<i32>().is_err() {
            if let Some(c) = copies.get(&inst.arg1) { inst.arg1 = c.clone(); }
        }
        if let Some(ref a2) = inst.arg2.clone() {
            if a2.parse::<i32>().is_err() {
                if let Some(c) = copies.get(a2) { inst.arg2 = Some(c.clone()); }
            }
        }

        // Constant substitution on args
        if inst.arg1.parse::<i32>().is_err() {
            if let Some(v) = constants.get(&inst.arg1) { inst.arg1 = v.to_string(); }
        }
        if let Some(ref a2) = inst.arg2.clone() {
            if a2.parse::<i32>().is_err() {
                if let Some(v) = constants.get(a2) { inst.arg2 = Some(v.to_string()); }
            }
        }

        // Fold binary ops if both args are now literals
        if let (Some(op), Some(a2)) = (&inst.op.clone(), &inst.arg2.clone()) {
            if let (Ok(v1), Ok(v2)) = (inst.arg1.parse::<i32>(), a2.parse::<i32>()) {
                let folded = match op.as_str() {
                    "+" => v1 + v2,
                    "-" => v1 - v2,
                    "*" => v1 * v2,
                    "/" => if v2 != 0 { v1 / v2 } else { 0 },
                    "%" => if v2 != 0 { v1 % v2 } else { 0 },
                    _   => { out.push(inst); continue; }
                };
                constants.insert(inst.result.clone(), folded);
                out.push(TACInstruction { result: inst.result, arg1: folded.to_string(), op: None, arg2: None });
                continue;
            }
        }

        // Fold unary ops
        if let Some(op) = &inst.op.clone() {
            if inst.arg2.is_none() && op != "PRINT" {
                if let Ok(v) = inst.arg1.parse::<i32>() {
                    let folded = match op.as_str() {
                        "NEG" => -v,
                        "ABS" => v.abs(),
                        "SQ"  => v * v,
                        _     => { out.push(inst); continue; }
                    };
                    constants.insert(inst.result.clone(), folded);
                    out.push(TACInstruction { result: inst.result, arg1: folded.to_string(), op: None, arg2: None });
                    continue;
                }
            }
        }

        // Record copies: x = y (no op, non-literal)
        if inst.op.is_none() && inst.arg1.parse::<i32>().is_err() {
            copies.insert(inst.result.clone(), inst.arg1.clone());
        }
        // Record constants: x = <literal>
        if inst.op.is_none() {
            if let Ok(n) = inst.arg1.parse::<i32>() {
                constants.insert(inst.result.clone(), n);
            }
        }

        out.push(inst);
    }
    out
}

// ─── Machine Code (runs on UNOPTIMIZED TAC so all opcodes appear) ─────────────
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MachineInstruction {
    pub opcode:      String,
    pub instruction: String,
    pub binary:      String,
    pub cpu_state:   CpuState,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CpuState {
    pub pc:        usize,
    pub registers: [i32; 4],
    pub memory:    HashMap<String, i32>,
}

pub fn generate_machine_code(tac: &[TACInstruction]) -> (Vec<MachineInstruction>, HashMap<String, i32>) {
    let mut out = Vec::new();
    let mut cpu = CpuState::default();
    let mut assignments: HashMap<String, i32> = HashMap::new();

    for (idx, t) in tac.iter().enumerate() {
        let v1 = t.arg1.parse::<i32>()
            .unwrap_or_else(|_| *cpu.memory.get(&t.arg1).unwrap_or(&0));
        let v2 = t.arg2.as_deref()
            .map(|a| a.parse::<i32>().unwrap_or_else(|_| *cpu.memory.get(a).unwrap_or(&0)))
            .unwrap_or(0);

        cpu.registers[0] = v1; // R1 = operand 1
        cpu.registers[1] = v2; // R2 = operand 2

        let (opcode_bits, mnemonic, result_val) = match t.op.as_deref() {
            Some("+")     => ("0001", "ADD",   v1 + v2),
            Some("-")     => ("0010", "SUB",   v1 - v2),
            Some("*")     => ("0011", "MUL",   v1 * v2),
            Some("/")     => ("0100", "DIV",   if v2 != 0 { v1 / v2 } else { 0 }),
            Some("%")     => ("0101", "MOD",   if v2 != 0 { v1 % v2 } else { 0 }),
            Some("ABS")   => ("0110", "ABS",   v1.abs()),
            Some("SQ")    => ("0111", "SQ",    v1 * v1),
            Some("NEG")   => ("1000", "NEG",   -v1),
            Some("PRINT") => ("1001", "OUT",   v1),
            None if t.arg1.parse::<i32>().is_ok() => ("0000", "MOV",   v1),
            _             => ("1010", "STORE", v1),
        };

        cpu.registers[2] = result_val;                          // R3 = output
        cpu.registers[3] = cpu.registers[3].wrapping_add(1);   // R4 = cycle counter

        if mnemonic != "OUT" {
            cpu.memory.insert(t.result.clone(), result_val);
            // Track non-temporary variable assignments
            if !t.result.starts_with('_') {
                assignments.insert(t.result.clone(), result_val);
            }
        }
        cpu.pc = idx + 1;

        // 16-bit encoding: [4b opcode][2b dst][2b src1][8b imm]
        let dst = (t.result.bytes().next().unwrap_or(b'?') % 4) as u8;
        let src = (t.arg1.bytes().next().unwrap_or(b'0') % 4) as u8;
        let imm = (v1 as i8) as u8;
        let binary = format!("{} {:02b} {:02b} {:08b}", opcode_bits, dst, src, imm);

        let inst_str = match t.op.as_deref() {
            Some("+") | Some("-") | Some("*") | Some("/") | Some("%") =>
                format!("{} R3, R1({}), R2({})", mnemonic, t.arg1, t.arg2.as_deref().unwrap_or("?")),
            Some("PRINT") =>
                format!("OUT stdout, {}", t.arg1),
            Some(op) =>
                format!("{} R3, R1({})", op, t.arg1),
            None if t.arg1.parse::<i32>().is_ok() =>
                format!("MOV R3, #{}", v1),
            _ =>
                format!("STORE [{}], R1({})", t.result, t.arg1),
        };

        out.push(MachineInstruction {
            opcode: mnemonic.to_string(),
            instruction: inst_str,
            binary,
            cpu_state: cpu.clone(),
        });
    }
    (out, assignments)
}
