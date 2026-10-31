# 네이버 API 연동 — 검색량 · 12개월 추세

네이버는 키 두 종류가 필요합니다. 둘 다 무료입니다(데이터랩은 2026-10-30 기준 한시 무료).

| API | 주는 것 | `~/.claude/.env` 에 넣을 이름 |
|---|---|---|
| 검색광고 키워드 도구 | 연관 키워드 · 월간 검색수(PC/모바일) · 경쟁 정도 | `NAVER_AD_API_KEY` · `NAVER_AD_SECRET_KEY` · `NAVER_AD_CUSTOMER_ID` |
| 데이터랩 검색어 트렌드 | 상위 키워드의 12개월 추세(상대 지수) | `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` |

## 1. 검색광고 API 키 — 3개

1. https://searchad.naver.com 에 네이버 아이디로 로그인 (광고 계정이 없으면 무료로 만듭니다. 광고비를 쓰지 않아도 됩니다)
2. 상단 **도구 → API 사용 관리**
3. **네이버 검색광고 API 서비스 신청 → 라이선스 발급**
4. 화면의 **엑세스라이선스 → `NAVER_AD_API_KEY`**, **비밀키 → `NAVER_AD_SECRET_KEY`**, **CUSTOMER_ID → `NAVER_AD_CUSTOMER_ID`**

## 2. 데이터랩 API 키 — 2개

> 2026-07-31부터 `developers.naver.com` 은 데이터랩 신규 신청을 받지 않습니다. 네이버 클라우드 플랫폼에서 받습니다.

1. https://console.ncloud.com 로그인
2. **결제 수단을 먼저 등록**합니다 (과금 정보 및 비용 관리 → 결제 정보 관리). 등록 전에는 «서비스 이용이 불가능한 계정»으로 막힙니다
3. **NAVER API HUB → Application 등록** → 사용 API에서 **검색어 트렌드** 선택
4. 발급된 **Client ID → `NAVER_CLIENT_ID`**, **Client Secret → `NAVER_CLIENT_SECRET`**
5. 발급 직후 1~2분은 `401 Authentication Failed` 가 날 수 있습니다. 잠시 뒤 다시 실행하세요

## 3. 실행

```bash
node ~/.claude/skills/seo-geo-audit/scripts/naver-keywords.mjs 효도여행,가족여행,패키지여행,허니문,여행사 --top=30 --filter='여행|투어|패키지|허니문'
```

- 시드는 5개까지, 쉼표로 구분합니다
- `--filter` 로 업종과 상관없는 연관어를 거릅니다
- 출력: **검색량 상위 · 공략 후보(경쟁 높음 제외, 월 100회 이상) · 12개월 추세**

Claude에게는 «여행사 관련 네이버 검색량 뽑아 줘»라고만 말해도 이 명령을 대신 실행합니다.
