#!/usr/bin/env node
// 구글 광고 API 키워드 플래너(generateKeywordIdeas)로 한국·한국어 기준 연관 키워드와 월평균 검색수를 받는다.
// 최초 1회: node google-keywords.mjs --auth  → 브라우저에서 구글 계정 허용 → refresh token 을 ~/.claude/.env 에 기록
// 사용: node google-keywords.mjs 치과,임플란트 [--top=30] [--filter=정규식]
// 필요: ~/.claude/.env 의 GOOGLE_ADS_CUSTOMER_ID(광고 계정 번호, 하이픈 없이) · GOOGLE_ADS_REFRESH_TOKEN
//       OAuth 클라이언트는 지메일 MCP 용으로 만든 데스크톱 클라이언트(~/.gmail-mcp/gcp-oauth.keys.json)를 같이 쓴다
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';

const envPath = path.join(os.homedir(), '.claude/.env');
const readEnv = () => Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')])
);
const setEnv = (key, val) => {
  let s = fs.readFileSync(envPath, 'utf8');
  s = new RegExp(`^${key}=`, 'm').test(s) ? s.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${val}`) : s.replace(/\n?$/, `\n${key}=${val}\n`);
  fs.writeFileSync(envPath, s);
};
const client = Object.values(JSON.parse(fs.readFileSync(path.join(os.homedir(), '.gmail-mcp/gcp-oauth.keys.json'), 'utf8')))[0];
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));

if ('auth' in opt) {
  // 데스크톱 클라이언트는 루프백 주소로 code 를 받는다
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    const code = u.searchParams.get('code');
    if (!code) { res.end(); return; }
    const redirect = `http://127.0.0.1:${server.address().port}`;
    const t = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({ code, client_id: client.client_id, client_secret: client.client_secret, redirect_uri: redirect, grant_type: 'authorization_code' }),
    }).then(r => r.json());
    if (!t.refresh_token) { res.end('실패 — 터미널을 보세요'); console.error('토큰 실패:', JSON.stringify(t)); process.exit(1); }
    setEnv('GOOGLE_ADS_REFRESH_TOKEN', t.refresh_token);
    res.end('완료 — 이 창을 닫아도 됩니다');
    console.log('refresh token 기록 완료');
    process.exit(0);
  }).listen(0, '127.0.0.1', () => {
    const q = new URLSearchParams({
      client_id: client.client_id, redirect_uri: `http://127.0.0.1:${server.address().port}`, response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords', access_type: 'offline', prompt: 'consent select_account',
    });
    // 기본 브라우저는 구글 로그인이 안 돼 패스키를 요구하므로, 이미 로그인된 크롬으로 연다
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
    execFile('open', ['-a', 'Google Chrome', url], e => e && execFile('open', [url]));
    console.log('크롬에서 구글 계정 허용을 기다리는 중…\n' + url);
  });
} else {
  const env = readEnv();
  const cid = (env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/-/g, '');
  if (!cid || !env.GOOGLE_ADS_REFRESH_TOKEN) {
    console.error(`키 없음 — ${envPath} 에 GOOGLE_ADS_CUSTOMER_ID 를 넣고, node google-keywords.mjs --auth 를 1회 실행한다.`);
    process.exit(2);
  }
  const seeds = (args.find(a => !a.startsWith('--')) || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!seeds.length) { console.error('시드 키워드를 쉼표로 넣는다. 예: node google-keywords.mjs 치과,임플란트'); process.exit(2); }

  const { access_token } = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ client_id: client.client_id, client_secret: client.client_secret, refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  }).then(r => r.json());
  // API 버전은 해마다 올라가 옛 버전이 닫힌다 — 404 가 나면 GOOGLE_ADS_API_VERSION 을 올린다
  const ver = env.GOOGLE_ADS_API_VERSION || 'v24';
  const r = await fetch(`https://googleads.googleapis.com/${ver}/customers/${cid}:generateKeywordIdeas`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', ...(env.GOOGLE_ADS_DEVELOPER_TOKEN ? { 'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN } : {}), ...(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? { 'login-customer-id': env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, '') } : {}) },
    // 1012 = 한국어, 2410 = 대한민국
    body: JSON.stringify({ language: 'languageConstants/1012', geoTargetConstants: ['geoTargetConstants/2410'], keywordPlanNetwork: 'GOOGLE_SEARCH', keywordSeed: { keywords: seeds } }),
  });
  if (!r.ok) { console.error(`API 실패 ${r.status}: ${(await r.text()).slice(0, 800)}`); process.exit(1); }
  const top = Number(opt.top || 30);
  const rows = ((await r.json()).results || []).map(x => ({
    keyword: x.text,
    total: Number(x.keywordIdeaMetrics?.avgMonthlySearches || 0),
    comp: { LOW: '낮음', MEDIUM: '중간', HIGH: '높음' }[x.keywordIdeaMetrics?.competition] || '—',
  })).filter(x => !opt.filter || new RegExp(opt.filter, 'i').test(x.keyword)).sort((a, b) => b.total - a.total);
  console.log(`\n## 구글 검색량 상위 ${top} (한국·한국어, 월평균)`);
  console.log('| 키워드 | 월평균 | 경쟁 |\n|---|---:|---|');
  for (const x of rows.slice(0, top)) console.log(`| ${x.keyword} | ${x.total} | ${x.comp} |`);
}
