#!/usr/bin/env node
// 질문 목록을 OpenAI(웹검색 켠 ChatGPT 계열)에 던져, 답변이 내 사이트를 «인용»하거나 브랜드명을 «언급»하는지 기록한다.
// AI 질문량은 공개되지 않으므로 «얼마나 묻나» 대신 «물으면 내가 나오나»를 잰다. 질문은 네이버 상위 키워드에서 만든다.
// 키: ~/.claude/.env 의 OPENAI_API_KEY
// 사용: node ai-visibility.mjs --site=unitas.kr --brand=유니타스 "질문1" "질문2" … [--model=gpt-5.4-mini] [--out=결과.json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync(path.join(os.homedir(), '.claude/.env'), 'utf8').split('\n')
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')])
);
if (!env.OPENAI_API_KEY) {
  console.error('키 없음 — ~/.claude/.env 에 OPENAI_API_KEY 를 넣는다.');
  process.exit(2);
}

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const questions = args.filter(a => !a.startsWith('--'));
if (!opt.site || !questions.length) {
  console.error('사용: node ai-visibility.mjs --site=도메인 [--brand=이름] "질문1" "질문2" …');
  process.exit(2);
}
const site = opt.site.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
const model = opt.model || 'gpt-5.4-mini';
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

const results = await Promise.all(questions.map(async q => {
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, tools: [{ type: 'web_search' }], input: q }),
  });
  const j = await r.json();
  if (!r.ok) return { q, error: `${r.status} ${j.error?.message || ''}` };
  const parts = j.output.filter(o => o.type === 'message').flatMap(o => o.content);
  const text = parts.map(c => c.text || '').join('\n');
  const hosts = [...new Set(parts.flatMap(c => (c.annotations || []).filter(a => a.type === 'url_citation').map(a => host(a.url))))].filter(Boolean);
  return {
    q, hosts, text,
    cited: hosts.some(h => h === site || h.endsWith('.' + site)),
    mentioned: !!opt.brand && text.includes(opt.brand),
  };
}));

console.log(`\n## AI 답변 노출 — ${model} · 웹검색 · ${site}${opt.brand ? ` / «${opt.brand}»` : ''}`);
console.log('| 질문 | 인용 | 언급 | 인용된 사이트 |\n|---|:-:|:-:|---|');
for (const r of results) {
  if (r.error) { console.log(`| ${r.q} | 실패 | | ${r.error} |`); continue; }
  console.log(`| ${r.q} | ${r.cited ? '✅' : '—'} | ${opt.brand ? (r.mentioned ? '✅' : '—') : ''} | ${r.hosts.join(' · ')} |`);
}
const ok = results.filter(r => !r.error);
const count = {};
for (const r of ok) for (const h of r.hosts) count[h] = (count[h] || 0) + 1;
console.log(`\n인용 ${ok.filter(r => r.cited).length}/${ok.length}` + (opt.brand ? ` · 언급 ${ok.filter(r => r.mentioned).length}/${ok.length}` : ''));
console.log('자주 인용된 사이트: ' + Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([h, n]) => `${h}(${n})`).join(' · '));

if (opt.out) {
  fs.writeFileSync(opt.out, JSON.stringify({ date: new Date().toISOString(), model, site, brand: opt.brand, results }, null, 2));
  console.log(`\n원문 저장: ${opt.out}`);
}
