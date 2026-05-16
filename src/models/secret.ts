export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Confidence = 'high' | 'medium' | 'low';

export interface Secret {
  secretType: string;
  filePath: string;
  lineNumber: number;
  maskedValue: string;
  severity: Severity;
  confidence: Confidence;
  ruleId: string;
  rawValue?: string; // 僅在 redactor 執行前存在，輸出前必須清除
}
