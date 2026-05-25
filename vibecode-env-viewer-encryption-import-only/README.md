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

## 스캐폴드 상태 (v0.1)

현재 이 디렉토리는 **일반 변형의 클론**이며 암호화 로직은 아직 들어가지 않았다. 다음 결정사항 후에 구현 예정:

- [ ] 암호화 알고리즘 (dotenvx ECIES vs. 자체 AES-256-GCM vs. age)
- [ ] 키 저장 위치 (`.env.keys` 파일 vs. VSCode `SecretStorage` vs. OS keychain)
- [ ] 평문/암호문 혼재 파일 처리 정책

## 아키텍처

일반 변형과 동일한 구조 — 향후 `src/crypto.ts` 추가 + `handlers.ts` 의 `setValue` 경로 분기 예정.

```
vibecode-env-viewer-encryption-import-only/
├── package.json                  # priority: "option", viewType: vibecodeEnvViewerEncryptionImport.editor
├── package.nls.json              # 자동 생성
├── package.nls.ko.json           # 자동 생성
├── i18n/ko.json                  # { nls, runtime }
├── l10n/bundle.l10n.ko.json      # 자동 생성
├── scripts/
│   ├── sync-nls.mjs
│   └── nls-defaults.json
└── src/
    ├── extension.ts
    ├── editor-provider.ts        # VIEW_TYPE = vibecodeEnvViewerEncryptionImport.editor
    ├── env-parser.ts             # 공통 (일반 변형과 동일)
    ├── handlers.ts               # TODO: setValue 에 암호화 훅
    ├── crypto.ts                 # TODO: 신규 모듈
    └── webview/                  # 공통 UI
```

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
