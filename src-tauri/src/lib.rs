// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod compiler_core;
use compiler_core::{lex, analyze_semantics, optimize_code, ASTNode, Token, Parser, TACGenerator, TACInstruction, MachineInstruction, generate_machine_code};
use serde::Serialize;
use std::collections::BTreeSet;

#[derive(Serialize)]
pub struct TokenClassSummary {
    count: usize,
    items: Vec<String>,
}

#[derive(Serialize)]
pub struct LexicalSummary {
    keywords:    TokenClassSummary,
    identifiers: TokenClassSummary,
    numbers:     TokenClassSummary,
    operators:   TokenClassSummary,
    symbols:     TokenClassSummary,
}

fn summarize_class(count: usize, values: BTreeSet<String>) -> TokenClassSummary {
    TokenClassSummary {
        count,
        items: values.into_iter().collect(),
    }
}

fn lexical_summary(tokens: &[Token]) -> LexicalSummary {
    let mut kw_count = 0usize;
    let mut id_count = 0usize;
    let mut num_count = 0usize;
    let mut op_count = 0usize;
    let mut sym_count = 0usize;

    let mut keywords: BTreeSet<String> = BTreeSet::new();
    let mut identifiers: BTreeSet<String> = BTreeSet::new();
    let mut numbers: BTreeSet<String> = BTreeSet::new();
    let mut operators: BTreeSet<String> = BTreeSet::new();
    let mut symbols: BTreeSet<String> = BTreeSet::new();

    for t in tokens {
        match t {
            Token::KwLet => { kw_count += 1; keywords.insert("let".into()); }
            Token::KwPrint => { kw_count += 1; keywords.insert("print".into()); }
            Token::KwAbs => { kw_count += 1; keywords.insert("abs".into()); }
            Token::KwSq => { kw_count += 1; keywords.insert("sq".into()); }
            Token::KwNeg => { kw_count += 1; keywords.insert("neg".into()); }
            Token::KwMod => { kw_count += 1; keywords.insert("mod".into()); }
            Token::Ident(s) => { id_count += 1; identifiers.insert(s.clone()); }
            Token::Num(n) => { num_count += 1; numbers.insert(n.to_string()); }
            Token::Assign => { op_count += 1; operators.insert("=".into()); }
            Token::Plus => { op_count += 1; operators.insert("+".into()); }
            Token::Minus => { op_count += 1; operators.insert("-".into()); }
            Token::Star => { op_count += 1; operators.insert("*".into()); }
            Token::Slash => { op_count += 1; operators.insert("/".into()); }
            Token::Percent => { op_count += 1; operators.insert("%".into()); }
            Token::LParen => { sym_count += 1; symbols.insert("(".into()); }
            Token::RParen => { sym_count += 1; symbols.insert(")".into()); }
            Token::Semi => { sym_count += 1; symbols.insert(";".into()); }
            Token::EOF => {}
        }
    }

    LexicalSummary {
        keywords: summarize_class(kw_count, keywords),
        identifiers: summarize_class(id_count, identifiers),
        numbers: summarize_class(num_count, numbers),
        operators: summarize_class(op_count, operators),
        symbols: summarize_class(sym_count, symbols),
    }
}

/// Human-readable token label for the lexical panel
fn token_display(t: &Token) -> String {
    match t {
        Token::Ident(s)  => format!("IDENT({})", s),
        Token::Num(n)    => format!("NUM({})", n),
        Token::Assign    => "=".into(),
        Token::Plus      => "+".into(),
        Token::Minus     => "-".into(),
        Token::Star      => "*".into(),
        Token::Slash     => "/".into(),
        Token::Percent   => "%".into(),
        Token::LParen    => "(".into(),
        Token::RParen    => ")".into(),
        Token::Semi      => ";".into(),
        Token::KwLet     => "let".into(),
        Token::KwPrint   => "print".into(),
        Token::KwAbs     => "abs".into(),
        Token::KwSq      => "sq".into(),
        Token::KwNeg     => "neg".into(),
        Token::KwMod     => "mod".into(),
        Token::EOF       => "EOF".into(),
    }
}

#[derive(Serialize)]
pub struct PipelineResult {
    tokens:           Vec<String>,
    lexical_summary:  LexicalSummary,
    ast:             Vec<ASTNode>,
    semantic:        Vec<String>,
    tac:             Vec<TACInstruction>,
    optimized_tac:   Vec<TACInstruction>,
    machine_code:    Vec<MachineInstruction>,
    assignments:     std::collections::BTreeMap<String, i32>,
    /// None = success; Some(msg) = first error encountered (pipeline continues as far as possible)
    error:           Option<String>,
}

#[tauri::command]
fn compile_pipeline(code: &str) -> Result<PipelineResult, String> {
    // ── Phase 1: Lexing — always succeeds ──────────────────────────────────
    let tokens     = lex(code);
    let summary    = lexical_summary(&tokens);
    let token_strs: Vec<String> = tokens.iter()
        .filter(|t| !matches!(t, Token::EOF))   // skip EOF in display
        .map(token_display)
        .collect();

    // ── Phase 2: Parsing ───────────────────────────────────────────────────
    let ast = match Parser::new(tokens).parse() {
        Ok(a)  => a,
        Err(e) => return Ok(PipelineResult {
            tokens: token_strs,
            lexical_summary: summary,
            ast: vec![], semantic: vec![], tac: vec![],
            optimized_tac: vec![], machine_code: vec![],
            assignments: std::collections::BTreeMap::new(),
            error: Some(e),
        }),
    };

    // ── Phase 3: Semantic Analysis ─────────────────────────────────────────
    let semantic = match analyze_semantics(&ast) {
        Ok(s)  => s,
        Err(e) => return Ok(PipelineResult {
            tokens: token_strs,
            lexical_summary: summary,
            ast: vec![ast],           // AST is valid — still show it
            semantic: vec![], tac: vec![],
            optimized_tac: vec![], machine_code: vec![],
            assignments: std::collections::BTreeMap::new(),
            error: Some(e),
        }),
    };

    // ── Phase 4-6: TAC / Optimise / Codegen ───────────────────────────────
    let mut tac_gen = TACGenerator::new();
    tac_gen.generate(&ast);
    let optimized_tac = optimize_code(&tac_gen.instructions);
    let (machine_code, assignments_map) = generate_machine_code(&tac_gen.instructions);
    let assignments: std::collections::BTreeMap<String, i32> = assignments_map.into_iter().collect();

    Ok(PipelineResult {
        tokens: token_strs,
        lexical_summary: summary,
        ast: vec![ast],
        semantic,
        tac: tac_gen.instructions,
        optimized_tac,
        machine_code,
        assignments,
        error: None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![compile_pipeline])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


