# 💳 04. 수강료 청구 및 수납 관리 도메인 (Billing & Tuition Domain)

## 📌 도메인 개요

수납 도메인은 **매월 원생별 수강료 청구서(TuitionInvoice)를 자동 생성하고, 다양한 결제 수단(카드, 현금, 계좌이체 등)으로 수납된 내역(TuitionPayment)을 추적하며, 미납자 관리 및 매출 통계를 지원**하는 재정 핵심 도메인입니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `TuitionInvoice` (수강료 청구서)
* **역할**: 매월 원생에게 청구되는 수강료 청구 명세.
* **청구 상태 (`InvoiceStatus`)**:
  * `UNPAID`: 미납 (청구서 발행 후 결제 전)
  * `PARTIALLY_PAID`: 부분 수납 (수강료의 일부만 결제된 상태)
  * `PAID`: 완납 (전액 수납 완료)
  * `VOID`: 취소/무효 (휴원/퇴원 또는 오발행으로 취소된 청구서)
* **주요 필드**:
  * `billingYearMonth`: 청구 년월 (`YYYY-MM`, 예: "2026-09")
  * `originalAmount`: 정규 수강료 원금
  * `discountAmount`: 형제 할인/장학 할인/이벤트 할인 금액
  * `finalAmount`: 최종 청구 금액 (`originalAmount - discountAmount`)
  * `paidAmount`: 현재까지 누적 수납된 금액
  * `dueDate`: 납부 마감일 (`YYYY-MM-DD`)
  * `description`: 청구 항목 상세 (예: "9월 정규반 수강료 + 교재비")

### 2) `TuitionPayment` (수납/결제 이력)
* **역할**: 실제 결제 발생 시 기록되는 개별 수납 영수증.
* **결제 수단 (`PaymentMethod`)**:
  * `CARD`: 신용 / 체크카드 현장 결제
  * `CASH`: 현금 수납 (현금영수증 발행 대상)
  * `BANK_TRANSFER`: 가상계좌 / 학원 계좌이체
  * `EASY_PAY`: 카카오페이 / 네이버페이 등 간편결제
  * `OTHER`: 기타 상품권 등
* **주요 필드**:
  * `amount`: 이번 회차 결제 금액
  * `paidAt`: 결제 승인 일시
  * `receiptNumber`: 영수증 / 카드 승인 번호
  * `processedById`: 수납을 처리한 직원 User ID (`processedBy`)
  * `memo`: 결제 관련 메모 (예: "1회차 분할 납부")

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / 작업 | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **월간 수강료 청구서 일괄 자동 생성** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **개별 청구서 금액 할인/수정/취소** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **수강료 수납 처리 (카드/현금/이체 등록)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **미납자 명단 조회 및 카카오 납부 안내 발송** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **학원 월별 매출/수납률 통계 대시보드** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🔄 3. 수강료 청구 및 완납 라이프사이클

```text
[ 1. 매월 1일: 수강료 청구서 자동 발행 ] 
       │  (InvoiceStatus: UNPAID, finalAmount: 350,000원)
       ▼
[ 2. 학부모 납부 안내 알림톡 자동 발송 ]
       │
       ├── (사례 A: 전액 350,000원 카드 결제)
       │      │
       │      ▼
       │   [ TuitionPayment 생성: 350,000원 ] ──> InvoiceStatus: PAID (완납 🎉)
       │
       └── (사례 B: 200,000원 분할 납부)
              │
              ▼
           [ TuitionPayment 생성: 200,000원 ] ──> InvoiceStatus: PARTIALLY_PAID (잔액 150,000원)
```

---

## 📡 4. RESTful API 명세 (API Specifications)

> 구현 위치: `backend/src/tuition/` (`tuition.controller.ts`, `tuition.service.ts`). 모든 엔드포인트는 `JwtAuthGuard` + `RolesGuard`로 보호되며, `@CurrentUser('academyId')`로 테넌시가 강제됩니다.

### 4.1. 월간 수강료 청구서 일괄 자동 생성
* **엔드포인트**: `POST /tuition/invoices/generate`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Request Body (`GenerateInvoicesDto`)**:
  ```json
  {
    "billingYearMonth": "2026-09",
    "dueDate": "2026-09-10",
    "classId": 1
  }
  ```
  * `classId`는 선택 값이며, 생략 시 학원 전체 반이 대상입니다.
* **Response Body (`GenerateInvoicesResultDto`)**:
  ```json
  {
    "billingYearMonth": "2026-09",
    "createdCount": 38,
    "skippedCount": 2,
    "totalInvoicedAmount": 12500000,
    "invoices": [ /* InvoiceResponseDto[] */ ]
  }
  ```
* **동작 특성**:
  * 대상 원생: 청구 대상월 기준 활성 수강(`EnrollmentStatus.ENROLLED`)이 있고 재원 상태가 `StudentStatus.ACTIVE`인 원생만 청구 대상입니다. 휴원(`ON_LEAVE`)/퇴원(`DISCHARGED`) 원생은 자동 제외됩니다.
  * 청구서는 **원생 단위 1건**으로 생성되며, 금액(`originalAmount`)은 해당 원생이 수강 중인 모든 반의 `monthlyFee` 합산입니다.
  * 이미 해당 `billingYearMonth`에 청구서가 존재하는 원생은 건너뛰어(`skippedCount`) 중복 청구를 방지합니다 — 여러 번 호출해도 안전(idempotent)합니다.

### 4.2. 청구서 목록 조회 (필터 & 페이징)
* **엔드포인트**: `GET /tuition/invoices?billingYearMonth=2026-09&status=UNPAID&search=김민준&page=1&limit=20`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Response Body (`PaginatedInvoiceResponseDto`)**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "studentId": 10,
        "billingYearMonth": "2026-09",
        "originalAmount": 350000,
        "discountAmount": 30000,
        "finalAmount": 320000,
        "paidAmount": 200000,
        "remainingAmount": 120000,
        "status": "PARTIALLY_PAID",
        "dueDate": "2026-09-10",
        "student": { "id": 10, "name": "김민준", "grade": "중2", "parentPhone": "010-1234-5678" }
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
  ```

### 4.3. 청구서 상세 조회
* **엔드포인트**: `GET /tuition/invoices/:id`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Response Body (`InvoiceResponseDto`)**: 상세 정보에 `payments: PaymentResponseDto[]` (수납 이력, 최신순)가 함께 포함됩니다.

### 4.4. 개별 청구서 할인/수정
* **엔드포인트**: `PATCH /tuition/invoices/:id`
* **권한**: `SUPER_ADMIN`, `OWNER`
* **Request Body (`UpdateInvoiceDto`)**:
  ```json
  {
    "discountAmount": 30000,
    "dueDate": "2026-09-15",
    "description": "9월 정규반 수강료 + 형제 할인 적용"
  }
  ```
* **동작 특성**: `finalAmount = originalAmount - discountAmount`로 재계산되고, 기존 `paidAmount`와 비교해 청구 상태(`status`)도 함께 재산정됩니다. 취소(`VOID`)된 청구서는 수정할 수 없으며(400), 할인 금액이 `originalAmount`를 초과하면 거부됩니다(400).

### 4.5. 청구서 취소 (VOID)
* **엔드포인트**: `PATCH /tuition/invoices/:id/void`
* **권한**: `SUPER_ADMIN`, `OWNER`
* **동작 특성**: 이미 수납된 금액(`paidAmount > 0`)이 있는 청구서는 취소할 수 없습니다(400) — 결제 기록만 남고 청구서가 사라지는 회계 불일치를 방지하기 위한 방어 규칙이며, 환불 처리 후 다시 시도해야 합니다.

### 4.6. 수강료 수납 처리
* **엔드포인트**: `POST /tuition/invoices/:id/payments`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Request Body (`CreatePaymentDto`)**:
  ```json
  {
    "amount": 200000,
    "method": "BANK_TRANSFER",
    "paidAt": "2026-09-05T10:30:00.000Z",
    "receiptNumber": "RCP-20260905-0001",
    "memo": "1회차 분할 납부"
  }
  ```
* **동작 특성**: `TuitionPayment` 기록 생성과 동시에 `TuitionInvoice.paidAmount`를 누적하고 상태를 재계산합니다(전액 도달 시 `PAID`, 일부만 도달 시 `PARTIALLY_PAID`). 잔여 청구 금액(`finalAmount - paidAmount`)을 초과하는 결제는 과오납 방지를 위해 거부됩니다(400). 취소된 청구서에는 수납을 등록할 수 없습니다(400).

### 4.7. 미납자 명단 조회
* **엔드포인트**: `GET /tuition/invoices/unpaid?billingYearMonth=2026-09`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Response Body**: `InvoiceResponseDto[]` — `UNPAID` 및 `PARTIALLY_PAID` 상태의 청구서를 납부 마감일(`dueDate`) 오름차순으로 반환합니다.

### 4.8. 미납자 대상 카카오 납부 안내 알림톡 발송
* **엔드포인트**: `POST /tuition/invoices/:id/send-reminder`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **동작 특성**: `NotificationsService`를 재사용해 `NotificationType.TUITION_DUE` / `NotificationChannel.KAKAO` 알림을 학부모 연락처(`student.parentPhone`)로 발송합니다. 완납(`PAID`) 또는 취소(`VOID`)된 청구서에는 발송할 수 없습니다(400).

### 4.9. 학원 월별 매출/수납률 통계
* **엔드포인트**: `GET /tuition/stats?billingYearMonth=2026-09`
* **권한**: `SUPER_ADMIN`, `OWNER`
* **Response Body (`RevenueStatsResponseDto`)**:
  ```json
  {
    "billingYearMonth": "2026-09",
    "totalInvoicedAmount": 12500000,
    "totalCollectedAmount": 9800000,
    "collectionRate": 78.4,
    "paidCount": 5,
    "unpaidCount": 3,
    "voidCount": 0
  }
  ```
* **동작 특성**: 취소(`VOID`)된 청구서는 총 청구액/수납액 집계에서 제외됩니다.
