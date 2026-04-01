// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod compiler_core;
use compiler_core::{lex, analyze_semantics, optimize_code, ASTNode, Token, Parser, TACGenerator, TACInstruction, MachineInstruction, generate_machine_code};
use serde::Serialize;

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
    tokens:        Vec<String>,
    ast:           Vec<ASTNode>,
    semantic:      Vec<String>,
    tac:           Vec<TACInstruction>,
    optimized_tac: Vec<TACInstruction>,
    machine_code:  Vec<MachineInstruction>,
    /// None = success; Some(msg) = first error encountered (pipeline continues as far as possible)
    error:         Option<String>,
}

#[tauri::command]
fn compile_pipeline(code: &str) -> Result<PipelineResult, String> {
    // ── Phase 1: Lexing — always succeeds ──────────────────────────────────
    let tokens     = lex(code);
    let token_strs: Vec<String> = tokens.iter()
        .filter(|t| !matches!(t, Token::EOF))   // skip EOF in display
        .map(token_display)
        .collect();

    // ── Phase 2: Parsing ───────────────────────────────────────────────────
    let ast = match Parser::new(tokens).parse() {
        Ok(a)  => a,
        Err(e) => return Ok(PipelineResult {
            tokens: token_strs,
            ast: vec![], semantic: vec![], tac: vec![],
            optimized_tac: vec![], machine_code: vec![],
            error: Some(e),
        }),
    };

    // ── Phase 3: Semantic Analysis ─────────────────────────────────────────
    let semantic = match analyze_semantics(&ast) {
        Ok(s)  => s,
        Err(e) => return Ok(PipelineResult {
            tokens: token_strs,
            ast: vec![ast],           // AST is valid — still show it
            semantic: vec![], tac: vec![],
            optimized_tac: vec![], machine_code: vec![],
            error: Some(e),
        }),
    };

    // ── Phase 4-6: TAC / Optimise / Codegen ───────────────────────────────
    let mut tac_gen = TACGenerator::new();
    tac_gen.generate(&ast);
    let optimized_tac = optimize_code(&tac_gen.instructions);
    let machine_code  = generate_machine_code(&tac_gen.instructions);

    Ok(PipelineResult {
        tokens: token_strs,
        ast: vec![ast],
        semantic,
        tac: tac_gen.instructions,
        optimized_tac,
        machine_code,
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


