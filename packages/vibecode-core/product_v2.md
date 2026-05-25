# Product V2 - Vibecode Core

> 셀링 전용 문서. 개발 README가 아니라 마켓플레이스 설명, 썸네일 기획, 소개 이미지 제작에 쓰는 메시지다.

## 한 줄 판매 문구

Vibecode 확장들이 공유하는 `.env` 암호화 전략 코어로, normal, dotenvx, future secret backend를 한 인터페이스로 묶는다.

## 어떤 목적으로 쓰나

`.env` 보안 편집 기능을 여러 확장에서 재사용하기 위한 내부 기반이다. `none`, `dotenvx`, `infisical` 같은 전략을 같은 `CryptoStrategy` 계약으로 다루고, 준비되지 않은 전략은 안전하게 기본 동작으로 폴백하는 구조를 제공한다.

## 누구에게 팔아야 하나

- Vibecode `.env` 계열 확장을 계속 확장하려는 개발자
- dotenvx 외의 secret backend를 추가하려는 팀
- UI 확장과 암호화 로직을 분리해 유지보수하고 싶은 사람

## 사용법 시나리오

1. 확장에서 사용자가 선택한 암호화 전략 id를 읽는다.
2. `.env` 파일 경로를 `EnvFileRef`로 넘긴다.
3. `resolveStrategyById`로 실제 전략을 얻는다.
4. 값 저장 시 `encryptValue`를 호출한다.
5. 값 표시 또는 편집 시 `decryptValue`와 `isReady` 결과에 따라 안전하게 처리한다.

## 썸네일 제작 지시

- 실제 그릴 장면: 가운데 `CryptoStrategy` 코어 박스가 있고, 왼쪽에는 `.env` 에디터 확장, 오른쪽에는 `none`, `dotenvx`, `infisical` 전략 모듈이 플러그인처럼 연결된 아키텍처 장면.
- 반드시 보여야 할 목적: "Vibecode secret editor의 암호화 엔진"이라는 역할이 보여야 한다.
- 시각 요소: `.env` 파일, `encrypted:` 값, `.env.keys`, 전략 선택 드롭다운, 모듈형 커넥터.
- 피할 것: 단순 자물쇠 아이콘, 구현 코드만 가득한 화면, 제품 UI처럼 보이는 과장된 대시보드.

## 썸네일 카피

`One crypto core for Vibecode secrets`

