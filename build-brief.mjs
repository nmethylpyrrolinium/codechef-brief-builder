import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const cwd = process.cwd();
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const checkOnly = process.argv.includes('--check');
const briefKey = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || '2025_26';
const allowedBriefs = new Set(['2025_26', '2024_25']);

if (!allowedBriefs.has(briefKey)) {
  throw new Error(`Unsupported brief key "${briefKey}". Use "2025_26" or "2024_25".`);
}

const baseName = `codechef_zhcet_faculty_brief_${briefKey}`;
const markdownPath = path.join(cwd, `${baseName}.md`);
const htmlPath = path.join(cwd, `${baseName}.html`);
const pdfPath = path.join(cwd, `${baseName}.pdf`);

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, 'utf8');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(raw) {
  const tokens = [];
  let text = raw.trim();

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
    const token = `@@LINK_${tokens.length}@@`;
    tokens.push(`<a href="${url}">${escapeHtml(label)}</a>`);
    return token;
  });

  text = escapeHtml(text);
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  for (let i = 0; i < tokens.length; i += 1) {
    text = text.replace(new RegExp(`@@LINK_${i}@@`, 'g'), tokens[i]);
  }

  return text;
}

function isHeading(line) {
  return /^#{2,6}\s+/.test(line);
}

function isBullet(line) {
  return /^\s*-\s+/.test(line);
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableDivider(line) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function parseDocument(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  if (!titleLine) {
    throw new Error('Missing top-level title. Expected a line starting with "# ".');
  }

  const title = titleLine.replace(/^#\s+/, '').trim();
  const titleIndex = lines.indexOf(titleLine);
  const firstSectionIndex = lines.findIndex((line, index) => index > titleIndex && /^##\s+/.test(line));
  if (firstSectionIndex === -1) {
    throw new Error('Missing section headings. Expected at least one "##" heading.');
  }

  const preamble = lines.slice(titleIndex + 1, firstSectionIndex);
  const bodyLines = lines.slice(firstSectionIndex);
  const blocks = [];

  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (isHeading(trimmed)) {
      const level = trimmed.match(/^(#+)/)[1].length;
      blocks.push({
        type: 'heading',
        level,
        text: trimmed.replace(/^#{2,6}\s+/, '')
      });
      continue;
    }

    if (isTableRow(trimmed)) {
      const tableLines = [trimmed];
      let j = i + 1;
      while (j < bodyLines.length && isTableRow(bodyLines[j].trim())) {
        tableLines.push(bodyLines[j].trim());
        j += 1;
      }
      i = j - 1;

      const rows = tableLines.map((row) => row.slice(1, -1).split('|').map((cell) => cell.trim()));
      const header = rows[0];
      const body = rows.length > 1 && isTableDivider(tableLines[1]) ? rows.slice(2) : rows.slice(1);
      blocks.push({ type: 'table', header, rows: body });
      continue;
    }

    if (isBullet(trimmed)) {
      const items = [trimmed.replace(/^\s*-\s+/, '')];
      let j = i + 1;
      while (j < bodyLines.length && isBullet(bodyLines[j])) {
        items.push(bodyLines[j].replace(/^\s*-\s+/, ''));
        j += 1;
      }
      i = j - 1;
      blocks.push({ type: 'list', items });
      continue;
    }

    const paragraphLines = [trimmed];
    let j = i + 1;
    while (j < bodyLines.length) {
      const next = bodyLines[j];
      const nextTrimmed = next.trim();
      if (!nextTrimmed || isHeading(nextTrimmed) || isBullet(next) || isTableRow(nextTrimmed)) {
        break;
      }
      paragraphLines.push(nextTrimmed);
      j += 1;
    }
    i = j - 1;
    blocks.push({ type: 'paragraph', lines: paragraphLines });
  }

  return { title, preamble, blocks };
}

function findPreambleValue(preambleLines, label) {
  const pattern = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`);
  for (const line of preambleLines) {
    const match = line.trim().match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return '';
}

function parseTitleMeta(title, blocks) {
  const chapterMatch = title.match(/by (.+?) in Academic Year/i);
  const reportingMatch = title.match(/(Academic Year\s+[0-9-]+)/i);
  const eventCount = blocks.filter((block) => block.type === 'heading' && block.level === 3).length;

  return {
    chapter: chapterMatch ? chapterMatch[1].trim() : 'CodeChef ZHCET Chapter',
    reportingPeriod: reportingMatch ? reportingMatch[1].trim() : 'Academic Year 2025-26',
    totalEvents: String(eventCount || 0)
  };
}

function parseLabeledParagraph(block) {
  if (block.type !== 'paragraph' || !block.lines.length) {
    return null;
  }

  const first = block.lines[0];
  const match = first.match(/^\*\*(.+?):\*\*\s*(.*)$/);
  if (!match) {
    return null;
  }

  const label = match[1].trim();
  const rest = match[2].trim();
  const valueLines = rest ? [rest, ...block.lines.slice(1)] : block.lines.slice(1);
  return {
    label,
    valueHtml: renderInline(valueLines.join(' '))
  };
}

function renderMetadataTable(document) {
  const advisor = findPreambleValue(document.preamble, 'Faculty Advisor');
  const meta = parseTitleMeta(document.title, document.blocks);
  const rows = [
    ['Faculty Advisor', advisor || ''],
    ['Chapter', meta.chapter],
    ['Reporting Period', meta.reportingPeriod],
    ['Total Events Conducted', meta.totalEvents]
  ];

  return [
    '<table class="meta" aria-label="document metadata">',
    ...rows.map(([label, value]) => `  <tr><td class="label">${escapeHtml(label)}</td><td>${renderInline(value)}</td></tr>`),
    '</table>'
  ].join('\n');
}

function renderTable(block, extraClass = '') {
  const klass = extraClass ? ` class="${extraClass}"` : '';
  const headHtml = block.header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
  const bodyHtml = block.rows.map((row) => (
    `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`
  )).join('\n');

  return [
    `<table${klass}>`,
    `  <thead><tr>${headHtml}</tr></thead>`,
    `  <tbody>${bodyHtml}</tbody>`,
    '</table>'
  ].join('\n');
}

function renderParagraph(block) {
  return `<p>${block.lines.map((line) => renderInline(line)).join('<br>')}</p>`;
}

function renderDocumentBody(blocks) {
  const parts = [];
  let inSection = false;
  let currentSection = '';
  let inEvent = false;
  let pendingFacts = null;

  function flushFacts() {
    if (!pendingFacts?.length) {
      return;
    }

    parts.push('<div class="facts">');
    for (const fact of pendingFacts) {
      parts.push(`<p><span class="label">${escapeHtml(fact.label)}:</span> ${fact.valueHtml}</p>`);
    }
    parts.push('</div>');
    pendingFacts = null;
  }

  function closeEvent() {
    flushFacts();
    if (inEvent) {
      parts.push('</article>');
      inEvent = false;
    }
  }

  function closeSection() {
    closeEvent();
    if (inSection) {
      parts.push('</section>');
      inSection = false;
    }
  }

  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 2) {
      closeSection();
      currentSection = block.text;
      inSection = true;
      parts.push('<section>');
      parts.push(`<h2>${renderInline(block.text)}</h2>`);
      continue;
    }

    if (block.type === 'heading' && block.level === 3 && currentSection === 'Detailed Event Notes') {
      closeEvent();
      inEvent = true;
      pendingFacts = [];
      parts.push('<article class="event">');
      parts.push(`<h3>${renderInline(block.text)}</h3>`);
      continue;
    }

    const labeled = parseLabeledParagraph(block);
    if (inEvent && labeled && ['Date', 'Type', 'Audience'].includes(labeled.label)) {
      pendingFacts ??= [];
      pendingFacts.push(labeled);
      continue;
    }

    flushFacts();

    if (block.type === 'paragraph') {
      if (inEvent && labeled) {
        parts.push(`<p><span class="label">${escapeHtml(labeled.label)}:</span> ${labeled.valueHtml}</p>`);
      } else {
        parts.push(renderParagraph(block));
      }
      continue;
    }

    if (block.type === 'table') {
      const tableClass = currentSection === 'Summary of Events' ? 'summary-table' : 'summary-table';
      parts.push(renderTable(block, tableClass));
      continue;
    }

    if (block.type === 'list') {
      const klass = currentSection === 'Office Bearers' ? ' class="bearers"' : '';
      const items = block.items.map((item) => `  <li>${renderInline(item)}</li>`).join('\n');
      parts.push(`<ul${klass}>\n${items}\n</ul>`);
      continue;
    }
  }

  closeSection();
  return parts.join('\n      ');
}

function renderHtml(document) {
  const bodyHtml = renderDocumentBody(document.blocks);
  const metadataHtml = renderMetadataTable(document);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 0.72in;
    }

    :root {
      --ink: #1f2933;
      --muted: #52606d;
      --heading: #102a43;
      --accent: #d9e2ec;
      --rule: #bcccdc;
      --paper: #ffffff;
      --bg: #eef2f6;
      --table-head: #f5f7fa;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--ink);
    }

    body {
      font-family: Calibri, "Aptos", Arial, sans-serif;
      font-size: 11.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      background: var(--paper);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
      padding: 0;
    }

    .document {
      padding: 0.1in 0 0;
    }

    header {
      margin-bottom: 24px;
    }

    .title {
      margin: 0 0 8px;
      font-family: Cambria, Georgia, "Times New Roman", serif;
      font-size: 21pt;
      line-height: 1.25;
      color: var(--heading);
      font-weight: 700;
      text-align: center;
    }

    .subtitle {
      margin: 0;
      text-align: center;
      color: var(--muted);
      font-size: 10.5pt;
    }

    .meta {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      font-size: 10.8pt;
    }

    .meta td {
      border: 1px solid var(--rule);
      padding: 8px 10px;
      vertical-align: top;
    }

    .meta .label {
      width: 180px;
      font-weight: 700;
      color: var(--heading);
      background: #fafbfd;
    }

    section {
      margin-bottom: 22px;
    }

    h2 {
      margin: 0 0 10px;
      padding-bottom: 6px;
      border-bottom: 1.5px solid var(--rule);
      font-family: Cambria, Georgia, "Times New Roman", serif;
      font-size: 14pt;
      color: var(--heading);
    }

    p {
      margin: 0 0 10px;
      text-align: justify;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.4pt;
      margin-bottom: 10px;
    }

    .summary-table th,
    .summary-table td {
      border: 1px solid var(--rule);
      padding: 9px 10px;
      vertical-align: top;
      text-align: left;
    }

    .summary-table th {
      background: var(--table-head);
      color: var(--heading);
      font-weight: 700;
    }

    .event {
      margin-bottom: 18px;
      padding: 0 0 6px;
    }

    .event:last-child {
      margin-bottom: 0;
    }

    .event h3 {
      margin: 0 0 8px;
      font-family: Cambria, Georgia, "Times New Roman", serif;
      font-size: 12.5pt;
      color: var(--heading);
    }

    .facts {
      margin: 0 0 10px;
      padding: 10px 12px;
      background: #fbfcfe;
      border: 1px solid var(--accent);
    }

    .facts p {
      margin: 0 0 6px;
      text-align: left;
    }

    .facts p:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 700;
      color: var(--heading);
    }

    ul {
      margin: 8px 0 0 20px;
      padding: 0;
    }

    li {
      margin: 0 0 6px;
    }

    .bearers {
      columns: 2;
      column-gap: 28px;
    }

    .bearers li {
      break-inside: avoid;
    }

    a {
      color: #0c4a7a;
      text-decoration: none;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 0.95em;
    }

    @media print {
      html, body {
        background: var(--paper);
      }

      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        box-shadow: none;
      }

      .document {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <main class="document">
      <header>
        <h1 class="title">${renderInline(document.title)}</h1>
        ${metadataHtml}
      </header>
      ${bodyHtml}
    </main>
  </div>
</body>
</html>`;
}

function exportPdf() {
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome binary not found: ${chromePath}`);
  }

  execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--print-to-pdf-no-header',
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`
  ], { stdio: 'inherit' });
}

function main() {
  const document = parseDocument(readText(markdownPath));
  const html = renderHtml(document);
  writeText(htmlPath, html);

  if (checkOnly) {
    console.log(`check: ${path.basename(markdownPath)} parsed and HTML regenerated.`);
    return;
  }

  exportPdf();
  console.log(`build: wrote ${path.basename(htmlPath)} and ${path.basename(pdfPath)}`);
}

main();
