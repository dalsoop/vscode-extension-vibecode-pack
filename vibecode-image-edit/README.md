# vibecode-image-edit

VSCode 안에서 도는 경량 이미지 에디터. 우클릭으로 호출 → 별도 webview 패널이 옆에 열림. 출력은 **항상 PNG** 로 원본 옆에 `<이름>-<YYMMDDHHMMSS>.png` 형식 저장 (원본 안 건드림).

자매 확장 [vibecode-image-viewer](../vibecode-image-viewer/) 는 read-only EXIF 뷰어. 이쪽은 픽셀에 손대는 편집기.

## 동작

1. Explorer 또는 에디터 타이틀 바에서 이미지 우클릭 → **Vibecode Image - Edit**
2. 우측에 webview 패널이 슬라이드 → 좌측 캔버스 + 우측 사이드바
3. 사이드바 상단의 3탭으로 모드 전환

### 1) 아이드롭퍼 (Eyedropper)
- 이미지 위에서 마우스 hover → 실시간으로 **Hex / RGB / HSL** 표시 + 색 스와치
- 클릭 → hex 값을 클립보드로 복사
- 각 줄의 `⧉` 버튼으로 RGB / HSL 도 복사 가능

### 2) 크로마키 (Chroma Key)
- **대상 색**: hex 직접 입력 또는 "이미지에서 선택" 버튼 → 다음 클릭 좌표 색을 대상으로
- **허용 오차** (0–200): 대상 색과 픽셀의 RGB 거리 안 이면 alpha = 0 (투명)
- **경계 부드럽게** (0–80): 임계값 바로 바깥 픽셀의 alpha 를 선형 페이드 — 머리카락·반투명 가장자리에 유용
- 슬라이더 움직이면 캔버스가 라이브 프리뷰
- **PNG 저장** → 원본 옆에 `<이름>-<YYMMDDHHMMSS>.png` 로 alpha 보존된 PNG 저장

### 3) 크롭 (Crop)
- 이미지 위에서 박스 드래그 → 점선 선택 영역 표시 + 픽셀 단위 크기 표기
- Esc 로 선택 해제
- **크롭 + PNG 저장** → 선택 영역만 잘라 새 PNG 저장

## 지원 포맷

입력: **PNG / JPG / JPEG / WEBP / GIF / BMP**  
출력: **PNG only** (alpha 보존 + 무손실)

HEIC / SVG / AVIF 는 의도적 제외 — webview 의 `<img>` → `<canvas>` 파이프라인이 일관되게 동작하는 포맷만.

## 아키텍처

```
vibecode-image-edit/
├── package.json                  # apps 패턴 — sync-contributions 가 commands/menus 자동 생성
├── i18n/{en,ko}.json
├── scripts/                       # build-ext (esbuild) + sync-contributions
└── src/
    ├── extension.ts              # apps 레지스트리 → commands 등록
    ├── apps/
    │   ├── _types.ts
    │   ├── index.ts
    │   └── open-editor/
    │       ├── manifest.ts       # explorer/context + editor/title 메뉴, image 확장자 when 절
    │       ├── handler.ts        # SUPPORTED 검증 후 ImageEditPanel.open(uri)
    │       └── index.ts
    ├── panel.ts                   # 파일당 1개 webview 패널, 재호출 시 reveal
    ├── handlers.ts                # savePng (base64 → fs.writeFile) + copyText
    ├── messages.ts                # InitMessage / SavePngRequest / CopyTextRequest
    ├── l10n-bundle.ts             # 타입드 L10n
    └── webview/
        ├── html.ts                # CSP + nonce + 3패널 스켈레톤
        ├── styles.ts              # CSS 문자열
        └── client-script.ts       # canvas 파이프라인 + 3모드 로직 (~370줄)
```

### Canvas 파이프라인

```
이미지 URL → <img onload> → sourceCanvas (offscreen, naturalWxH)
                                ├─ getImageData() → sourceImageData (캐시)
                                └─ drawImage → display (visible)

display 클릭/hover → displayToNatural(rect ratio) → naturalXY
                                                    └─ pixelAt → 픽셀 색
chroma 슬라이더 → applyChroma(sourceImageData copy → alpha 조작) → display.putImageData
크롭 드래그   → selectionBox 오버레이 → 클릭 저장 → out canvas → toBlob → base64

base64 PNG → postMessage → host (handlers.ts) → Buffer.from(b64, 'base64')
                                              → workspace.fs.writeFile(<original>-<YYMMDDHHMMSS>.png)
```

### 크로마키 공식

```
d = √((R-tR)² + (G-tG)² + (B-tB)²)    # RGB Euclidean 거리
if d ≤ tol           → alpha = 0
elif d ≤ tol+soft    → alpha *= (d-tol)/soft   # 선형 페이드
else                 → alpha 유지
```

심플하지만 단색 배경 (그린/블루 스크린, 단색 스튜디오 배경) 에는 충분. ML 기반 segmentation 이 필요한 경우 (그라데이션 배경, 머리카락 디테일) 는 이 확장의 범위 밖.

## 개발

```bash
cd vibecode-image-edit
npm install
npm run build        # sync → esbuild
npm run typecheck
npm run lint
npm run sync:check   # CI 게이트
npm run package      # .vsix
```

## v0.1 한계

- HEIC / SVG / AVIF 미지원
- 출력 항상 PNG (JPG/WEBP 로 저장 옵션 없음 — 손실/품질 트레이드오프 피하기 위함)
- Undo 없음 — 슬라이더로 원복 또는 Reset 버튼
- 멀티 셀렉션 크롭 불가 (영역 하나만)
- 회전/플립/리사이즈 미지원 (별도 PR 대상)
