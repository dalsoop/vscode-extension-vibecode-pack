# Product V2 - Vibecode VSCode Host MCP List

> 셀링 전용 문서. 개발 README가 아니라 마켓플레이스 설명, 썸네일 기획, 소개 이미지 제작에 쓰는 메시지다.

## 한 줄 판매 문구

User, workspace, VSCode extension contributes에 흩어진 MCP 서버를 한 목록에서 확인한다.

## 어떤 목적으로 쓰나

VSCode 환경 안에서 MCP 서버가 어디에서 등록됐는지 추적하기 어렵다. 이 확장은 사용자 `mcp.json`, 워크스페이스 `mcp.json`, 확장 contributes를 모아 서버 이름, 명령, 출처를 한 화면에서 보는 진단용 목록을 제공한다.

## 누구에게 팔아야 하나

- MCP 서버를 여러 위치에 설정해 쓰는 AI 도구 사용자
- 팀 워크스페이스의 MCP 설정을 점검해야 하는 개발자
- 확장이 어떤 MCP 서버를 contributed 했는지 확인해야 하는 사람

## 사용법 시나리오

1. Activity Bar에서 MCP List를 연다.
2. User, Workspace, Extension source별 MCP 서버를 확인한다.
3. 서버 항목을 열어 command, args, transport 같은 상세 정보를 본다.
4. 필요한 command를 복사하거나 관련 `mcp.json` 파일을 연다.
5. 설정을 바꾼 뒤 refresh로 목록을 갱신한다.

## 썸네일 제작 지시

- 실제 그릴 장면: VSCode 사이드바에 MCP 서버 목록이 User/Workspace/Extension 출처별로 그룹화되고, 오른쪽 detail 패널에 command와 args가 펼쳐진 장면.
- 반드시 보여야 할 목적: "흩어진 MCP 서버 설정을 한곳에서 본다"가 보여야 한다.
- 시각 요소: `mcp.json` 파일 두 개, extension contributes 배지, 서버 리스트, detail panel, command copy 버튼.
- 피할 것: 서버 아이콘만 있는 이미지, MCP 글자만 크게 쓰기, 출처 구분 없는 추상 네트워크 이미지.

## 썸네일 카피

`See every MCP server in VSCode`

