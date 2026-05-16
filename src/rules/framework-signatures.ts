import type { Language, Framework } from '../models/route.js';

export interface FrameworkSignature {
  language: Language;
  framework: Framework;
  filePatterns: RegExp[];     // 符合這些路徑的檔案存在即加分
  contentPatterns: RegExp[];  // 檔案內容含有這些 pattern 即加分
  minScore: number;           // 達到此分數才確認框架
}

export const FRAMEWORK_SIGNATURES: FrameworkSignature[] = [
  {
    language: 'java',
    framework: 'spring-boot',
    filePatterns: [/pom\.xml$/, /build\.gradle$/, /application\.(properties|yml|yaml)$/],
    contentPatterns: [
      /org\.springframework\.boot/,
      /@SpringBootApplication/,
      /spring-boot-starter/,
    ],
    minScore: 1,
  },
  {
    language: 'java',
    framework: 'spring-mvc',
    filePatterns: [/pom\.xml$/, /WEB-INF\/web\.xml$/, /applicationContext\.xml$/],
    contentPatterns: [
      /org\.springframework\.web/,
      /DispatcherServlet/,
      /spring-webmvc/,
    ],
    minScore: 1,
  },
  {
    language: 'java',
    framework: 'jax-rs',
    filePatterns: [/pom\.xml$/],
    contentPatterns: [
      /javax\.ws\.rs/,
      /jakarta\.ws\.rs/,
      /@Path\s*\(/,
      /jersey|resteasy|cxf/i,
    ],
    minScore: 1,
  },
  {
    language: 'csharp',
    framework: 'aspnet-core',
    filePatterns: [/\.csproj$/, /Program\.cs$/, /Startup\.cs$/],
    contentPatterns: [
      /Microsoft\.AspNetCore/,
      /WebApplication\.CreateBuilder/,
      /app\.MapGet|app\.MapPost|app\.UseRouting/,
    ],
    minScore: 1,
  },
  {
    language: 'csharp',
    framework: 'aspnet-mvc',
    filePatterns: [/\.csproj$/, /Web\.config$/],
    contentPatterns: [
      /System\.Web\.Mvc/,
      /Controller\s*:/,
      /RouteConfig/,
    ],
    minScore: 1,
  },
  {
    language: 'php',
    framework: 'laravel',
    filePatterns: [/artisan$/, /composer\.json$/, /routes\/web\.php$/, /routes\/api\.php$/],
    contentPatterns: [
      /laravel\/framework/,
      /Illuminate\\/,
      /Route::(get|post|put|delete|patch|any|match)/,
    ],
    minScore: 1,
  },
];
