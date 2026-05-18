#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import React from 'react';
import { render } from 'ink';
import { diffScans, formatDiffMarkdown } from '../core/diff-engine.js';
import { App } from '../tui/App.js';

const program = new Command();

program
  .name('lcp')
  .description('Legacy Context Packager — 企業遺留系統 LLM 前處理器')
  .version('0.3.0');

// 無子命令時直接開 TUI
program.action(() => {
  if (!process.stdin.isTTY) {
    console.error('[LCP] 需要在互動式終端機中執行');
    process.exit(1);
  }
  render(React.createElement(App, { secrets: true }));
});

// ── lcp ui ────────────────────────────────────────────────────────────────────
program
  .command('ui [projectPath]')
  .description('以互動式 TUI 掃描並瀏覽結果（不帶路徑則進入 TUI 後輸入）')
  .option('--no-secrets', '跳過 secret 掃描')
  .action((projectPath: string | undefined, options: { secrets: boolean }) => {
    if (!process.stdin.isTTY) {
      console.error('[LCP] 需要在互動式終端機中執行');
      process.exit(1);
    }
    render(React.createElement(App, {
      projectPath: projectPath ? path.resolve(projectPath) : undefined,
      secrets: options.secrets,
    }));
  });

// ── lcp diff ──────────────────────────────────────────────────────────────────
program
  .command('diff <oldDir> <newDir>')
  .description('比較兩次掃描結果的 route / secret 差異')
  .option('-o, --output <file>', '輸出 diff 報告路徑', './lcp-diff.md')
  .action((oldDir: string, newDir: string, options: { output: string }) => {
    console.log(`\n[LCP] 比較：${oldDir} → ${newDir}`);

    const resolvedOld = path.resolve(oldDir);
    const resolvedNew = path.resolve(newDir);
    if (!fs.existsSync(path.join(resolvedOld, 'routes.json'))) {
      console.error(`[LCP] 錯誤：${oldDir} 不包含 routes.json`);
      process.exit(1);
    }
    if (!fs.existsSync(path.join(resolvedNew, 'routes.json'))) {
      console.error(`[LCP] 錯誤：${newDir} 不包含 routes.json`);
      process.exit(1);
    }

    const diff = diffScans(resolvedOld, resolvedNew);
    const md = formatDiffMarkdown(diff);
    const outPath = path.resolve(options.output);

    fs.writeFileSync(outPath, md, 'utf8');

    console.log(`  Routes added:     ${diff.routes.added.length}`);
    console.log(`  Routes removed:   ${diff.routes.removed.length}`);
    console.log(`  Secrets new:      ${diff.secrets.newFound.length}`);
    console.log(`  Secrets resolved: ${diff.secrets.resolved.length}`);
    console.log(`  Report:           ${outPath}`);
  });

program.parse();
