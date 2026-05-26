# vibecode-image-redact

스크린샷·이미지에서 **민감 영역을 가린 PNG 를 만들어주는** 가벼운 도구. 우클릭으로 호출 → webview 패널 → 박스 드래그로 영역 지정 → 3가지 redaction 스타일 (블러 / 픽셀화 / 단색) → 다중 영역 누적 → PNG 저장.

이미지 시리즈의 다른 확장:
- [vibecode-image-viewer](../vibecode-image-viewer/) — 이미지 + EXIF read-only
- [vibecode-image-edit](../vibecode-image-edit/) — 아이드롭퍼, 크로마키, 크롭

이 확장은 **공유 전 마스킹** 에만 집중 — image-edit 와 의도적으로 분리.

## 동작

1. Explorer 또는 에디터 타이틀 바에서 이미지 우클릭 → **Vibecode Image - Redact**
2. 우측 패널에서 스타일 선택 (블러 / 픽셀화 / 단색)
3. 이미지 위에서 박스 드래그 → 영역 추가 → 캔버스에 즉시 적용
4. 사이드바 "영역 목록" 에서 개별 제거 또는 모두 지우기
5. **PNG 저장** → 원본 옆에 `<basename>-<YYMMDDHHMMSS>.png`

## 스타일

| 스타일 | 알고리즘 | 파라미터 | 추천 용도 |
|--------|----------|---------|----------|
| **블러** | `ctx.filter = 'blur(Npx)'` + clip | 강도 2–40 | 얼굴, 배경의 부드러운 가림 |
| **픽셀화** | 영역 다운샘플 후 nearest-neighbor 업스케일 | 블록 크기 4–60 | API 키, 토큰, 비밀번호 |
| **단색** | `fillRect` | hex 색 (기본 #000000) | 완전 차단, 흑백 출판용 |

## 지원 포맷

입력: **PNG / JPG / JPEG / WEBP / GIF / BMP**  
출력: **PNG only** (무손실, 가림 영역 보존)

## 아키텍처

```
vibecode-image-redact/
├── package.json                  # apps 패턴
├── i18n/{en,ko}.json
├── scripts/                       # build-ext + sync-contributions
└── src/
    ├── extension.ts              # apps → commands 등록
    ├── apps/open-editor/         # 우클릭 메뉴 (이미지 확장자 when)
    ├── panel.ts                   # 파일당 1개 webview 패널
    ├── handlers.ts                # savePng — base64 → fs.writeFile
    ├── messages.ts                # InitMessage / SavePngRequest
    ├── l10n-bundle.ts             # 타입드 L10n
    └── webview/
        ├── html.ts                # CSP + nonce + 단일 패널 레이아웃
        ├── styles.ts              # CSS
        └── client-script.ts       # canvas + 3가지 paintRegion + 영역 누적
```

### 렌더 파이프라인

```
init: img → sourceCanvas (offscreen, naturalWxH) + display
드래그 → 새 region 추가 → render():
  1. displayCtx.drawImage(sourceCanvas)            # 베이스
  2. for each region:
     - blur:     clip → ctx.filter = blur(Npx) → drawImage(source)
     - pixelate: source region → small canvas (downsample) → drawImage back (no smoothing)
     - solid:    fillRect with color
저장: display.toBlob('image/png') → base64 → host
```

## 한계

- 사각형 영역만 지원 (자유곡선·다각형 미지원)
- Undo 없음 — 영역 목록에서 제거로 대체
- 다중 이미지 동시 편집 불가 (한 파일에 한 패널)
- 출력 항상 PNG (포맷 변환 미지원)
- 블러는 `ctx.filter: blur()` 의 GPU 가속 의존 — 매우 큰 이미지에서는 성능 저하 가능
