# 동네 가게 홈페이지 · 검색 노출 키트 (Claude 스킬)

> 홈페이지 대행 300만 원 대신, 사장님이 Claude에게 **가게 용도와 사진만 넣으면** 홈페이지가 만들어지고
> 네이버·구글·ChatGPT 검색에 나오도록 세팅되는 Claude Code 스킬 묶음과 따라 하기 안내서입니다.

- 실제 사례: **하나투어 영통점** — https://hanatour-yeongtong.vercel.app (코드: [`examples/hanatour-yeongtong/`](examples/hanatour-yeongtong/))

---

## 1. 무엇이 들어 있나 — 스킬 4종

| # | 스킬 | 하는 일 | 폴더 |
|---|---|---|---|
| 1 | 인기 검색어 조사 | 네이버 검색광고·데이터랩 API, 구글 키워드 플래너 API로 업종 관련 **월간 검색량 · 경쟁 정도 · 12개월 추세**를 받아 «손님이 실제로 치는 말»을 찾는다 | `skills/naver-keyword-volume` + `skills/seo-geo-audit/scripts/` |
| 2 | 홈페이지 제작 | 업종·가게 정보·사진을 넣으면 Awwwards 같은 수상작 갤러리에서 업종에 맞는 레이아웃을 찾아 분석하고, 첫 화면에 «무엇을 파는 가게인지, 어떻게 문의하는지»가 보이는 홈페이지를 만든다 | `skills/homepage` · `skills/homepage-reference` |
| 3 | SEO·GEO 최적화 | 1번의 검색어에 맞춰 제목·설명문·메뉴·본문(검색 구조)을 고치고, 같은 검색어로 ChatGPT에 물어 내 가게가 답변에 **인용**되는지 잰다 | `skills/seo-geo-audit` |
| 4 | 화면 캡처 안내 | 막혔을 때 Claude가 지금 화면을 캡처해 **눌러야 할 곳에 빨간 테두리와 번호**를 그려 준다 | `skills/screenshot-lecture` |

- **SEO** — 네이버·구글 같은 검색엔진에서 상위에 노출되게 하는 것 (목표: 클릭)
- **GEO** — ChatGPT·Claude 같은 AI 답변에 내 가게가 인용되게 하는 것 (목표: 인용)

---

## 2. 설치 — 5분

1. [Claude Code](https://claude.com/claude-code)를 설치하고 로그인합니다 (Claude 구독 필요).
2. 이 저장소를 내려받아 스킬을 Claude 스킬 폴더로 복사합니다.

```bash
git clone https://github.com/snu9026-Chris/local-biz-homepage-kit.git
```

```bash
mkdir -p ~/.claude/skills && cp -R local-biz-homepage-kit/skills/* ~/.claude/skills/
```

3. 검색어 조사(1번)를 쓰려면 API 키를 넣습니다 → [네이버 API 연동](docs/01-naver-api.md) · [구글 API 연동](docs/02-google-api.md)
4. `.env.example` 을 `~/.claude/.env` 로 복사하고 받은 키를 채웁니다. **이 파일은 절대 깃에 올리지 않습니다.**

> 명령어가 어렵다면 Claude에게 «이 저장소 주소의 스킬을 내 컴퓨터에 설치해 줘»라고 말하면 Claude가 대신 설치합니다.
> 막히면 «지금 화면 캡처해서 어디 눌러야 하는지 알려 줘»라고 말하세요 (4번 스킬).

---

## 3. 따라 하기 — 하나투어 영통점을 만든 순서

### 3-1. 목적 정하기
Claude에게 말합니다.

> 우리 어머니가 하나투어 영통점(여행사)을 하셔. 효도·가족 여행 상담 예약이 목적인 홈페이지를 만들고 싶어.

- 타깃: 직접 알아보다 지친 40~60대 · 타깃 액션: 1:1 상담 예약 · 형식: 원페이지

### 3-2. 손님이 찾는 검색어 받기 (스킬 1)

> 여행사 관련해서 지금 네이버에서 많이 검색되는 말 뽑아 줘. 시드는 효도여행, 가족여행, 패키지여행, 허니문, 여행사.

Claude가 `naver-keywords.mjs` 를 실행해 **검색량 상위 · 공략 후보 · 12개월 추세** 표를 줍니다. 이 단어들이 홈페이지 문구의 기준이 됩니다.

### 3-3. 사진과 레퍼런스 넣기 (스킬 2)

> 이 핀터레스트 영상은 히어로 섹션에 넣고, 나머지 링크는 디자인 에셋이야. (링크 붙여넣기)
> 홈페이지 레이아웃은 https://www.awwwards.com/sites/vita-travels 처럼 해 줘.

- Claude가 사진·영상을 내려받고, 레퍼런스 사이트의 **배경색 · 서체 · 섹션 구성 · 효과**를 분석해 `홈페이지구조.md` 로 정리합니다.
- 레퍼런스를 모를 때는 «여행사에 어울리는 Awwwards 수상작 레이아웃 찾아서 적용해 줘»라고 해도 됩니다.

### 3-4. 홈페이지 만들기

> 헤더에 하나투어 로고와 «영통점», 글은 한글로. 하나투어 홈페이지 가서 상품 글 형식도 보고 그대로 맞춰 줘.

결과: [`examples/hanatour-yeongtong/index.html`](examples/hanatour-yeongtong/index.html) — 히어로 영상 · 왜 여행사인가 · 소개 · 추천 여행 카드 · 한 번에 예약 · 여행지 · 이용 방법 · 상담 · 푸터

### 3-5. 검색 노출 세팅 (스킬 3)

> 3-2에서 뽑은 검색어에 맞춰 홈페이지 검색 구조 개선하고, ChatGPT에 물어봤을 때 우리 가게 나오는지 확인해 줘.

- 페이지 제목·설명문·가게 정보표(구조화 데이터)·본문 문구를 검색어에 맞게 바꿉니다.
- `ai-visibility.mjs` 가 같은 질문을 ChatGPT(웹검색)에 던져 **인용 / 언급 / 자주 인용된 경쟁 사이트**를 표로 줍니다.

### 3-6. 배포

> Vercel에 배포해 줘.

Claude가 `vercel deploy --prod` 를 실행하고 주소를 알려 줍니다. (Vercel 무료 계정 필요)

---

## 4. 저장소 구조

```
skills/
  naver-keyword-volume/   검색어 조사 스킬 (네이버·구글·ChatGPT 측정 절차)
  seo-geo-audit/          SEO·GEO 채점·개선 스킬
    scripts/naver-keywords.mjs   네이버 검색광고 + 데이터랩
    scripts/google-keywords.mjs  구글 키워드 플래너
    scripts/ai-visibility.mjs    ChatGPT 인용 측정
  homepage/               홈페이지 문구·구성 규칙
  homepage-reference/     레퍼런스 사이트 분해 절차
  screenshot-lecture/     화면 캡처 + 빨간 테두리 안내
docs/
  01-naver-api.md         네이버 API 키 발급·연동
  02-google-api.md        구글 API 키 발급·연동
examples/hanatour-yeongtong/   실제 결과물 (정적 HTML)
.env.example              필요한 키 목록 (값 없음)
```

## 5. 주의

- 예시 사이트의 사진은 핀터레스트에서 받은 분위기용 이미지이고, 상품·가격은 하나투어 홈페이지 2026-10-31 기준 예시입니다. 실제 영업용으로 쓸 때는 직접 찍은 사진과 실제 상품으로 바꾸세요.
- 연락처·주소·사업자번호는 `000` 자리표시입니다.
- API 키는 `~/.claude/.env` 에만 두고 코드나 깃에 넣지 않습니다.
