# vibecode-image-viewer

이미지 파일을 클릭하면 VSCode 내부에서 **이미지 + EXIF 메타데이터**를 함께 보여주는 커스텀 에디터.

## 동작

- Explorer 에서 이미지 파일 클릭 → VSCode 가 자동으로 이 확장의 커스텀 에디터로 연다
- 상단: 이미지 캔버스 + 줌 (맞춤 / 100% / +/-) + 배경 (체커 / 어두움 / 밝음)
- 하단: 메타데이터 패널
  - **파일 정보 카드** — 경로, 용량, 해상도, 포맷, 수정일, 색공간, 비트 심도
  - **카메라 카드** — 카메라/렌즈/노출/조리개/ISO/초점거리/촬영일시/소프트웨어/회전
  - **GPS 카드** — 좌표 + 구글맵에서 열기 + 좌표 복사
  - **전체 EXIF / 메타데이터** — JSON raw dump (펼치기/접기, JSON 복사)
- 푸터: 폴더에서 보기, 경로 복사, 기본 앱으로 열기, 텍스트 에디터로 다시 열기

## 지원 포맷

| 포맷 | 미리보기 | EXIF |
|------|---------|------|
| PNG | Y | Y (XMP) |
| JPG / JPEG | Y | Y |
| WEBP | Y | Y |
| GIF | Y | — |
| BMP | Y | — |
| AVIF | Y (최신 Chromium) | 부분 |
| HEIC / HEIF | N (Chromium 미지원 — placeholder) | Y |
| SVG | Y | — |
| ICO | Y | — |

HEIC 는 webview 가 네이티브 렌더 못 함 → 이미지 자리에 placeholder 가 뜨고 EXIF / 카메라 정보만 표시.

## 우회 (텍스트 에디터로 열기)

이미지가 안 뜨거나 SVG 원본 텍스트를 보고 싶을 때:
1. Explorer 에서 우클릭 → **Open With…** → **Text Editor**
2. 또는 패널 하단 **텍스트 에디터로 다시 열기** 버튼

## 아키텍처

```
vibecode-image-viewer/
├── package.json                  # contributes.customEditors (PNG/JPG/.../ICO)
├── package.nls.json              # 자동 생성
├── package.nls.{ko,en}.json      # 자동 생성
├── i18n/
│   ├── ko.json                   # 한국어 원본 ({ nls, runtime })
│   └── en.json
├── l10n/
│   └── bundle.l10n.{ko,en}.json  # 자동 생성
├── scripts/
│   ├── build-ext.mjs             # esbuild — exifr + image-size 번들링
│   ├── sync-nls.mjs              # 간소 sync (NLS 만)
│   └── nls-defaults.json
└── src/
    ├── extension.ts              # provider 등록
    ├── editor-provider.ts        # CustomReadonlyEditorProvider
    ├── image-meta.ts             # exifr + image-size + fs.stat
    ├── messages.ts               # 프로토콜
    ├── handlers.ts               # 클립보드 / OS 액션 / openWith
    ├── l10n-bundle.ts            # 타입드 L10n
    └── webview/
        ├── html.ts               # CSP + nonce + skeleton
        ├── styles.ts             # CSS 문자열
        └── client-script.ts      # 클라이언트 JS 문자열
```

### 의존성

- **exifr** — EXIF/IPTC/XMP/ICC/GPS 파서 (JPG/PNG/HEIC/TIFF). `Buffer` 입력 받음.
- **image-size** — 거의 모든 포맷의 dimensions 추출 (PNG/JPG/WEBP/GIF/BMP/SVG/ICO/AVIF/HEIC).

둘 다 esbuild 번들에 인라인 — `vsce package --no-dependencies` 라 런타임 모듈 해결이 안 되니까 모든 코드는 `dist/extension.js` 한 파일에 들어가야 함.

### Webview 통신

- **Host → Webview**: `init` 한 번 (파일 정보 + 이미지 webview URI + 파싱된 EXIF + l10n 번들)
- **Webview → Host**:
  - `copyText` — 좌표 / 경로 / JSON 클립보드 복사
  - `revealInOs` — Finder/Explorer 에서 보기
  - `openWithDefaultApp` — macOS Preview / Windows Photos 등으로 열기
  - `reopenAsText` — `vscode.openWith` 로 default text editor 다시 열기
  - `openUrl` — 구글맵 같은 외부 URL

## 개발

```bash
cd vibecode-image-viewer
npm install
npm run build       # sync → esbuild bundle
npm run typecheck
npm run lint
npm run sync:check  # CI 게이트
npm run package     # .vsix
```

## v0.1 한계

- HEIC 는 미리보기 placeholder + EXIF 만
- 멀티 페이지 이미지 (애니메이션 GIF/WEBP 는 브라우저가 그대로 재생, ICO multi-frame 은 첫 프레임만)
- TIFF 미지원 (`*.tif` / `*.tiff` 추가 시 webview 가 렌더 못 함 — HEIC 와 같은 처리 필요)
- 메타데이터 편집 불가 (read-only)
