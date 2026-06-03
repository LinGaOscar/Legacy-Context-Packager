#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import React from 'react';
import { render } from 'ink';
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

program.parse();
