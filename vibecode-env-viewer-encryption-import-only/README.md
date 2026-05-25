# vibecode-env-viewer-encryption-import-only

`vibecode-env-viewer-normal-import-only` 의 **암호화 변형**. `.env` 파일을 paste-only 보안 뷰로 여는 동작은 동일하지만, **디스크에는 값을 암호화해 저장**한다.

> 일반 변형(평문 저장) 은 [vibecode-env-viewer-normal-import-only](../vibecode-env-viewer-normal-import-only/) 를 참고. 위협 모델이 다르다 — 평문 변형은 "값을 화면/클립보드에 안 보이게", 이 확장은 거기에 더해 "디스크 평문 노출까지 차단".

## 활성화

- `package.json` 의 `priority`: `"option"` — `.env` 파일을 더블클릭하면 일반 텍스트 에디터 또는 평문 변형이 먼저 뜬다 (기존 동작 보존)
- 이 확장을 쓰려면: `.env` 우클릭 → **Reopen Editor With…** → **Vibecode .env (Encrypted Import Only)** 선택
- 활성 조건: 같은 폴더에 `.env.keys` 가 존재해야 함. 없으면 에러 안내 후 일반 에디터로 폴백 (TODO: 미구현 — 스캐폴드 단계).

## 동작 (계획)

| 단계 | 동작 |
|---|---|
| 파일 열기 | `.env` 파싱 → `encrypted:...` 프리픽스가 붙은 값은 `.env.keys` 의 private key 로 복호화해서 webview 의 메모리에만 표시용 마스크 (`··· (set)`) 로 변환 |
| 값 붙여넣기 | webview → extension `setValue` → public key 로 즉시 암호화 → `encrypted:BASE64...` 형태로 `.env` 에 저장 |
| 평문 마이그레이션 | 평문 값이 섞여 있으면 "Encrypt all" 명령으로 일괄 암호화 (TODO) |
| 키 페어 생성 | "Enable Encryption" 명령 → `.env.keys` 생성 + `.gitignore` 자동 추가 (TODO) |

## 구현 상태 (v0.1)

- ✅ 모듈 폴더 구조 (`src/crypto/<strategy>/`) — 새 전략은 폴더 추가 + `REGISTRY` 한 줄로 plug-in
- ✅ `none` 전략 — passthrough (default, 동작은 일반 변형과 동일)
- ✅ `dotenvx` 전략 — secp256k1 ECIES + `encrypted:BASE64` 포맷, dotenvx 호환 (eciesjs 직접 사용)
- ⏳ Bootstrap 명령 — v0.2. 현재는 사용자가 최초 1회 `npx dotenvx encrypt` 로 keypair 생성
- ⏳ 추가 백엔드 — Infisical, AES-GCM 등은 폴더만 추가하면 됨

## 모듈 구조

```
src/crypto/
├── constants.ts          # STRATEGY_ID, SETTING_KEY, 포맷 마커
├── types.ts              # CryptoStrategy 인터페이스
├── index.ts              # REGISTRY + getActiveStrategy(uri)
├── none/index.ts         # NoneStrategy — passthrough
└── dotenvx/index.ts      # DotenvxStrategy — eciesjs 기반
```

전체 디렉토리:

```
vibecode-env-viewer-encryption-import-only/
├── package.json                  # priority: "option" + contributes.configuration
├── package.nls.{json,ko.json}    # 자동 생성
├── i18n/ko.json                  # { nls, runtime } 원본
├── l10n/bundle.l10n.ko.json      # 자동 생성
├── scripts/{sync-nls.mjs, nls-defaults.json}
└── src/
    ├── extension.ts
    ├── editor-provider.ts        # getActiveStrategy() → HandlerContext.crypto
    ├── env-parser.ts             # 공통
    ├── handlers.ts               # setValue/addKey 가 ctx.crypto.encryptValue() 통과
    ├── crypto/                   # ↑ 위 모듈 구조
    └── webview/                  # 공통 UI
```

## 전략 선택

VSCode 설정 `vibecodeEnvViewerEncryption.strategy` — default `none`, `dotenvx` 로 전환 시:

1. 같은 폴더에 `.env.keys` 가 있어야 함 (private key 보관, gitignore 필수)
2. `.env` 안에 `DOTENV_PUBLIC_KEY="0395..."` 라인이 있어야 함
3. 위 두 조건이 안 맞으면 `getActiveStrategy()` 가 `none` 으로 자동 폴백 — 사용자 환경을 깨지 않음

## 런타임 복호화

암호값은 dotenvx 표준 포맷이므로 앱 실행 시:

```bash
npx dotenvx run -- node app.js
# 또는
require('@dotenvx/dotenvx').config()  # process.env 에 복호화된 값 주입
```

우리 익스텐션 없이도 dotenvx 생태계 그대로 작동.

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.nls + l10n 재생성
npm run sync:check  # CI 게이트
npm run package     # .vsix
```
