/* ============================================================
 * adProvider.ts
 * AdMob SDK Wrapper — native(Capacitor) vs web 폴백 추상화
 *
 * 설치된 패키지: @capacitor-community/admob ^8.0.0
 * ============================================================ */

import { Capacitor } from "@capacitor/core";
import { AD_IDS } from "./adConfig";

/** 네이티브 Android/iOS 환경에서만 AdMob 활성화 */
const isNative = () => {
  try { return Capacitor.isNativePlatform(); }
  catch { return false; }
};

let initialized = false;

/** AdMob 초기화 — App 부팅 시 1회 호출 */
export const initAdmob = async (): Promise<void> => {
  if (initialized || !isNative()) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: !import.meta.env.PROD,
    });
    initialized = true;
  } catch (e) {
    console.warn("[AdMob] init failed", e);
  }
};

/** 인터스티셜 광고 표시 — 광고가 닫힐 때까지 기다린 뒤 resolve */
export const showInterstitial = async (): Promise<boolean> => {
  if (!isNative()) return true; // web: mock
  try {
    const { AdMob, InterstitialAdPluginEvents } =
      await import("@capacitor-community/admob");

    return new Promise<boolean>(async (resolve) => {
      const handles: Array<{ remove: () => void }> = [];
      const cleanup = () => handles.forEach((h) => h.remove());

      handles.push(
        await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          cleanup(); resolve(true);
        }),
      );
      handles.push(
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
          cleanup(); resolve(false);
        }),
      );
      handles.push(
        await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
          cleanup(); resolve(false);
        }),
      );
      handles.push(
        await AdMob.addListener(InterstitialAdPluginEvents.Loaded, async () => {
          try {
            await AdMob.showInterstitial();
          } catch {
            cleanup(); resolve(false);
          }
        }),
      );

      try {
        await AdMob.prepareInterstitial({ adId: AD_IDS.INTERSTITIAL });
      } catch {
        cleanup(); resolve(false);
      }
    });
  } catch (e) {
    console.warn("[AdMob] interstitial failed", e);
    return false;
  }
};

/** 리워드 광고 표시 — 리워드 이벤트 수신 여부를 resolve */
export const showRewarded = async (): Promise<boolean> => {
  if (!isNative()) return true; // web: mock = 항상 완료
  try {
    const { AdMob, RewardAdPluginEvents } =
      await import("@capacitor-community/admob");

    return new Promise<boolean>(async (resolve) => {
      let rewarded = false;
      const handles: Array<{ remove: () => void }> = [];
      const cleanup = () => handles.forEach((h) => h.remove());

      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewarded = true;
        }),
      );
      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          cleanup(); resolve(rewarded);
        }),
      );
      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          cleanup(); resolve(false);
        }),
      );
      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          cleanup(); resolve(false);
        }),
      );

      try {
        await AdMob.prepareRewardVideoAd({ adId: AD_IDS.REWARDED });
        await AdMob.showRewardVideoAd();
      } catch {
        cleanup(); resolve(false);
      }
    });
  } catch (e) {
    console.warn("[AdMob] rewarded failed", e);
    return false;
  }
};

/** 배너 광고 표시 — 네이티브 오버레이로 표시됨 */
export const showBanner = async (position: "top" | "bottom"): Promise<void> => {
  if (!isNative()) return;
  try {
    const { AdMob, BannerAdSize, BannerAdPosition } =
      await import("@capacitor-community/admob");
    await AdMob.showBanner({
      adId:     AD_IDS.BANNER,
      adSize:   BannerAdSize.ADAPTIVE_BANNER,
      position: position === "top"
        ? BannerAdPosition.TOP_CENTER
        : BannerAdPosition.BOTTOM_CENTER,
      margin:   0,
      isTesting: !import.meta.env.PROD,
    });
  } catch (e) {
    console.warn("[AdMob] banner failed", e);
  }
};

/** 배너 광고 제거 */
export const removeBanner = async (): Promise<void> => {
  if (!isNative()) return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.removeBanner();
  } catch (e) {
    console.warn("[AdMob] remove banner failed", e);
  }
};
