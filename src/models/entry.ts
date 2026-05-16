export type EntryType = 'form-action' | 'a-href' | 'fetch' | 'axios' | 'jquery-ajax' | 'xhr' | 'img-src' | 'unknown';
export type InvokeType = 'form-submit' | 'link' | 'js-fetch' | 'js-axios' | 'js-jquery' | 'js-xhr' | 'asset' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';

export interface WebEntry {
  entryType: EntryType;
  pagePath: string;
  targetPath: string;
  invokeType: InvokeType;
  sourceFile: string;
  lineNumber: number;
  httpMethod?: string;
  confidence: Confidence;
}
