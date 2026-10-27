import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { rewardedAdId, isTestingAds } from './adConfig';

// What the caller is allowed to do with the outcome. Only 'rewarded' and
// 'grace' may hand out anything.
export type AdOutcome = 'rewarded' | 'grace' | 'failed' | 'offline' | 'dismissed';

export function shouldGrantReward(outcome: AdOutcome): boolean {
  return outcome === 'rewarded' || outcome === 'grace';
}

// Offline and "online but the ad didn't load" are deliberately not the same
// thing. If being offline still paid out, airplane mode would be the cheapest
// way to farm rewards in the game — so it never pays. A genuine load failure
// on a working connection is the player's bad luck rather than their doing,
// so it is forgiven once per session and refused after that; otherwise a
// permanently unfillable ad unit would turn into unlimited free rewards.
let graceUsed = false;

let initialized = false;
let initializing: Promise<void> | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Ad setup must never be able to stop the game from starting. Every entry
// point here swallows its own failures and leaves `initialized` false, which
// just means reward ads report 'failed' instead of the app refusing to boot.
export function initAds(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  if (initializing) return initializing;
  initializing = AdMob.initialize({ initializeForTesting: isTestingAds() })
    .then(() => { initialized = true; })
    .catch((err) => {
      console.warn('[ads] initialize failed, reward ads will be unavailable', err);
    });
  return initializing;
}

export function adsReady(): boolean {
  return isNative() && initialized;
}

// Resolves once the ad is finished with, reporting what actually happened.
// The Rewarded event is the authority on whether the player earned anything:
// the plugin documents that a dismissal says nothing about the reward, so a
// player who closes the ad early must not be paid.
export async function showRewardedAd(): Promise<AdOutcome> {
  if (!isNative()) return 'failed';

  if (!navigator.onLine) return 'offline';

  await initAds();
  if (!initialized) return failWithGrace();

  let earned = false;
  let rewardListener: PluginListenerHandle | undefined;

  try {
    rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; });

    await AdMob.prepareRewardVideoAd({ adId: rewardedAdId(), isTesting: isTestingAds() });
    const item = await AdMob.showRewardVideoAd();

    // The event is the primary signal; a resolved reward item with a positive
    // amount is accepted too, since on some SDK versions the show call carries
    // the reward and the event can land after it.
    if (earned || (item && typeof item.amount === 'number' && item.amount > 0)) return 'rewarded';
    return 'dismissed';
  } catch (err) {
    console.warn('[ads] rewarded ad failed', err);
    return failWithGrace();
  } finally {
    await rewardListener?.remove().catch(() => undefined);
  }
}

function failWithGrace(): AdOutcome {
  if (graceUsed) return 'failed';
  graceUsed = true;
  return 'grace';
}
