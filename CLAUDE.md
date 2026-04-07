# 아하플러스 v2 — Claude Code 개발 규칙

## 프로젝트 개요
아하소프트 예약·영업 관리 SaaS. 디자인 시스템 가이드를 반드시 준수하여 구현합니다.

---

## ⚡ 핵심 규칙 (절대 준수)

### 색상
- **허용된 색상만 사용** — `design-rules.json`의 `colors.allowed` 목록 외 임의 색상 금지
- Primary: `#6161FF` / Hover: `#4F4FE0` / Light: `#EEF0FF`
- 위험/삭제: `#F06060` / `#E24B4A`
- 텍스트: `#212121` (primary) / `#616161` (secondary) / `#757575` (tertiary)
- Border: `#E0E0E0` (기본) / `#BDBDBD` (강조)

### 폰트
- **반드시 Pretendard 사용**
- `font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

### 버튼
- 기본 높이: `36px` / 소형: `28~32px` / `border-radius: 6px`
- 모달 하단 순서: **취소(아웃라인) → 삭제(빨강) → 저장(인디고)**

### 모달/팝업
- `border-radius: 16px`
- 오버레이: `rgba(0,0,0,0.45)` + `backdrop-filter: blur(4px)`
- 헤더 인디고 바: `4px × 18px / #6161FF / border-radius: 2px`
- 애니메이션: `modalIn 0.2s ease-out` (scale 0.95→1 + opacity)

### 탭
- **밑줄(underline) 스타일** — 박스 테두리 방식 금지
- active: `color: #6161FF; border-bottom: 2px solid #6161FF;`
- hover: `background: #EEF0FF; border-radius: 4px 4px 0 0;`

### 테이블
- thead: `background: #FAFAFA / font-size: 12px / font-weight: 600 / color: #616161`
- tbody: `font-size: 12px / color: #212121`
- 행 구분선: `1px solid #E0E0E0`

---

## 🏷️ CSS Prefix 규칙

새 화면/컴포넌트 추가 시 반드시 해당 prefix 사용:

| Prefix | 화면 |
|--------|------|
| `sm-` | 영업 (Sales Modal) |
| `sr-` | 판매 등록 |
| `rv-` | 매출 집계 |
| `sh-` | 판매 내역 |
| `cl-` | 고객 목록 |
| `rh-` | 예약 내역 |
| `dp-` | 예약금 |
| `st-` | 예약 설정 |
| `sd-` | 판매 상세 |
| `db-` | 영업 현황 |
| `pp-` | 인쇄 |
| `hm-` | 홈 |
| `sv-` | 서비스 설정 |
| `svcm-` | 분류 등록 모달 |
| `svsm-` | 서비스 등록 모달 |

---

## 🌐 i18n 규칙

한국어가 포함된 **모든 텍스트 요소**에 반드시 아래 속성 추가:

```html
<span data-i18n="namespace.key" data-ko="한글" data-en="English">한글</span>
```

- 네임스페이스: `topnav` `gnb` `cal` `rv` `sh` `cl` `sd` `db` `pp` `dp` `rh` `sv` `common`
- 툴팁: `data-i18n-tooltip-ko` / `data-i18n-tooltip-en`
- placeholder: `data-i18n-ph-ko` / `data-i18n-ph-en`

---

## 🔧 검수 명령어

```bash
# 전체 검수
python design_linter.py --target ./src --rules ./design-rules.json

# 검수 + 자동 수정
python design_linter.py --target ./src --rules ./design-rules.json --fix

# HTML 리포트 생성
python design_linter.py --target ./src --output report.html

# 단일 파일 검수
python design_linter.py --target index.html --rules ./design-rules.json
```

---

## 📋 용어 대조표

| 한국어 | 영문 |
|--------|------|
| 고객 | Client |
| 예약 | Booking |
| 정액권 | Prepaid Card |
| 티켓 | Prepaid Service |
| 회원권 | Membership |
| 미수금 | Outstanding |
| 담당자 | Staff |
| 예약완료 | Completed |
| 고객입장 | Arrived |
| 계산완료 | Checked Out |
| 노쇼 | No-show |

---

## 🚫 절대 금지

- 디자인 가이드에 없는 HEX 색상 임의 사용
- Pretendard 외 폰트 단독 사용
- 탭에 박스 테두리 방식(box border) 사용
- 한국어 텍스트에 i18n 속성 누락
- prefix 없는 커스텀 CSS 클래스 추가
- 모달 border-radius 16px 미만 사용
