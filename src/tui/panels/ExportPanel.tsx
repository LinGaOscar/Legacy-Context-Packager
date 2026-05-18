import React, { useState } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { ProjectScanResult } from '../../models/context-pack.js';
import { buildOutput } from '../../core/output-builder.js';
import { LCP_OUTPUT_DIR } from '../../core/paths.js';

interface ExportOption {
  label: string;
  files: string[];
  desc: string;
  formats: ('json' | 'markdown')[];
  report: boolean;
}

const OPTIONS: ExportOption[] = [
  {
    label: 'Context Pack (MD)',
    files: ['context-pack.md'],
    desc: '整合摘要與 LLM 提示詞，直接貼給 AI 分析系統用',
    formats: ['markdown'],
    report: false,
  },
  {
    label: 'HTML 互動報告',
    files: ['report.html'],
    desc: '瀏覽器可直接開啟，支援搜尋、篩選與分頁瀏覽',
    formats: [],
    report: true,
  },
  {
    label: '全部輸出',
    files: ['context-pack.md', 'report.html'],
    desc: 'MD + HTML 一次輸出至 lcp-output/',
    formats: ['markdown'],
    report: true,
  },
];

const FILE_DESCS: Record<string, string> = {
  'context-pack.md': '系統盤點摘要，含 LLM 任務提示詞，直接貼給 AI',
  'report.html':     '互動式 HTML，支援搜尋篩選，瀏覽器直接開啟',
};

interface Props {
  result: ProjectScanResult;
  active: boolean;
}

export function ExportPanel({ result, active }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [exported, setExported] = useState<Set<number>>(new Set());
  const [lastExport, setLastExport] = useState<string | null>(null);

  useInput((input: string, key: Key) => {
    if (!active) return;
    if (key.upArrow)   setSelectedIdx(i => Math.max(0, i - 1));
    if (key.downArrow) setSelectedIdx(i => Math.min(OPTIONS.length - 1, i + 1));
    if (key.return) {
      const opt = OPTIONS[selectedIdx];
      buildOutput(result, { outputDir: LCP_OUTPUT_DIR, formats: opt.formats, report: opt.report });
      setExported(prev => new Set([...prev, selectedIdx]));
      setLastExport(LCP_OUTPUT_DIR);
    }
  }, { isActive: active });

  const selected = OPTIONS[selectedIdx];

  return (
    <Box flexDirection="row" gap={2}>
      {/* 左側：選項清單 */}
      <Box flexDirection="column" gap={1} minWidth={24}>
        <Text color="white">選擇要輸出的檔案類型，Enter 執行</Text>
        <Box flexDirection="column">
          {OPTIONS.map((opt, i) => {
            const isSelected = i === selectedIdx;
            const done = exported.has(i);
            return (
              <Box key={i} paddingY={0}>
                <Text
                  color={isSelected ? 'black' : done ? 'green' : 'white'}
                  backgroundColor={isSelected ? 'blueBright' : undefined}
                >
                  {isSelected ? '▶ ' : done ? '✓ ' : '  '}{opt.label}
                </Text>
              </Box>
            );
          })}
        </Box>
        <Text color="white" dimColor>↑↓ 選擇  Enter 輸出</Text>
      </Box>

      {/* 右側：選中項目的詳細說明 */}
      <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} gap={1}>
        <Text bold color="blueBright">{selected.label}</Text>
        <Text color="white">{selected.desc}</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text color="white" bold>輸出檔案：</Text>
          {selected.files.map(f => (
            <Box key={f} flexDirection="column" marginTop={0}>
              <Text color="cyan">  {f}</Text>
              <Text color="white">    {FILE_DESCS[f] ?? ''}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="white">輸出目錄：</Text>
          <Text color="cyan"> {LCP_OUTPUT_DIR}</Text>
        </Box>
        {lastExport && (
          <Box marginTop={1}>
            <Text color="green">✓ 已匯出至 {lastExport}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
