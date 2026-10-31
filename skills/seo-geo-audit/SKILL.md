---
name: seo-geo-audit
description: 웹사이트를 SEO(검색엔진)와 GEO/AEO(AI 답변 인용) 두 축으로 «점수»를 매겨 진단한다. 12페이지를 크롤링해 16항목 기계검사 + 6차원 콘텐츠평가 + SEO 7항목 가중합으로 채점하고, 고칠 순서를 비용·효과로 정렬한다. 외주 제안서·경쟁사 벤치마킹·내 사이트 진단에 쓴다. 트리거 - 이 사이트 몇 점, SEO 점수, GEO 점수, AEO, 사이트 진단해줘, 경쟁사 사이트 분석, 검색에 안 뜨는 이유, AI가 인용 안 하는 이유, llms.txt, 구조화 데이터 있나, 왜 문의가 없지, 사이트 채점 (검색량 질문 자체는 naver-keyword-volume)
source: tutoring-session · 2026-08-26 치과 사이트 2곳 채점 세션
distilled: 2026-08-29
method: 현장
verified: koreaveneersclinic.com · dentistskorea.com 실채점 (각 12페이지 크롤링)
---

# SEO · GEO 채점

**두 축은 «다른 것»을 잰다.** 한 점수로 뭉치면 진단이 틀린다.

| | SEO | GEO (= AEO) |
|---|---|---|
| 상대 | 구글·네이버 **검색엔진** | ChatGPT·클로드·퍼플렉시티 **AI 답변** |
| 목표 | 상위 노출 → **클릭** | 답변에 **인용** |
| 전용 항목 | 백링크 | `llms.txt` |

---

## 0. 시작 전 — 축을 확정한다

사용자가 «몇 점이야»라고만 하면 **어느 축인지 먼저 묻는다.** SEO / GEO / 둘 다 / 전환(CRO)은
쓰는 도구도 결과물도 다르다. 전환이면 이 스킬이 아니라 `homepage-cro-review` 다.

---

## 0.5 키워드 확보 — 네이버 실측 검색량 (2026-10-30 추가)

**채점 «전»에 업종 키워드를 숫자로 받는다.** 아래 SEO 온페이지 검사와 GEO 질문 세트가 이 표를 기준으로 삼는다.

```bash
node ~/.claude/skills/seo-geo-audit/scripts/naver-keywords.mjs 치과,강남치과,임플란트 --top=30 --out=./키워드.csv
```

| 출처 | 주는 것 | 키 (`~/.claude/.env`) |
|---|---|---|
| 검색광고 키워드 도구 | 연관 키워드 · **월간 검색수 절대값**(PC/모바일) · 경쟁정도 | `NAVER_AD_API_KEY` · `NAVER_AD_SECRET_KEY` · `NAVER_AD_CUSTOMER_ID` |
| 데이터랩 검색어 트렌드 | 상위 5개의 **12개월 추세**(상대 지수, 최대 100) | `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` (없으면 추세만 생략) |

- 키 발급 — 검색광고: `searchad.naver.com` → 도구 → API 사용 관리 → 라이선스 발급 / 데이터랩: **네이버 클라우드 플랫폼 콘솔 → NAVER API HUB → Application 등록**(검색어 트렌드) → Client ID·Secret
- ⚠ 2026-07-31부터 `developers.naver.com` 은 데이터랩 신규 신청을 받지 않는다(사용 API 목록에 없음). 호출 주소도 `naverapihub.apigw.ntruss.com/search-trend/v1/search` 로 바뀌었다 — 2026-10-30 기준 한시 무료
- ⚠ NCP 콘솔은 **결제 수단 등록 전엔 «서비스 이용이 불가능한 계정»** 으로 막힌다(과금 정보 및 비용 관리 → 결제 정보 관리). 키 발급 직후 1~2분은 `401 Authentication Failed` 가 나오다 풀린다 — 키를 의심하기 전에 잠시 뒤 재시도 (2026-10-31 실측)
- 시드는 **5개까지**, 공백은 스크립트가 지운다(API 가 공백을 거부). 검색수 10 미만은 `< 10` 문자열로 와서 5 로 계산한다.
- 출력 표 두 개 — **검색량 상위**(전체 그림) · **공략 후보**(경쟁 «높음» 제외 · 월 100회↑ = 자연 검색으로 잡을 롱테일)

**쓰는 곳**
1. **SEO** — 공략 후보 상위 키워드가 title · H1 · meta description · 본문에 있나. 없으면 §5 고칠 순서에 «키워드 반영»으로 넣는다.
2. **GEO** — 상위 키워드를 질문형으로 바꾼다(「강남 임플란트 잘하는 치과 추천」). ChatGPT·클로드·퍼플렉시티에 실제로 묻고 **대상 사이트 인용 여부 · 인용된 경쟁사 · 인용 출처**를 표로 남긴다.

⚠ **AI 에게 «사람들이 많이 쓰는 키워드»를 묻지 않는다.** AI 는 질문 기록을 보고 답하지 않아 빈도가 아니라 그럴듯한 목록을 만든다. AI 는 측정 «대상»이다.
⚠ 데이터랩 지수는 **요청에 넣은 키워드끼리의 상대값**이다. 다른 날 다른 묶음으로 받은 지수끼리 비교하지 않는다.

---

## 1. GEO — 기계검사부터 (자동)

```bash
node ~/.claude/library/gtm-engineer-skills/audit-website-aeo/scripts/aeo-audit.mjs \
     https://대상.com/ --max-pages=12 --out=./결과.json
```

**16항목**: title · meta description · canonical · H1 단일 · JSON-LD 존재 · 스키마 타입 인식 ·
OG 기본 · 내부링크 5+ · 이미지 alt 80%+ · 본문 250단어+ · noindex 없음 · noai 없음 ·
헤딩 계층 · `llms.txt` · AI봇 차단 없음 · RSS 피드

출력의 `pagesForReview` 에 페이지별 title·h1·헤딩·스키마·본문 발췌가 들어 있다. **그걸 읽고** 6차원을 매긴다.

## 2. GEO — 콘텐츠 6차원 (사람/AI 판단, 각 0~5)

| 차원 | 보는 것 |
|---|---|
| 답변 준비도 | 헤딩이 질문형인가 · **답이 문단 첫머리에 오는가** |
| 인용 가능성 | 비교 블록·목록·정의 문단이 «잘라 붙이기» 좋은가 |
| 근거 밀도 | 수치·가격·실적. **외부 출처 인용이 있는가** |
| 콘텐츠 깊이 | 페이지 수 · 주제 커버리지 |
| 최신성 | **날짜 신호** · sitemap lastmod · RSS |
| 구조 명료성 | H1 단일 · 헤딩 계층 · alt 텍스트 |

```
GEO = 0.5 × 기계검사(0~100) + 0.5 × (6차원 평균 × 20)
```

**등급**: A+ 95↑ / A 90 / A- 85 / B+ 80 / B 75 / B- 70 / C+ 65 / C 60 / C- 55 / D 40~54 / F 40↓

> ⚠ 스크립트의 `heuristicIntelligenceSignals` 와 내 점수가 **한 차원에서 25점 넘게 벌어지면**
> 그 페이지 발췌를 다시 읽는다. 대개 내가 다른 차원의 결함을 이중으로 세고 있다.

## 3. SEO — 7항목 가중합 (직접 수집)

```bash
B=https://대상.com
curl -s $B/robots.txt
curl -s $B/sitemap.xml | grep -c "<loc>"                 # 페이지 수
curl -s $B/sitemap.xml | grep -o '<lastmod>[^<]*'        # 최신성
curl -s -o /dev/null -w "%{http_code} %{time_total}s %{size_download}\n" -L $B/
H=$(curl -sL $B/)
echo "$H" | grep -c 'application/ld+json'                # 구조화 데이터
echo "$H" | grep -o '<img[^>]*>' | wc -l                 # 이미지 수
echo "$H" | grep -o '<img[^>]*alt="[^"]\+"' | wc -l      # alt 채운 수
echo "$H" | grep -o '<meta[^>]*og:[^>]*>'                # OG
echo "$H" | grep -o -i '<meta[^>]*generator[^>]*>'       # 플랫폼
```

| 항목 | 가중 |
|---|---|
| 크롤링·색인 (robots·sitemap·canonical·www 리다이렉트·noindex) | 20% |
| 온페이지 (title·meta·H1 단일·헤딩 계층) | 20% |
| **구조화 데이터·로컬** (`LocalBusiness`/`Dentist` JSON-LD · **NAP 일치**) | 20% |
| 소셜 메타 (og:title/description/image/url · twitter:card) | 10% |
| 이미지·접근성 (alt 채움 비율) | 10% |
| 국제화 (hreflang) | 10% |
| 성능 (HTML 용량 · 응답 시간) | 10% |

---

## 4. ★ 실측에서 반복해 나온 결함 3종 — 여기부터 본다

순위·키워드보다 **먼저** 확인한다. 셋 다 «돈이 새는» 결함이다.

1. **템플릿 자리표시자가 라이브에 남아 있다**
   `555-555-5555` · `10 Street Name` · `myemail@mailservice.com` · 「Add a Title」 · 「Book an Audit」
   → 구글에게 **그게 그 가게의 주소·전화다.** 로컬팩에 원리적으로 못 들어간다.
   → `grep -c '555-555-5555'` 로 전 페이지 세어 본다. 한 장이 아니라 **템플릿이라 전 페이지에 있다.**

2. **OG 태그가 «옛 사이트»를 가리킨다**
   `og:url` · `twitter:image` 가 죽은 도메인 · `og:image` 부재 · `twitter:card` 중복 선언
   → 링크 공유 시 미리보기가 안 뜬다. **홈만 그런 경우가 많다**(옛 헤더 블록을 붙여넣은 자국).
   → 하위 페이지 2~3장을 표본으로 대조해 «홈만인지 전체인지» 가른다.

3. **연락처 오타 · NAP 불일치**
   `@gmail@gmail.com` 같은 오타는 메일이 **100% 반송**된다.
   본문 전화번호와 JSON-LD 전화번호가 다르면 구글이 그 사업장을 한 곳으로 특정하지 못한다.

## 5. 고칠 순서 — 비용/효과로 정렬해 준다

```
1  자리표시자 제거 · 연락처 오타      반나절 · 즉시 효과 (문의 유실 차단)
2  NAP 통일 (본문 = 스키마)          1시간   · 로컬팩 진입 조건
3  OG 태그를 자기 도메인으로          30분
4  LocalBusiness JSON-LD 전 페이지    1일     · SEO·GEO 동시 상승
5  이미지 alt 전량                    1일
6  페이지별 «최종 수정일» 노출         반나절  · 최신성 차원이 1~2 → 4
```

---

## 6. 함정

1. **«오픈 1위» 순위는 장비 제한 없이 겨룬 결과다.** 점수와 «내가 쓸 수 있나»는 다른 질문.
2. **Similarweb 은 월 수천 회 이하면 방문수를 안 보여준다.** 「데이터 없음」을 「트래픽 0」으로
   단정하지 말고 «측정 하한선 아래»라고 쓴다. 순위조차 안 잡히면 그것도 그대로 적는다.
3. **`llms.txt` 가 있어도 기본기가 무너진 사이트가 많다.** GEO 점수가 SEO보다 높게 나오는
   전형적 패턴 — 「콘텐츠는 좋은데 기계가 읽는 층이 비었다」로 서술한다.
4. **오픈 이미지 모델·AI 도구의 «한국어 지원»은 태그로 확인한다.** 「글자에 강하다」는 표현은
   대개 中·英 기준이다.
5. **재측정용으로 원본 JSON 을 반드시 남긴다.** 고친 뒤 같은 명령을 다시 돌려야 개선폭이
   숫자로 나온다. 점수만 적어두면 다음에 비교가 안 된다.

## 7. 산출물

```
<대상>-aeo.json          원본 크롤링 데이터 (재측정 비교용) ← 반드시 보관
README.md 또는 보고서     점수 2개 · 항목별 근거 · 결함 3종 · 고칠 순서
```

외주 제안용이면 **결함을 «돈»으로 환산**해 쓴다 — 「이 오타로 문의 메일이 100% 반송됩니다」가
「이메일 형식이 잘못되었습니다」보다 움직인다.

## 8. 함께 보는 것

- `~/.claude/library/gtm-engineer-skills/` — `audit-website-aeo`(이 스킬의 엔진) · `improve-aeo-geo`(고치기) · `research-brand`
- `~/.claude/library/claude-seo/` — `seo-schema` · `seo-local` · `seo-technical`
- `homepage-cro-review` — **전환** 축은 이쪽. SEO/GEO 와 섞지 않는다
- 세컨브레인 `cards/ai/웹트래픽은-계측하지-않으면-없다` — 계측 3층 구조
