# Mythos Study

GitHub Pages: https://yabsed.github.io/Mythos-Study/

![Mythos Study preview](./image.png)

FreeBSD-SA-26:08.rpcsec_gss와 CVE-2026-4747을 시각적으로 설명하는 React 기반 웹 페이지입니다. RPCSEC_GSS 패킷 검증 과정에서 발생할 수 있는 스택 버퍼 오버플로우를 간단한 의사코드와 인터랙티브 시뮬레이션으로 보여 줍니다.

## 주요 내용

- 작은 요청, 큰 요청, 패치 적용, 접근 차단 상황을 비교하는 시뮬레이션
- 취약점이 발생하는 흐름을 설명하는 의사코드 뷰
- FreeBSD 보안 권고문 한국어 요약 및 수정 버전 정보
- 관련 FreeBSD cgit 커밋과 CVE 참고 링크

## 실행 방법

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```
