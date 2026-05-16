export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ANY' | 'UNKNOWN';
export type Language = 'java' | 'csharp' | 'php' | 'unknown';
export type Framework = 'spring-mvc' | 'spring-boot' | 'jax-rs' | 'aspnet-core' | 'aspnet-mvc' | 'laravel' | 'generic-php' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';

export interface Route {
  language: Language;
  framework: Framework;
  httpMethod: HttpMethod;
  path: string;
  sourceFile: string;
  className?: string;
  methodName?: string;
  classLevelPath?: string;
  lineNumber?: number;
  confidence: Confidence;
}
