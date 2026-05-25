# Product V2 - Vibecode Browser Preview Pro

> 셀링 전용 문서. 개발 README가 아니라 마켓플레이스 설명, 썸네일 기획, 소개 이미지 제작에 쓰는 메시지다.

## 한 줄 판매 문구

HTML 프리뷰 위에서 요소를 집고, CSS 변경을 기록하고, 퍼블리싱 핸드오프 스냅샷까지 저장하는 Pro 프리뷰.

## 어떤 목적으로 쓰나

디자인 검수와 퍼블리싱 수정 사항을 말로 설명하지 않고, 실제 페이지 위에서 선택한 요소와 변경 내용을 스냅샷으로 남긴다. 디바이스 프리셋, force state, assets, changes 탭을 통해 프론트엔드 핸드오프를 빠르게 정리하는 용도다.

## 누구에게 팔아야 하나

- HTML/CSS 검수와 수정 지시를 반복하는 디자이너, 퍼블리셔, 프론트엔드 개발자
- hover/focus 같은 상태를 확인해야 하는 UI 작업자
- 변경 전후와 수정 메모를 파일로 남겨 전달해야 하는 팀

## 사용법 시나리오

1. HTML 파일을 Vibecode Browser Preview Pro로 연다.
2. Inspector를 켜고 페이지 요소를 클릭해 핀으로 고정한다.
3. class, inline style, force state, notes를 조정한다.
4. Changes 탭에서 변경 목록을 확인한다.
5. Save Snapshot으로 HTML, assets, changes.md, zip을 저장해 전달한다.

## 썸네일 제작 지시

- 실제 그릴 장면: VSCode 안 프리뷰 페이지에서 버튼 하나가 선택되어 outline이 생기고, 오른쪽 패널에 Pins/Changes/Assets 탭과 CSS 변경 목록이 보이는 장면.
- 반드시 보여야 할 목적: "페이지를 보면서 요소를 찍고 변경사항을 핸드오프한다"가 보여야 한다.
- 시각 요소: 선택된 DOM 요소, CSS 속성 패널, Mobile/Desktop 디바이스 선택, Save Snapshot 버튼, changes.md 미리보기.
- 피할 것: Pro라는 글자만 강조한 배지, SVG 아이콘 모음, 실제 페이지 없이 패널만 있는 이미지.

## 썸네일 카피

`Inspect, tweak, snapshot`

