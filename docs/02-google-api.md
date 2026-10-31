# 구글 API 연동 — 키워드 플래너 검색량 + ChatGPT 인용 측정

## A. 구글 키워드 플래너 (Google Ads API)

`google-keywords.mjs` 는 Google Ads API의 `generateKeywordIdeas` 로 한국·한국어 기준 연관 키워드와 월평균 검색수를 받습니다.

| `~/.claude/.env` 이름 | 어디서 받나 |
|---|---|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads **관리자 계정** → 도구 → **API 센터** 에서 개발자 토큰 신청 |
| `GOOGLE_ADS_CUSTOMER_ID` | 조회에 쓸 광고 계정 번호 (하이픈 없이 10자리) |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | 관리자 계정 번호 (관리자 계정을 거쳐 접근할 때만) |
| `GOOGLE_ADS_REFRESH_TOKEN` | 아래 4번 `--auth` 가 자동으로 기록 |

### 순서

1. https://ads.google.com 에서 광고 계정을 만듭니다 (광고를 집행하지 않아도 됩니다)
2. 관리자 계정을 만들고 **API 센터에서 개발자 토큰**을 신청합니다. 처음에는 테스트용 접근만 열리고, 실제 검색량 조회는 **기본(또는 Explorer) 접근 승인** 뒤에 됩니다
3. https://console.cloud.google.com 에서 프로젝트를 만들고 **Google Ads API 사용 설정** → **OAuth 클라이언트 ID(데스크톱 앱)** 를 만들어 JSON을 내려받습니다
   - 스크립트는 이 JSON을 `~/.gmail-mcp/gcp-oauth.keys.json` 에서 읽습니다. 다른 곳에 두었다면 그 경로로 복사하세요
4. 최초 1회 인증

```bash
node ~/.claude/skills/seo-geo-audit/scripts/google-keywords.mjs --auth
```

   브라우저에서 구글 계정을 허용하면 `GOOGLE_ADS_REFRESH_TOKEN` 이 `~/.claude/.env` 에 기록됩니다.
   - 구글이 광고 권한 허용에 **패스키**를 요구할 수 있고, 새로 만든 패스키는 **최대 7일 뒤**에 쓸 수 있습니다

5. 실행

```bash
node ~/.claude/skills/seo-geo-audit/scripts/google-keywords.mjs 효도여행,가족여행,패키지여행 --top=30
```

- `API 실패 404` 가 나면 API 버전이 닫힌 것입니다. `.env` 에 `GOOGLE_ADS_API_VERSION=v25` 처럼 올려 적습니다

## B. ChatGPT 인용 측정 (OpenAI API)

`ai-visibility.mjs` 는 웹검색을 켠 OpenAI 모델에 손님처럼 질문하고, 답변에 내 사이트가 **인용**(출처 링크)되거나 **언급**(브랜드명)되는지 기록합니다.

1. https://platform.openai.com → API keys → 새 키 발급 → `OPENAI_API_KEY`
2. 실행

```bash
node ~/.claude/skills/seo-geo-audit/scripts/ai-visibility.mjs --site=hanatour-yeongtong.vercel.app --brand=영통점 "수원 영통 효도여행 상담 잘하는 여행사 추천해 줘" "영통에서 가족 패키지 여행 예약할 곳 알려 줘"
```

- 질문은 1번 검색어 조사 결과를 말투로 바꿔 5~10개 넣습니다
- 같은 질문도 매번 답이 달라집니다. 비교하려면 `--out=결과.json` 으로 남기고 같은 질문으로 다시 잽니다
