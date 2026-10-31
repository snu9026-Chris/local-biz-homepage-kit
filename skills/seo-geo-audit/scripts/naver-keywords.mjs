#!/usr/bin/env node
// 네이버 검색광고 «키워드 도구» API 로 시드 키워드의 연관 키워드·월간 검색수·경쟁정도를 받아 표로 정렬하고,
// 데이터랩 검색어 트렌드 API 로 상위 5개의 12개월 추세를 붙인다.
// 키는 ~/.claude/.env — 검색광고: NAVER_AD_API_KEY · NAVER_AD_SECRET_KEY · NAVER_AD_CUSTOMER_ID
//                      데이터랩: NAVER_CLIENT_ID · NAVER_CLIENT_SECRET (없으면 추세만 생략)
// 사용: node naver-keywords.mjs 치과,임플란트 [--top=30] [--filter=치과|임플란트] [--out=결과.csv]
//   --filter: 연관어에 업종 무관 단어(소아과·독감 등)가 섞여 오므로 정규식에 맞는 것만 남긴다
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const envPath = path.join(os.homedir(), '.claude/.env');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')])
);
const { NAVER_AD_API_KEY: KEY, NAVER_AD_SECRET_KEY: SECRET, NAVER_AD_CUSTOMER_ID: CUSTOMER } = env;
if (!KEY || !SECRET || !CUSTOMER) {
  console.error(`키 없음 — ${envPath} 에 NAVER_AD_API_KEY · NAVER_AD_SECRET_KEY · NAVER_AD_CUSTOMER_ID 를 넣는다.`);
  process.exit(2);
}

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
// API 가 공백 포함 키워드를 400 으로 거부하고, 한 번에 시드 5개까지만 받는다
const seeds = (args.find(a => !a.startsWith('--')) || '').split(',').map(s => s.replace(/\s+/g, '')).filter(Boolean);
if (!seeds.length || seeds.length > 5) {
  console.error('시드 키워드 1~5개를 쉼표로 넣는다. 예: node naver-keywords.mjs 치과,임플란트');
  process.exit(2);
}
const top = Number(opt.top || 30);

const uri = '/keywordstool';
const ts = String(Date.now());
const sig = crypto.createHmac('sha256', SECRET).update(`${ts}.GET.${uri}`).digest('base64');
const qs = new URLSearchParams({ hintKeywords: seeds.join(','), showDetail: '1' });
const res = await fetch(`https://api.searchad.naver.com${uri}?${qs}`, {
  headers: { 'X-Timestamp': ts, 'X-API-KEY': KEY, 'X-Customer': CUSTOMER, 'X-Signature': sig },
});
if (!res.ok) {
  console.error(`API 실패 ${res.status}: ${await res.text()}`);
  process.exit(1);
}

// 검색수가 10 미만이면 숫자 대신 "< 10" 문자열이 온다
const num = v => (typeof v === 'number' ? v : 5);
const rows = (await res.json()).keywordList.map(k => ({
  keyword: k.relKeyword,
  pc: num(k.monthlyPcQcCnt),
  mobile: num(k.monthlyMobileQcCnt),
  total: num(k.monthlyPcQcCnt) + num(k.monthlyMobileQcCnt),
  comp: k.compIdx,
})).filter(r => !opt.filter || new RegExp(opt.filter, 'i').test(r.keyword))
  .sort((a, b) => b.total - a.total);

const show = (title, list) => {
  console.log(`\n## ${title}`);
  console.log('| 키워드 | 월간 합계 | PC | 모바일 | 경쟁 |\n|---|---:|---:|---:|---|');
  for (const r of list) console.log(`| ${r.keyword} | ${r.total} | ${r.pc} | ${r.mobile} | ${r.comp} |`);
};
show(`검색량 상위 ${top}`, rows.slice(0, top));
show('공략 후보 — 경쟁 «높음» 제외 · 월 100회 이상', rows.filter(r => r.comp !== '높음' && r.total >= 100).slice(0, top));

// 데이터랩 검색어 트렌드 — 상위 5개 키워드의 최근 12개월 추세 (키가 있을 때만)
const { NAVER_CLIENT_ID: CID, NAVER_CLIENT_SECRET: CSECRET } = env;
if (CID && CSECRET) {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  // toISOString 은 UTC 라 한국 시간 1일 0시가 전날로 밀려 한 달이 더 붙는다 — 현지 날짜로 만든다
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // 2026-07-31부터 신규 키는 개발자센터가 아니라 NAVER API HUB(네이버 클라우드)에서만 발급된다
  const r = await fetch('https://naverapihub.apigw.ntruss.com/search-trend/v1/search', {
    method: 'POST',
    headers: { 'X-NCP-APIGW-API-KEY-ID': CID, 'X-NCP-APIGW-API-KEY': CSECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: ymd(start), endDate: ymd(end), timeUnit: 'month',
      keywordGroups: rows.slice(0, 5).map(x => ({ groupName: x.keyword, keywords: [x.keyword] })),
    }),
  });
  if (!r.ok) console.error(`\n데이터랩 실패 ${r.status}: ${await r.text()}`);
  else {
    console.log('\n## 추세 — 데이터랩 최근 12개월 (최근 3개월 평균 vs 그 이전 평균)');
    console.log('| 키워드 | 증감 | 월별 지수 (최대 100) |\n|---|---:|---|');
    for (const g of (await r.json()).results) {
      const v = g.data.map(d => d.ratio);
      const avg = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
      const prev = avg(v.slice(0, -3));
      const pct = prev ? Math.round((avg(v.slice(-3)) / prev - 1) * 100) : 0;
      console.log(`| ${g.title} | ${pct > 0 ? '+' : ''}${pct}% | ${v.map(x => Math.round(x)).join(' ')} |`);
    }
  }
} else {
  console.log('\n(데이터랩 추세 생략 — ~/.claude/.env 에 NAVER_CLIENT_ID · NAVER_CLIENT_SECRET 없음)');
}

if (opt.out) {
  const csv = ['keyword,total,pc,mobile,comp', ...rows.map(r => [r.keyword, r.total, r.pc, r.mobile, r.comp].join(','))];
  fs.writeFileSync(opt.out, '﻿' + csv.join('\n'));
  console.log(`\n전체 ${rows.length}건 저장: ${opt.out}`);
}
