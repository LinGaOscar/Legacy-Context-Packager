import path from 'path';
import type { ProjectScanResult } from '../models/context-pack.js';

// HTML 屬性/文字安全逸出，防止 XSS
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

// JSON 嵌入時需逸出 </script> 避免注入
function safeJson(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');
}

export function buildReportHtml(result: ProjectScanResult): string {
  const name = path.basename(result.projectInfo.rootPath);
  const p = result.projectInfo;
  const critCount = result.secrets.filter(s => s.severity === 'critical').length;
  const scanDate = new Date().toLocaleString('zh-TW');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LCP — ${esc(name)}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="brand">Legacy Context Packager</div>
  <div class="project-name">${esc(name)}</div>
  <div class="meta">
    <span class="pill pill-lang">${esc(p.language)}</span>
    <span class="pill pill-fw">${esc(p.framework)}</span>
    <span class="meta-text">${p.totalFiles} files &nbsp;·&nbsp; ${p.scanDurationMs}ms &nbsp;·&nbsp; ${esc(scanDate)}</span>
  </div>
</header>

<nav class="tabs" id="tabs">
  <button class="tab active" data-tab="routes">Routes <span class="cnt">${result.routes.length}</span></button>
  <button class="tab" data-tab="secrets">Secrets <span class="cnt${critCount > 0 ? ' cnt-danger' : ''}">${result.secrets.length}</span></button>
  <button class="tab" data-tab="entries">Web Entries <span class="cnt">${result.webEntries.length}</span></button>
  <button class="tab" data-tab="deps">Dependencies</button>
  <button class="tab" data-tab="openapi">OpenAPI-lite</button>
</nav>

<main>
  <!-- Routes -->
  <div id="routes" class="panel active">
    <div class="toolbar">
      <input class="search" id="r-search" placeholder="搜尋 path / handler...">
      <div class="filter-group" id="r-method-filters">
        <button class="fb active" data-v="ALL">All</button>
        <button class="fb get" data-v="GET">GET</button>
        <button class="fb post" data-v="POST">POST</button>
        <button class="fb put" data-v="PUT">PUT</button>
        <button class="fb del" data-v="DELETE">DELETE</button>
        <button class="fb patch" data-v="PATCH">PATCH</button>
      </div>
      <div class="filter-group" id="r-conf-filters">
        <button class="fb active" data-v="ALL">All conf.</button>
        <button class="fb" data-v="high">High</button>
        <button class="fb" data-v="medium">Med</button>
        <button class="fb" data-v="low">Low</button>
      </div>
      <button class="btn-export" id="btn-export-md">⬇ Export MD</button>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Handler</th><th>Confidence</th><th>Source</th></tr></thead>
        <tbody id="r-body"></tbody>
      </table>
    </div>
  </div>

  <!-- Secrets -->
  <div id="secrets" class="panel">
    <div class="toolbar">
      <input class="search" id="s-search" placeholder="搜尋 file / type...">
      <div class="filter-group" id="s-sev-filters">
        <button class="fb active" data-v="ALL">All</button>
        <button class="fb sev-crit" data-v="critical">Critical</button>
        <button class="fb sev-high" data-v="high">High</button>
        <button class="fb sev-med" data-v="medium">Medium</button>
        <button class="fb sev-low" data-v="low">Low</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Severity</th><th>Type</th><th>File</th><th>Line</th><th>Masked Value</th><th>Confidence</th></tr></thead>
        <tbody id="s-body"></tbody>
      </table>
    </div>
  </div>

  <!-- Web Entries -->
  <div id="entries" class="panel">
    <div class="toolbar">
      <input class="search" id="e-search" placeholder="搜尋 target / source...">
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Type</th><th>Source File</th><th>Target Path</th><th>Invoke</th></tr></thead>
        <tbody id="e-body"></tbody>
      </table>
    </div>
  </div>

  <!-- Dependencies -->
  <div id="deps" class="panel">
    <div id="deps-content"></div>
  </div>

  <!-- OpenAPI-lite -->
  <div id="openapi" class="panel">
    <p class="note">⚠️ 靜態分析近似結果，不等同完整 OpenAPI spec。動態路由與反射無法靜態推斷。</p>
    <div id="openapi-groups"></div>
  </div>
</main>

<script>
var LCP = ${safeJson(result)};
${JS}
</script>
</body>
</html>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font:14px/1.5 system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}
a{color:#3b82f6}

/* Header */
header{background:#0f172a;color:#f1f5f9;padding:14px 24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:sticky;top:0;z-index:20}
.brand{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#60a5fa;white-space:nowrap}
.project-name{font-size:18px;font-weight:700;white-space:nowrap}
.meta{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.meta-text{font-size:12px;color:#94a3b8}
.pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;text-transform:uppercase}
.pill-lang{background:#1e3a5f;color:#93c5fd}
.pill-fw{background:#1a3a1a;color:#86efac}

/* Tabs */
.tabs{background:#fff;border-bottom:1px solid #e2e8f0;display:flex;padding:0 20px;position:sticky;top:57px;z-index:10;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow-x:auto}
.tab{background:none;border:none;padding:11px 16px;cursor:pointer;font:13px/1 system-ui;color:#64748b;border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;display:flex;align-items:center;gap:6px}
.tab:hover{color:#1e293b}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6;font-weight:600}
.cnt{background:#e2e8f0;color:#475569;font-size:11px;padding:1px 7px;border-radius:99px;font-weight:700}
.cnt-danger{background:#fee2e2;color:#dc2626}

/* Panel */
.panel{display:none;padding:20px 24px}
.panel.active{display:block}

/* Toolbar */
.toolbar{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
.search{flex:1;min-width:180px;padding:7px 11px;border:1px solid #e2e8f0;border-radius:6px;font:13px system-ui;outline:none;background:#fff}
.search:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.2)}
.filter-group{display:flex;gap:4px;flex-wrap:wrap}
.fb{padding:5px 11px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;font:12px system-ui;color:#64748b;transition:all .15s}
.fb:hover{background:#f8fafc}
.fb.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
.fb.get.active{background:#16a34a;border-color:#16a34a}
.fb.post.active{background:#2563eb;border-color:#2563eb}
.fb.put.active{background:#d97706;border-color:#d97706}
.fb.del.active{background:#dc2626;border-color:#dc2626}
.fb.patch.active{background:#7c3aed;border-color:#7c3aed}
.fb.sev-crit.active{background:#dc2626;border-color:#dc2626}
.fb.sev-high.active{background:#ea580c;border-color:#ea580c}
.fb.sev-med.active{background:#ca8a04;border-color:#ca8a04}
.fb.sev-low.active{background:#16a34a;border-color:#16a34a}
.btn-export{padding:6px 14px;background:#0f172a;color:#f1f5f9;border:none;border-radius:6px;cursor:pointer;font:13px system-ui;font-weight:500;white-space:nowrap;margin-left:auto}
.btn-export:hover{background:#1e293b}

/* Table */
.tbl-wrap{overflow-x:auto;border-radius:8px;border:1px solid #e2e8f0;background:#fff}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:9px 14px;text-align:left;border-bottom:1px solid #e2e8f0;white-space:nowrap}
td{padding:9px 14px;border-bottom:1px solid #f1f5f9;vertical-align:middle;font-size:13px}
tr:last-child td{border-bottom:none}
tbody tr:hover td{background:#fafafa}
.empty-row td{text-align:center;color:#94a3b8;padding:36px;font-size:13px}
code{font:12px/1.5 'Fira Code','Cascadia Code','SF Mono',monospace;background:#f1f5f9;padding:1px 5px;border-radius:3px;color:#0f172a}

/* Badges */
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.m-GET{background:#dcfce7;color:#15803d}
.m-POST{background:#dbeafe;color:#1d4ed8}
.m-PUT{background:#ffedd5;color:#c2410c}
.m-DELETE{background:#fee2e2;color:#b91c1c}
.m-PATCH{background:#ede9fe;color:#6d28d9}
.m-ANY,.m-UNKNOWN{background:#f1f5f9;color:#475569}
.sv-critical{background:#fee2e2;color:#b91c1c}
.sv-high{background:#ffedd5;color:#c2410c}
.sv-medium{background:#fef9c3;color:#854d0e}
.sv-low{background:#dcfce7;color:#15803d}
.cf-high{color:#15803d;font-weight:600}
.cf-medium{color:#854d0e}
.cf-low{color:#b91c1c}

/* Dependencies */
.dep-section{margin-bottom:24px}
.dep-section h3{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:8px}
.dep-list{list-style:none;display:flex;flex-direction:column;gap:4px}
.dep-list li{font:12px/1.5 'Fira Code','Cascadia Code',monospace;padding:6px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;color:#334155}
.dep-arrow{color:#94a3b8;margin:0 6px}
.stat-grid{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.stat-card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 18px;min-width:120px}
.stat-val{font-size:28px;font-weight:800;color:#3b82f6;line-height:1}
.stat-lbl{font-size:11px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:.05em}

/* OpenAPI */
.ctrl-group{background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;overflow:hidden}
.ctrl-header{padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px}
.base-path{font:12px/1 monospace;background:#e2e8f0;padding:2px 7px;border-radius:4px;color:#475569}
.ctrl-ops{padding:8px 0}
.ctrl-op{display:flex;align-items:center;gap:10px;padding:6px 16px;font-size:13px}
.ctrl-op:hover{background:#f8fafc}
.op-path{font:12px monospace;color:#0f172a;flex:1}
.op-handler{font-size:12px;color:#64748b}

.note{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;font-size:13px;color:#92400e;margin-bottom:16px}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:#f1f5f9}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
`;

// ── Embedded Browser JS ───────────────────────────────────────────────────────
// 使用 var / function 而非 const/let，相容性最佳；避免 template literal 逸出問題
const JS = `
(function() {
  var R = LCP;

  // ── Tab 切換 ─────────────────────────────
  document.getElementById('tabs').addEventListener('click', function(ev) {
    var btn = ev.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });

  // ── 工具函式 ─────────────────────────────
  function h(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function bname(p) { return (p||'').split(/[\\/]/).pop(); }

  // ── Routes ───────────────────────────────
  var rState = { search: '', method: 'ALL', conf: 'ALL' };

  function filteredRoutes() {
    return R.routes.filter(function(r) {
      var q = (rState.search||'').toLowerCase();
      var hit = !q || (r.path+' '+(r.className||'')+' '+(r.methodName||'')).toLowerCase().indexOf(q) >= 0;
      return hit &&
        (rState.method === 'ALL' || r.httpMethod === rState.method) &&
        (rState.conf   === 'ALL' || r.confidence  === rState.conf);
    });
  }

  function renderRoutes() {
    var rows = filteredRoutes();
    var tb = document.getElementById('r-body');
    if (!rows.length) { tb.innerHTML = '<tr class="empty-row"><td colspan="5">No routes match the filter.</td></tr>'; return; }
    tb.innerHTML = rows.map(function(r) {
      var handler = r.className ? (h(r.className) + '#' + h(r.methodName||'')) : '-';
      return '<tr>' +
        '<td><span class="badge m-'+h(r.httpMethod)+'">'+h(r.httpMethod)+'</span></td>' +
        '<td><code>'+h(r.path)+'</code></td>' +
        '<td>'+handler+'</td>' +
        '<td><span class="cf-'+h(r.confidence)+'">'+h(r.confidence)+'</span></td>' +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+h(r.sourceFile)+'">'+h(bname(r.sourceFile))+(r.lineNumber?':'+r.lineNumber:'')+'</td>' +
        '</tr>';
    }).join('');
  }

  document.getElementById('r-search').addEventListener('input', function(e) {
    rState.search = e.target.value; renderRoutes();
  });

  wireFilters('r-method-filters', function(v){ rState.method = v; renderRoutes(); });
  wireFilters('r-conf-filters',   function(v){ rState.conf   = v; renderRoutes(); });

  // ── Secrets ──────────────────────────────
  var sState = { search: '', sev: 'ALL' };

  function filteredSecrets() {
    return R.secrets.filter(function(s) {
      var q = (sState.search||'').toLowerCase();
      var hit = !q || (s.secretType+' '+s.filePath).toLowerCase().indexOf(q) >= 0;
      return hit && (sState.sev === 'ALL' || s.severity === sState.sev);
    });
  }

  function renderSecrets() {
    var rows = filteredSecrets();
    var tb = document.getElementById('s-body');
    if (!rows.length) { tb.innerHTML = '<tr class="empty-row"><td colspan="6">No secrets match the filter.</td></tr>'; return; }
    tb.innerHTML = rows.map(function(s) {
      return '<tr>' +
        '<td><span class="badge sv-'+h(s.severity)+'">'+h(s.severity)+'</span></td>' +
        '<td>'+h(s.secretType)+'</td>' +
        '<td title="'+h(s.filePath)+'"><code>'+h(bname(s.filePath))+'</code></td>' +
        '<td>'+h(s.lineNumber)+'</td>' +
        '<td><code>'+h(s.maskedValue)+'</code></td>' +
        '<td><span class="cf-'+h(s.confidence)+'">'+h(s.confidence)+'</span></td>' +
        '</tr>';
    }).join('');
  }

  document.getElementById('s-search').addEventListener('input', function(e) {
    sState.search = e.target.value; renderSecrets();
  });

  wireFilters('s-sev-filters', function(v){ sState.sev = v; renderSecrets(); });

  // ── Web Entries ───────────────────────────
  var eState = { search: '' };

  function filteredEntries() {
    var q = (eState.search||'').toLowerCase();
    return q ? R.webEntries.filter(function(e){
      return (e.targetPath+' '+e.sourceFile).toLowerCase().indexOf(q) >= 0;
    }) : R.webEntries;
  }

  function renderEntries() {
    var rows = filteredEntries();
    var tb = document.getElementById('e-body');
    if (!rows.length) { tb.innerHTML = '<tr class="empty-row"><td colspan="4">No web entries found.</td></tr>'; return; }
    tb.innerHTML = rows.map(function(e) {
      return '<tr>' +
        '<td>'+h(e.entryType)+'</td>' +
        '<td title="'+h(e.sourceFile)+'"><code>'+h(bname(e.sourceFile))+'</code>:'+h(e.lineNumber)+'</td>' +
        '<td><code>'+h(e.targetPath)+'</code></td>' +
        '<td>'+h(e.invokeType)+'</td>' +
        '</tr>';
    }).join('');
  }

  document.getElementById('e-search').addEventListener('input', function(ev) {
    eState.search = ev.target.value; renderEntries();
  });

  // ── Dependencies ──────────────────────────
  function renderDeps() {
    var dm = R.dependencyMap;
    var html = '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-val">'+dm.configFiles.length+'</div><div class="stat-lbl">Config Files</div></div>' +
      '<div class="stat-card"><div class="stat-val">'+dm.edges.length+'</div><div class="stat-lbl">Dep Edges</div></div>' +
      '<div class="stat-card"><div class="stat-val">'+dm.nodes.length+'</div><div class="stat-lbl">Nodes</div></div>' +
      '</div>';

    if (dm.configFiles.length) {
      html += '<div class="dep-section"><h3>Config Files</h3><ul class="dep-list">';
      dm.configFiles.forEach(function(f){ html += '<li>'+h(f)+'</li>'; });
      html += '</ul></div>';
    }

    var fileEdges = dm.edges.filter(function(e){ return e.relationType === 'file-to-file'; });
    if (fileEdges.length) {
      html += '<div class="dep-section"><h3>Internal Imports (top 50)</h3><ul class="dep-list">';
      fileEdges.slice(0,50).forEach(function(e){
        html += '<li><span>'+h(e.from)+'</span><span class="dep-arrow">→</span><span>'+h(e.to)+'</span></li>';
      });
      html += '</ul></div>';
    }

    document.getElementById('deps-content').innerHTML = html;
  }

  // ── OpenAPI-lite ──────────────────────────
  function renderOpenApi() {
    var oa = R.openApiLite;
    var groups = {};
    oa.operations.forEach(function(op) {
      var tag = (op.tags && op.tags[0]) || 'General';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(op);
    });

    var ctrl = (oa.controllerGroups || []);
    var baseMap = {};
    ctrl.forEach(function(g){ baseMap[g.controller] = g.basePath; });

    var html = Object.keys(groups).sort().map(function(tag) {
      var ops = groups[tag];
      var basePath = baseMap[tag] ? '<span class="base-path">'+h(baseMap[tag])+'</span>' : '';
      var rows = ops.map(function(op){
        var params = (op.pathParams||[]).map(function(p){ return '<span class="badge m-ANY">{'+h(p)+'}</span>'; }).join(' ');
        return '<div class="ctrl-op">' +
          '<span class="badge m-'+h(op.method)+'">'+h(op.method)+'</span>' +
          '<span class="op-path">'+h(op.path)+'</span>' +
          (params ? '<span>'+params+'</span>' : '') +
          (op.handler ? '<span class="op-handler">'+h(op.handler)+'</span>' : '') +
          '</div>';
      }).join('');
      return '<div class="ctrl-group"><div class="ctrl-header">'+h(tag)+' '+basePath+'</div><div class="ctrl-ops">'+rows+'</div></div>';
    }).join('');

    document.getElementById('openapi-groups').innerHTML = html || '<p style="color:#94a3b8">No routes found.</p>';
  }

  // ── Export Markdown ───────────────────────
  document.getElementById('btn-export-md').addEventListener('click', function() {
    var p = R.projectInfo;
    var name = p.rootPath.split('/').pop().split('\\\\').pop();
    var lines = [
      '# LCP Report — ' + name,
      '',
      '**Language:** ' + p.language + ' | **Framework:** ' + p.framework + ' | **Routes:** ' + R.routes.length + ' | **Secrets:** ' + R.secrets.length,
      '',
      '## Routes',
      '',
      '| Method | Path | Handler | Confidence |',
      '|--------|------|---------|------------|',
    ];
    R.routes.forEach(function(r){
      lines.push('| ' + r.httpMethod + ' | \x60' + r.path + '\x60 | ' + (r.className||'-') + '#' + (r.methodName||'-') + ' | ' + r.confidence + ' |');
    });
    lines.push('', '## Secrets', '');
    if (!R.secrets.length) {
      lines.push('_No secrets detected._');
    } else {
      lines.push('| Severity | Type | File | Line | Masked |', '|----------|------|------|------|--------|');
      R.secrets.forEach(function(s){
        lines.push('| ' + s.severity + ' | ' + s.secretType + ' | ' + bname(s.filePath) + ' | ' + s.lineNumber + ' | \x60' + s.maskedValue + '\x60 |');
      });
    }
    lines.push('', '---', '_Generated by Legacy Context Packager_');
    var blob = new Blob([lines.join('\\n')], {type:'text/markdown'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'lcp-report.md'; a.click();
    URL.revokeObjectURL(url);
  });

  // ── 工具：filter group ────────────────────
  function wireFilters(groupId, onChange) {
    var group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('click', function(ev) {
      var btn = ev.target.closest('.fb');
      if (!btn) return;
      group.querySelectorAll('.fb').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      onChange(btn.dataset.v);
    });
  }

  // ── 初始化 ────────────────────────────────
  renderRoutes();
  renderSecrets();
  renderEntries();
  renderDeps();
  renderOpenApi();
})();
`;
