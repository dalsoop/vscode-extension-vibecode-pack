# Vibecode .env Viewer **Encrypted** (Import Only)

> **`.env` 값을 디스크에 암호화한 채로 둔다. 편집은 paste-only.**
> 평문 노출도, 시크릿 유출도, 어깨너머도 차단.

---

## 누구를 위한 거?

- 회사 정책상 `.env` 가 평문으로 저장되면 안 되는 팀 (GitGuardian / 보안 감사 대비)
- `dotenvx` 기반 ECIES 암호화 워크플로우를 이미 쓰고 있거나 도입 검토 중인 팀
- 페어 프로그래밍 / 발표 / 화면공유에서 시크릿 노출 사고를 한 번이라도 겪어본 사람
- "어디 저장된 `.env` 파일이 평문이면 자동으로 거기서 시크릿 새어나간다고 봐야" 한다고 믿는 시큐어 코더

## 풀어주는 문제

| 평소 흔한 상황 | 이 확장으로 |
|---|---|
| `.env` 평문이 그대로 디스크에 — 백업 / 스크린샷 / 시청자 모두 노출 | **`encrypted:BASE64...` 포맷으로 저장**. 평문은 메모리 한 번만 스쳐감 |
| 값을 보려면 결국 평문 에디터로 열어야 함 | 키 옆에 `··· (set)` 마스크만 표시. 값은 화면에 안 뜸 |
| 키페어 관리가 별도 워크플로우 | dotenvx 표준 (`.env.keys` + `DOTENV_PUBLIC_KEY=`) 그대로 사용 |
| 앱 실행 시 복호화 코드를 직접 짜야 함 | `npx dotenvx run -- node app.js` 로 그대로 작동. 우리 ext 없이도 OK |
| 평문이 섞여있을까봐 불안 | "Encrypt all" 일괄 마이그레이션 (v0.2 예정) |

## 핵심 셀링 포인트

1. **paste-only 보안 뷰 + 디스크 암호화** — 일반 변형의 "화면/클립보드 노출 차단" 위에 "디스크 평문 노출 차단" 까지 더함.
2. **dotenvx 호환 포맷** — `encrypted:` 프리픽스 + ECIES (secp256k1). 우리 ext 없어도 dotenvx 생태계 그대로.
3. **plug-in 암호화 전략** — `src/crypto/<strategy>/` 폴더 추가만으로 새 백엔드 (Infisical / AES-GCM 등) 확장 가능.
4. **안전 폴백** — `.env.keys` 가 없거나 `DOTENV_PUBLIC_KEY` 라인 누락이면 자동으로 `none` 전략으로 폴백. 사용자 환경 깨지 않음.
5. **`priority: "option"`** — 기본 에디터는 건드리지 않음. `Reopen Editor With…` 로 명시적으로 선택해야 활성화.

## 사용 흐름 (시각)

```
1️⃣  키페어 셋업 (1회):
    $ npx dotenvx encrypt
    → .env 에 DOTENV_PUBLIC_KEY=... 추가
    → .env.keys 생성 (DOTENV_PRIVATE_KEY=..., gitignore 필수)

2️⃣  편집:
    Explorer > .env 우클릭 > Reopen Editor With…
              > Vibecode .env (Encrypted Import Only)

    ┌──────────────────────────────────────────┐
    │ ▣ .env (Encrypted)                       │
    ├──────────────────────────────────────────┤
    │ DATABASE_URL    [ ⌘V to paste ]  ··· (set)│  ← 화면에 값 안 보임
    │ STRIPE_SECRET   [ ⌘V to paste ]  ··· (set)│
    │ API_KEY         [ ⌘V to paste ]  (empty)  │
    └──────────────────────────────────────────┘
              ↓ 저장
       encrypted:BAa1Z... ← 디스크에 암호문만

3️⃣  앱 실행 (그대로):
    $ npx dotenvx run -- node app.js
    → process.env 에 복호화된 값 주입
```

## 썸네일 아이디어

- **메인 컷**: `.env` 파일 아이콘에 자물쇠 ▣ — 그 옆에 `KEY=encrypted:BAa1Z...` 라인이 보이고, 안쪽에서 마스크 `••• (set)` 가 표시되는 split
- **컬러 키**: 다크 배경 + 골드/그린 자물쇠. 평문은 흐릿하게, 암호문은 밝게 강조
- **부제**: "Paste-only · Disk-encrypted"
- **사이드 아이콘**: dotenvx 호환 마크 — 두 시스템이 연결되는 화살표 두 개

## 한 줄 후크

> "값은 안 보이고, 디스크엔 암호문만."
> dotenvx 워크플로우에 그대로 얹는다.
