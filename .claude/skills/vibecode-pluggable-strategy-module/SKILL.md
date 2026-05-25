---
name: vibecode-pluggable-strategy-module
description: "vibecode-* 확장에서 교체 가능한 백엔드 모듈 (암호화/스토리지/리모트 소스 등) 을 설계하는 패턴 — constants-first ID + REGISTRY 망라성 + isReady fallback + none 패스스루 기본값. Use when: 새 백엔드/엔진/프로바이더를 셋팅으로 고를 수 있게 만들거나, 기존 분기 if (mode === 'x') 코드를 모듈화할 때 (e.g., \"crypto 백엔드 추가\", \"AES-GCM 전략 끼워넣자\", \"리모트 secret store 옵션 만들자\")."
---

# Vibecode Pluggable Strategy Module

`src/<feature>/` 아래에 교체 가능한 백엔드를 끼워넣는 컨벤션. 대표 사례: `vibecode-env-viewer-encryption-import-only/src/crypto/`.

세 가지 축:
1. **Constants-first** — 전략 ID 는 `STRATEGY_ID` 객체 한 곳에서만 정의, union 타입 파생
2. **REGISTRY 망라성** — `Record<StrategyId, T>` 로 컴파일 타임 체크
3. **isReady fallback** — 설정 읽기 → 준비 확인 → 안 되면 `none` 으로 조용히 폴백

## 폴더 구조

```
src/crypto/
├── constants.ts        # STRATEGY_ID, SETTING_KEY, 공유 상수
├── types.ts            # CryptoStrategy 인터페이스
├── index.ts            # REGISTRY + getActiveStrategy() resolver
├── none/index.ts       # 패스스루 (항상 isReady=true)
├── dotenvx/index.ts    # 실제 구현
└── infisical/index.ts  # placeholder (isReady=false)
```

## 1. constants.ts — ID 의 단일 진실 공급원

```ts
export const STRATEGY_ID = {
  NONE: 'none',
  DOTENVX: 'dotenvx',
  INFISICAL: 'infisical'
} as const;

export type StrategyId = (typeof STRATEGY_ID)[keyof typeof STRATEGY_ID];

export const SETTING_KEY = {
  STRATEGY: 'vibecodeEnvViewerEncryption.strategy'
} as const;
```

핵심:
- `as const` → 리터럴 보존 → `StrategyId` 가 진짜 `'none' | 'dotenvx' | 'infisical'`
- 코드 어디서도 매직 스트링 금지. 무조건 `STRATEGY_ID.DOTENVX`
- **package.json mirror 의무**: `contributes.configuration[...].enum` 이 1:1 매치. constants.ts 상단 주석에 의무를 박아둔다 (`IMPORTANT: STRATEGY_ID values are mirrored in package.json ...`)

## 2. types.ts — 인터페이스

```ts
export interface CryptoStrategy {
  readonly id: StrategyId;
  isReady(envUri: vscode.Uri): Promise<boolean>;
  encryptValue(value: string, envUri: vscode.Uri): Promise<string>;
  isEncrypted(stored: string): boolean;
  initialize(envUri: vscode.Uri): Promise<void>;
}
```

`id` 노출은 디버깅/로깅용. **호출부는 `if (s.id === ...)` 로 분기 금지** — 분기 코드 부활 안티패턴. `isReady()` 가 핵심: 워크스페이스 prerequisites (사이드카 파일, 키 등) 비동기 검사 → 폴백 근거.

## 3. index.ts — REGISTRY + resolver

```ts
const REGISTRY: Record<StrategyId, CryptoStrategy> = {
  [STRATEGY_ID.NONE]: NoneStrategy,
  [STRATEGY_ID.DOTENVX]: DotenvxStrategy,
  [STRATEGY_ID.INFISICAL]: InfisicalStrategy
};

export async function getActiveStrategy(envUri: vscode.Uri): Promise<CryptoStrategy> {
  const requested = readStrategySetting();              // 1. 설정 읽기
  const candidate = REGISTRY[requested] ?? NoneStrategy; // 2. 미등록 ID 방어
  if (await candidate.isReady(envUri)) return candidate; // 3. 준비됐으면 사용
  return NoneStrategy;                                   //    아니면 폴백
}
```

`Record<StrategyId, CryptoStrategy>` 가 망라성 강제 — 새 ID 추가하고 REGISTRY 엔트리 빠뜨리면 컴파일 실패.

**왜 `none` 폴백이 중요한가:** 기능을 setting 뒤에 숨겨 점진적 출시 가능. 사용자가 `dotenvx` 골랐는데 `.env.keys` 없으면 → 그냥 plain 동작으로 떨어짐, 에러 없음. "safe by default, opt-in encryption".

## 4. 각 전략 폴더

### none — 패스스루 (canonical)

```ts
export const NoneStrategy: CryptoStrategy = {
  id: STRATEGY_ID.NONE,
  async isReady() { return true; },         // 언제나 준비됨
  async encryptValue(value) { return value; }, // identity
  isEncrypted() { return false; },
  async initialize() { /* no-op */ }
};
```

`isReady` 가 항상 true 라는 것이 폴백 체인의 종착점이라는 보장.

### dotenvx — 실제 구현 (skeleton)

```ts
export const DotenvxStrategy: CryptoStrategy = {
  id: STRATEGY_ID.DOTENVX,
  async isReady(envUri) {
    if (!(await fileExists(keysPath))) return false;   // 사이드카 파일?
    return (await readPublicKey(envUri)) !== null;     // 공개키 선언?
  },
  async encryptValue(value, envUri) {
    if (value === '') return value;              // 빈 값은 절대 암호화 안 함
    if (isEncryptedValue(value)) return value;   // 재-암호화 방지
    // ... ECIES ...
    return ENCRYPTED_VALUE_PREFIX + base64;
  },
  isEncrypted: (s) => s.startsWith(ENCRYPTED_VALUE_PREFIX),
  ...
};
```

규약: 빈 값 in → 빈 값 out, 이미 암호화된 값 재-암호화 금지, `isEncrypted` 는 prefix 만으로 판별.

### infisical — placeholder (slot 예약)

```ts
export const InfisicalStrategy: CryptoStrategy = {
  id: STRATEGY_ID.INFISICAL,
  async isReady() { return false; },                       // 핵심
  async encryptValue() { throw new Error(NOT_IMPLEMENTED); },
  isEncrypted() { return false; },
  async initialize() { throw new Error(NOT_IMPLEMENTED); }
};
```

`isReady=false` 덕분에 resolver 가 조용히 `none` 으로 폴백 → 사용자가 셋팅에서 골라도 안 깨짐. throw 는 직접 호출 시에만.

**언제 placeholder 를 둬도 되는가:** 진짜로 곧 구현할 계획이 있을 때만. 폴더 구조 문서화 + slot 예약 용도. 영영 안 만들 거면 빼는 게 낫다 (vaporware 방지).

## 5. package.json mirroring

```json
"vibecodeEnvViewerEncryption.strategy": {
  "type": "string",
  "enum": ["none", "dotenvx", "infisical"],
  "default": "none",
  "enumDescriptions": [
    "%config.strategy.none.description%",
    "%config.strategy.dotenvx.description%",
    "%config.strategy.infisical.description%"
  ]
}
```

규약: `enum` 은 `STRATEGY_ID` 값과 1:1 (순서/개수), `default` 는 항상 `none`, `enumDescriptions` 는 nls key (i18n 파이프라인에 맡김).

중복이 거슬리지만 받아들인다 — VSCode 가 declarative enum 을 요구. constants.ts 주석의 mirror 의무가 현실적 안전장치.

## 흔한 실수

| 실수 | 증상 | 처방 |
|---|---|---|
| 코드에 `'dotenvx'` 매직 스트링 | 리네임 시 silent 누락 | 무조건 `STRATEGY_ID.DOTENVX` |
| `REGISTRY` 를 `Partial<Record<...>>` 로 선언 | 미등록 ID 컴파일 통과 | `Record<StrategyId, T>` 로 망라성 강제 |
| placeholder 에서 `isReady=true` + throw | 사용자 골랐을 때 실제 폭발 | 미구현이면 무조건 `isReady=false` |
| `none` 폴백 누락 | 설정 오타 / 미구현 선택 시 깨짐 | resolver 마지막 줄 `return NoneStrategy` |
| package.json enum 추가 잊음 | 코드는 동작하는데 UI 에 안 보임 | constants.ts 주석에 mirror 의무 박기 |
| 호출부에서 `if (s.id === ...)` | 분기 코드 부활, 새 전략 추가 시 누락 | 차이는 메서드로 흡수 |

## 적용 사례

- `vibecode-env-viewer-encryption-import-only/src/crypto/` — 원형 구현 (none/dotenvx/infisical)
