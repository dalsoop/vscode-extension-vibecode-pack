# Product V2 - Vibecode Show File Lines

> 셀링 전용 문서. 개발 README가 아니라 마켓플레이스 설명, 썸네일 기획, 소개 이미지 제작에 쓰는 메시지다.

## 한 줄 판매 문구

워크스페이스 파일을 라인 수로 정렬해 너무 커진 파일과 리팩토링 대상을 바로 찾는다.

## 어떤 목적으로 쓰나

코드베이스에서 조용히 커진 파일을 빠르게 찾는다. `.gitignore`, `.lineignore`, VSCode `files.exclude`를 존중하고, 바이너리와 큰 파일을 건너뛰면서 라인 수 기준으로 리팩토링 후보를 보여주는 용도다.

## 누구에게 팔아야 하나

- 코드베이스 정리와 리팩토링 대상을 찾는 개발자
- 레거시 프로젝트의 큰 파일을 줄이고 싶은 팀
- 코드 리뷰 전에 비정상적으로 큰 파일을 확인하고 싶은 리드

## 사용법 시나리오

1. Activity Bar에서 Vibecode File Lines를 연다.
2. Line Ranking 트리에서 라인 수가 큰 파일을 확인한다.
3. Flat ranking 또는 group-by-extension으로 관점을 바꾼다.
4. warnThreshold 이상 파일을 우선 리팩토링 후보로 본다.
5. 설정에서 topN, ignore, binary extension 옵션을 조정한다.

## 썸네일 제작 지시

- 실제 그릴 장면: VSCode 사이드바에 `fileA.ts 2,431 lines`, `legacy.js 1,920 lines`처럼 랭킹이 보이고, 큰 파일이 경고 색으로 강조된 장면.
- 반드시 보여야 할 목적: "라인 수가 큰 파일을 찾아 리팩토링한다"가 보여야 한다.
- 시각 요소: 순위 목록, 막대 그래프 느낌의 라인 수 시각화, 경고 threshold, group-by-extension 탭.
- 피할 것: 숫자 없는 파일 아이콘 목록, 추상 차트만 있는 이미지.

## 썸네일 카피

`Find the files that got too big`

