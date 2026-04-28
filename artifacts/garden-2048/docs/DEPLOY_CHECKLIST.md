# Garden 2048 — Google Play 출시 체크리스트

코드 변경은 거의 완료됐고, 이제 **콘솔 작업 + 자산 준비** 단계입니다.
아래를 순서대로 진행하세요.

---

## 🔑 1. 릴리스 keystore 생성 (1회만, 절대 유실 금지!)

```bash
cd artifacts/garden-2048/android
keytool -genkey -v \
  -keystore garden2048-release.keystore \
  -alias garden2048 \
  -keyalg RSA -keysize 2048 -validity 10000
```

생성 후:
1. `keystore.properties.example` 복사 → `keystore.properties`
2. 암호/별칭 입력
3. **`.keystore` 파일과 `keystore.properties` 는 안전한 곳에 별도 백업!**
4. 둘 다 git에 자동 제외됨 (`.gitignore` 설정됨)

> ⚠️ keystore 유실 시 Play Store 에 업데이트 업로드 영구 불가! Google 에 도움 요청해도 복구 안 됨.

---

## 🤖 2. AdMob 계정 + 앱 등록

1. https://admob.google.com → 계정 생성
2. 앱 추가: **Android → 아직 Play Store 에 게시되지 않음** 선택
3. 앱 이름: `Garden 2048`, 패키지: `com.garden2048.app`
4. 광고 단위 생성:
   - 인터스티셜 (게임 종료 시)
   - 리워드 (골드 4배 / 코인 획득 버튼)
   - 리워드 인터스티셜 (선택)
5. 발급받은 **App ID + 각 Unit ID** 를 다음 파일 2곳에 입력:
   - `src/utils/adConfig.ts` → `PRODUCTION` 객체
   - `android/app/src/main/AndroidManifest.xml` → `<meta-data>` 값

---

## 📦 3. AdMob 플러그인 설치 (실제 광고 활성화)

```bash
cd artifacts/garden-2048
pnpm add @capacitor-community/admob
pnpm exec cap sync android
```

설치 후 `src/utils/adProvider.ts` 에 있는 `// TODO: @capacitor-community/admob 설치 후 주석 해제` 블록을 3곳 모두 주석 해제.

---

## 🔐 4. Google 로그인 (선택사항)

원하실 경우:

```bash
pnpm add @codetrix-studio/capacitor-google-auth
pnpm exec cap sync android
```

이후:
1. https://console.cloud.google.com → 새 프로젝트
2. OAuth 동의 화면 설정
3. Android 클라이언트 ID 생성 (SHA-1: `keytool -list -v -keystore garden2048-release.keystore` 로 확인)
4. 웹 클라이언트 ID 도 추가 생성 (capacitor-google-auth 는 두 ID 모두 필요)
5. `capacitor.config.ts` 에 플러그인 설정 추가:
```ts
plugins: {
  GoogleAuth: {
    scopes: ["profile", "email"],
    serverClientId: "<웹 클라이언트 ID>.apps.googleusercontent.com",
    forceCodeForRefreshToken: true,
  },
},
```

---

## 📱 5. Play Console 출시 준비

### 5-1. 필수 자산
- **앱 아이콘**: 512×512 PNG (Play Store 용)
- **기능 그래픽**: 1024×500 PNG
- **스크린샷**: 최소 2장, 세로 1080×1920 권장 (플레이 화면 + 홈 화면)
- **짧은 설명**: 최대 80자
- **긴 설명**: 최대 4000자
- **프로모션 영상** (선택): YouTube 링크

### 5-2. 정책 링크
Play Console 에 필수:
- **개인정보처리방침 URL** ← `docs/PRIVACY_POLICY.md` (한글) / `docs/PRIVACY_POLICY_EN.md` (영문)
- **이용약관 URL** ← `docs/TERMS_OF_SERVICE.md` (한글) / `docs/TERMS_OF_SERVICE_EN.md` (영문)
- 위 4개 문서를 GitHub Pages 또는 Netlify 등에 호스팅한 뒤 `src/components/modals/SettingsModal.tsx` 의 `POLICY_URLS` 상수에 실제 URL 반영
- 회사명: **스프랩가든 (Sprout Lab Garden)**
- 문의 이메일: **sproutlabgarden@gmail.com** (실제 운영 이메일로 교체)

### 5-3. 설문 및 등급
- 광고 포함 여부: **예 (AdMob)**
- 앱 접근 권한: 모든 기능 공개 접근
- 콘텐츠 등급: IARC 설문 (퍼즐 게임 → 전체 이용가 예상)
- 타겟 연령대: **만 13세 이상** (AdMob 사용으로 인해)
- 데이터 안전성: 위 개인정보 처리방침 내용대로 입력

---

## 🏗️ 6. 첫 빌드 & 업로드

### AAB 빌드 (Play Store 는 AAB 형식 필수)

Android Studio 에서:
1. **Build → Generate Signed Bundle / APK**
2. **Android App Bundle** 선택
3. Keystore 경로: `artifacts/garden-2048/android/garden2048-release.keystore`
4. Build variant: **release**
5. Finish → 생성 경로 확인: `android/app/release/app-release.aab`

또는 CLI:
```bash
cd artifacts/garden-2048
pnpm build:mobile
pnpm exec cap sync android
cd android
./gradlew bundleRelease
```

### Play Console 업로드
1. 내부 테스트 트랙 먼저 → 본인 기기에서 실제 확인
2. 문제 없으면 프로덕션 승격

---

## ✅ 7. 최종 검증 체크리스트

- [ ] `com.garden2048.app` 로 등록됨
- [ ] Release keystore 백업 2곳 이상
- [ ] `adConfig.ts` PRODUCTION IDs 교체
- [ ] `AndroidManifest.xml` AdMob App ID 교체
- [ ] `adProvider.ts` TODO 주석 해제
- [ ] `PRIVACY_POLICY.md` 이메일 주소 교체
- [ ] 개인정보 처리방침 URL 호스팅
- [ ] AAB 빌드 성공
- [ ] 내부 테스트 트랙에서 실기기 동작 확인
- [ ] 광고 표시 확인 (test ID 로)
- [ ] 결제 테스트 (라이선스 테스터 등록 후)
- [ ] Production IDs 로 교체 후 **다시 빌드·업로드**

---

## 📌 참고

| 주제 | 링크 |
|------|------|
| Play Console | https://play.google.com/console |
| AdMob | https://admob.google.com |
| Capacitor AdMob | https://github.com/capacitor-community/admob |
| Google 로그인 | https://github.com/CodetrixStudio/CapacitorGoogleAuth |
| Google Play Billing | https://github.com/capacitor-community/play-billing |
