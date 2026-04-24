/* ============================================================
 * policyContent.ts
 * 개인정보 처리방침·이용약관 본문 (앱 내 표시용)
 * ============================================================ */

export type PolicyType = "privacy" | "terms";
export type PolicyLang = "ko" | "en";

export const POLICY_META = {
  company: { ko: "스프랩가든", en: "Sprout Lab Garden" },
  email: "sproutlabgarden@gmail.com",
  effectiveDate: "2026-04-15",
  version: "1.0",
} as const;

/* ── Privacy (KO) */
const PRIVACY_KO = `**최종 수정일: ${POLICY_META.effectiveDate}**

${POLICY_META.company.ko}(${POLICY_META.company.en}, 이하 "회사")은 모바일 게임 **Garden 2048**(이하 "서비스")을 제공함에 있어, 이용자의 개인정보를 매우 중요하게 생각하며 「개인정보 보호법」, GDPR, CCPA 및 Google Play Developer Program Policies 를 준수합니다.

## 1. 수집하는 정보

### 자동 수집 정보
- 단말기: 모델, OS 버전, 언어, 화면 크기
- 광고 식별자: Android 광고 ID (AAID)
- 네트워크: IP 주소(대략적 위치), 통신사
- 사용 정보: 세션 시간, 광고 노출/클릭 이력

### 단말기 저장 정보 (서버 미전송)
- 게임 진행 상황 (클리어 단계, 점수, 코인, 인벤토리)
- 카드 도감, 미션 진행도
- 환경 설정 (테마·언어·사운드)
- 구독 상태 플래그

### 결제 정보
Google Play Billing 이 결제를 처리하며, 회사는 카드번호 등 결제 수단을 직접 수집·보관하지 않습니다.

## 2. 이용 목적
1. 서비스 제공 및 게임 진행 저장·복원
2. 광고 서비스 (AdMob) 제공
3. 통계 분석 및 품질 개선
4. 부정 이용 방지
5. 법령상 의무 이행

## 3. 보유 기간
- 단말기 저장 데이터: 앱 삭제 시 즉시 제거
- 광고 식별자: AdMob 정책에 따라 최대 14개월
- 결제 정보: 관련 법령에 따라 Google Play 가 5년간 보관

## 4. 제3자 처리위탁
| 수탁자 | 업무 |
|--------|------|
| Google AdMob | 광고 노출 및 측정 |
| Google Play Billing | 구독 결제 처리 |
| Google Play Services | 인증·업데이트 |

## 5. 광고 ID
- Google AdMob SDK 를 통해 광고를 표시합니다.
- Android 14+ 에서는 시스템 설정 > 개인정보 보호 > 광고 에서 광고 ID 를 삭제할 수 있습니다.
- 만 13세 미만으로 식별될 경우 비개인화 광고(NPA)로 전환됩니다.

## 6. 아동 개인정보 보호
본 서비스는 만 13세 이상 권장이며, Google Play Families 정책을 준수합니다. 보호자가 자녀의 개인정보 수집을 인지한 경우 즉시 삭제 요청할 수 있습니다.

## 7. 이용자의 권리
- 개인정보 열람·정정·삭제·처리 정지 요청
- 광고 ID 재설정/삭제 (단말기 설정)
- 구독 해지 (Google Play > 정기 결제)
- 앱 삭제로 단말기 저장 정보 일괄 제거

## 8. 안전성 확보 조치
- 단말기 저장 데이터는 외부 전송이 없습니다.
- 분석 데이터는 익명·집계 형태입니다.
- 결제·광고 SDK 통신은 HTTPS 로 암호화됩니다.

## 9. 문의처
- 회사명: ${POLICY_META.company.ko} (${POLICY_META.company.en})
- 이메일: ${POLICY_META.email}
- 응답 기한: 영업일 7일 이내

## 10. 정책 변경
법령·서비스 변경에 따라 개정될 수 있으며, 시행 7일 전(불리한 변경 시 30일 전) 앱 내 공지합니다.

---
버전 ${POLICY_META.version} · 시행일 ${POLICY_META.effectiveDate}`;

/* ── Privacy (EN) */
const PRIVACY_EN = `**Last Updated: ${POLICY_META.effectiveDate}**

${POLICY_META.company.en} ("Company", "we") values your privacy. This Policy explains how we collect, use, share, and protect your information when you use our mobile game **Garden 2048** ("Service"), in accordance with GDPR, CCPA, and Google Play Developer Program Policies.

## 1. Information We Collect

### Automatically Collected
- Device: model, OS, language, screen size
- Advertising ID: Android Advertising ID (AAID)
- Network: IP address (approximate location), carrier
- Usage: session length, ad impressions/clicks

### Stored Locally (Not Transmitted)
- Game progress (cleared stages, score, coins, inventory)
- Card collection, mission progress
- Settings (theme, language, sound)
- Subscription state flags

### Payment Information
Subscriptions are processed by Google Play Billing. We do not directly collect or store payment methods.

## 2. How We Use It
1. Service provision and progress save/restore
2. AdMob personalized ads
3. Statistical analysis and quality improvement
4. Abuse prevention
5. Legal compliance

## 3. Retention
- Locally stored: Deleted upon app uninstall
- Advertising ID: Per AdMob policy (up to 14 months)
- Payment data: Retained by Google Play for 5 years

## 4. Third-Party Processors
| Processor | Purpose |
|-----------|---------|
| Google AdMob | Ad serving and measurement |
| Google Play Billing | Subscription payments |
| Google Play Services | Authentication, updates |

## 5. Advertising ID
- The Service uses Google AdMob to display ads.
- Android 14+: reset/delete via Settings > Privacy > Ads.
- Users under 13 receive Non-Personalized Ads (NPA).

## 6. Children's Privacy
The Service is intended for users aged 13+ and complies with Google Play Families Policy. Parents may request deletion of any inadvertently collected child data.

## 7. Your Rights
- Access, correction, deletion, restriction
- Reset/delete Advertising ID (device settings)
- Cancel subscription (Google Play > Subscriptions)
- Delete app to remove all locally stored data

## 8. Security
- Local data is not transmitted externally.
- Analytics use anonymized, aggregated data.
- Payment and ad SDK communication is encrypted via HTTPS.

## 9. CCPA (California)
California residents have rights to know, delete, and opt out of the sale of personal information. We do not sell personal information for monetary consideration.

## 10. GDPR (EU/EEA)
- Lawful bases: legitimate interest, consent, contract performance
- Data Controller: ${POLICY_META.company.en}
- Rights: access, rectification, deletion, restriction, portability, objection, complaint to supervisory authority

## 11. Contact
- Company: ${POLICY_META.company.en} (${POLICY_META.company.ko})
- Email: ${POLICY_META.email}
- Response time: Within 7 business days

## 12. Changes
We may update this Policy. Material changes will be announced 7 days in advance (30 days for adverse changes) via in-app notice.

---
Version ${POLICY_META.version} · Effective ${POLICY_META.effectiveDate}`;

/* ── Terms (KO) */
const TERMS_KO = `**최종 수정일: ${POLICY_META.effectiveDate}**

본 약관은 ${POLICY_META.company.ko}(${POLICY_META.company.en}, 이하 "회사")이 제공하는 모바일 게임 **Garden 2048**(이하 "서비스")의 이용 조건을 규정합니다.

## 제1조 (목적)
본 약관은 서비스 이용에 관한 회사와 이용자의 권리·의무·책임을 규정합니다.

## 제2조 (용어 정의)
- **"서비스"**: Garden 2048 모바일 게임 및 관련 부가 서비스
- **"이용자"**: 본 약관에 따라 서비스를 이용하는 자
- **"콘텐츠"**: 서비스 내 모든 디지털 정보
- **"게임 내 재화"**: 코인·골드 등 가상 재화
- **"유료 콘텐츠"**: 구독·인앱결제 등 결제 콘텐츠

## 제3조 (약관 변경)
회사는 관련 법령 위반 없이 본 약관을 개정할 수 있으며, 시행 7일 전(불리한 변경 시 30일 전) 공지합니다. 계속 이용 시 동의로 간주됩니다.

## 제4조 (서비스 제공)
- 2048 퍼즐 게임 플레이
- 카드·아이템·구독 등 부가 콘텐츠
- 광고 노출 기반 무료 이용 모델
- 연중무휴 24시간 (점검·장애 시 일시 중단 가능)

## 제5조 (이용자 의무)
다음 행위를 금지합니다.
1. 자동화·매크로·핵·메모리 변조
2. 역공학·복제·재배포
3. 지식재산권 침해
4. 게임 내 재화·계정의 현금 거래(RMT)
5. 서비스 운영 방해
위반 시 사전 통지 없이 이용 제한될 수 있습니다.

## 제6조 (게임 내 재화)
- 서비스 내에서만 사용 가능, 현금화·환전·양도 불가
- 무상 지급 재화는 환불 대상 아님
- 회사는 운영상 수치·획득 방법을 변경할 수 있으며 사전 공지

## 제7조 (구독 및 결제)
**프리미엄 패스 (월 정기 구독)**
- 결제 즉시 활성화, 매월 자동 갱신
- 다음 결제 24시간 전까지 미해지 시 자동 갱신
- 해지: Google Play > 메뉴 > 정기 결제 관리

**무료 체험**
- 1회 24시간 무료 체험 제공
- 체험 종료 후 자동 결제되지 않으며, 별도 결제 동의 필요

**인앱 결제**
- Google Play Billing 을 통해 처리

## 제8조 (청약 철회 및 환불)
결제일로부터 7일 이내 청약 철회가 가능하나, 다음의 경우 제한됩니다.
- 결제 후 즉시 적용된 콘텐츠
- 일부 사용으로 가치가 현저히 감소한 콘텐츠
- 사용 개시된 1회성 아이템

환불은 Google Play 정책에 따라 처리됩니다.

## 제9조 (미성년자 결제)
법정대리인 동의 없는 미성년자 결제는 취소할 수 있습니다. 단, 동의 범위 내 처분 또는 속임수로 성년자로 믿게 한 경우는 제외됩니다.

## 제10조 (지식재산권)
서비스 내 모든 콘텐츠의 저작권은 회사 또는 정당한 권리자에게 귀속됩니다. 비영리 게임 플레이 영상 공유는 허용됩니다.

## 제11조 (광고)
- Google AdMob 등의 광고를 노출할 수 있습니다.
- 광고 시청 보상 조건은 서비스 내 표시에 따릅니다.
- 광고 연결 페이지/상품의 책임은 광고주에게 있습니다.

## 제12조 (계정 및 데이터)
- 별도 회원 가입 없이 이용 가능, 모든 데이터는 단말기에 저장
- 단말기 변경·앱 삭제·OS 초기화로 인한 데이터 손실 책임 없음
- Google 계정 연동(선택) 시 클라우드 백업 가능

## 제13조 (이용 제한)
- 1단계 경고 → 2단계 일시 정지 → 3단계 영구 정지
- 중대한 위반은 즉시 영구 정지
- 이의 신청 가능, 합리적 기간 내 답변

## 제14조 (면책)
- 천재지변·통신 장애·정전 등 불가항력에 대한 책임 없음
- 단말기·네트워크·제3자 SDK 장애로 인한 손해는 고의·중과실 없는 한 책임 없음
- 무료 서비스 손해는 고의·중과실 없는 한 책임 없음

## 제15조 (분쟁 해결)
- 대한민국 법령에 따라 해석·집행
- 협의 우선, 미해결 시 민사소송법상 관할 법원

---
**회사 정보**
- ${POLICY_META.company.ko} (${POLICY_META.company.en})
- 문의: ${POLICY_META.email}

버전 ${POLICY_META.version} · 시행일 ${POLICY_META.effectiveDate}`;

/* ── Terms (EN) */
const TERMS_EN = `**Last Updated: ${POLICY_META.effectiveDate}**

These Terms govern your use of the mobile game **Garden 2048** ("Service") provided by ${POLICY_META.company.en} ("Company"). By using the Service, you agree to these Terms.

## 1. Acceptance
By accessing the Service, you confirm you have read and agree to these Terms and our Privacy Policy.

## 2. Definitions
- **"Service"**: Garden 2048 mobile game and related features
- **"User"**: anyone who uses the Service
- **"Content"**: all digital materials within the Service
- **"Virtual Goods"**: coins, gold, in-game currency
- **"Paid Content"**: subscriptions and in-app purchases

## 3. Modifications
We may revise these Terms in compliance with applicable laws. Material changes are announced 7 days in advance (30 days for adverse changes). Continued use constitutes acceptance.

## 4. Service
- 2048-based puzzle gameplay
- Cards, items, subscriptions
- Free-to-play model supported by ads
- 24/7 in principle (subject to maintenance)

## 5. User Obligations
You agree NOT to:
1. Use automation, macros, hacks, or memory modification
2. Reverse-engineer, copy, or redistribute the Service
3. Infringe intellectual property rights
4. Engage in real-money trading (RMT) of accounts/goods
5. Disrupt Service operation

Violations may result in restriction or termination without prior notice.

## 6. Virtual Goods
- Usable only within the Service; not exchangeable for cash, transferable, or sellable
- Free-of-charge goods are not refundable
- Effects/values may change with prior notice

## 7. Subscriptions and Payments
**Premium Pass (Monthly)**
- Activates immediately, auto-renews monthly
- Cancel at least 24 hours before renewal
- Cancel via: Google Play > Menu > Subscriptions

**Free Trial**
- One-time 24-hour trial available
- Does not auto-charge; explicit consent required for any subsequent payment

**In-App Purchases**
- Processed by Google Play Billing

## 8. Refunds
You may withdraw within 7 days of payment, except for:
- Content used or applied immediately
- Content with substantially diminished value from partial use
- Single-use items already opened/consumed

Refunds follow Google Play policy.

## 9. Minors
Purchases made by minors without legal guardian consent may be cancelled, except where the guardian has consented or the minor misrepresented their age.

## 10. Intellectual Property
All Content within the Service is owned by the Company or its licensors. Non-commercial sharing of gameplay screenshots/videos is permitted.

## 11. Advertising
- We display ads via Google AdMob and similar networks.
- Reward conditions follow in-Service display.
- Linked third-party pages/products are the responsibility of advertisers.

## 12. Account and Data
- No registration required; all data is stored on your device
- We are not liable for data loss from device changes, app deletion, or OS reinstallation
- Optional Google account linking enables cloud backup per Google's policies

## 13. Suspension
- Step 1: Warning → Step 2: Temporary suspension → Step 3: Permanent termination
- Severe violations may result in immediate permanent termination
- Appeals are reviewed within a reasonable timeframe

## 14. Disclaimers
- Not liable for force majeure events (natural disasters, network outages, blackouts)
- Not liable for damages from device/network/third-party SDK issues, except for willful misconduct or gross negligence
- Not liable for damages from free Service use, except for willful misconduct or gross negligence

## 15. Governing Law
- Governed by the laws of the Republic of Korea
- Disputes resolved by good-faith discussion; otherwise via the competent court under Korean Civil Procedure Act

---
**Company Information**
- ${POLICY_META.company.en} (${POLICY_META.company.ko})
- Contact: ${POLICY_META.email}

Version ${POLICY_META.version} · Effective ${POLICY_META.effectiveDate}`;

export const POLICY_CONTENT: Record<PolicyType, Record<PolicyLang, string>> = {
  privacy: { ko: PRIVACY_KO, en: PRIVACY_EN },
  terms:   { ko: TERMS_KO,   en: TERMS_EN   },
};

export const POLICY_TITLES: Record<PolicyType, Record<PolicyLang, string>> = {
  privacy: { ko: "개인정보 처리방침", en: "Privacy Policy" },
  terms:   { ko: "이용약관",          en: "Terms of Service" },
};
