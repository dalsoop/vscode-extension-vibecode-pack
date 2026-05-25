# Product V2 - Vibecode Right-Click VSIX Package & Install

> 셀링 전용 문서. 개발 README가 아니라 마켓플레이스 설명, 썸네일 기획, 소개 이미지 제작에 쓰는 메시지다.

## 한 줄 판매 문구

VSCode 확장 폴더를 우클릭해서 `.vsix` 패키징과 현재 VSCode 설치를 한 번에 실행한다.

## 어떤 목적으로 쓰나

확장 모노레포에서 여러 확장을 반복 개발할 때 `npm run package`, `.vsix` 파일명 확인, `code --install-extension` 입력을 줄인다. 선택한 폴더가 확장인지 확인하고 통합 터미널에서 패키징과 설치 과정을 이어서 실행하는 용도다.

## 누구에게 팔아야 하나

- VSCode 확장을 직접 개발하는 사람
- 모노레포에서 여러 확장을 번갈아 패키징하는 팀
- 만든 확장을 바로 자기 VSCode에 설치해 테스트해야 하는 개발자

## 사용법 시나리오

1. Explorer에서 VSCode 확장 폴더를 우클릭한다.
2. Package & Install VSCode Extension 명령을 선택한다.
3. 통합 터미널에서 의존성 설치, 패키징, 설치가 순서대로 실행된다.
4. 성공하면 VSCode reload 안내를 확인한다.
5. 실패하면 터미널 출력에서 어느 단계가 실패했는지 본다.

## 썸네일 제작 지시

- 실제 그릴 장면: VSCode Explorer에서 확장 폴더를 우클릭하고, 아래 터미널에는 `.vsix` 생성과 `code --install-extension` 성공 로그가 이어지는 장면.
- 반드시 보여야 할 목적: "확장 폴더를 바로 패키징하고 설치한다"가 보여야 한다.
- 시각 요소: extension `package.json`, `.vsix` 파일, 설치 화살표, VSCode reload 프롬프트, 터미널 단계 로그.
- 피할 것: 박스 패키지 아이콘만 그리기, VSCode 로고만 반복하기, 실제 우클릭 흐름 없는 이미지.

## 썸네일 카피

`Package and install VSIX in one click`

