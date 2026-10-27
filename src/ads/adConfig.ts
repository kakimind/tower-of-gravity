// Ad identity and the switch between test and real inventory.
//
// The default in every build — debug AND release — is Google's test ad unit.
// A Play Console internal/closed-test AAB is built with `--release` just like
// production, so "it's a release build" is not a safe signal that real ads
// should serve: testers tapping live ads is exactly the invalid traffic that
// gets an AdMob account suspended. Real inventory is therefore opt-in and has
// to be asked for explicitly at build time:
//
//   VITE_REAL_ADS=1 npm run build
//
// Google's published test IDs. These are documented, shared, and safe to
// commit — they are not account credentials.
// https://developers.google.com/admob/android/test-ads
const TEST_REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917';

// Fill in from the AdMob console, then build with VITE_REAL_ADS=1 to use them.
// Leaving these empty is safe: useRealAds() refuses to switch over without
// them, so a mistyped build flag falls back to test ads rather than silently
// shipping an app that requests ads from an ad unit that doesn't exist.
// Annotated as string rather than left to inference: TypeScript would narrow
// a non-empty literal to its own type and then reject the emptiness guard in
// useRealAds() as impossible — the guard has to keep compiling so that
// blanking this id stays a safe way to fall back to test ads.
const REAL_REWARDED_AD_ID: string = 'ca-app-pub-7834868288333512/3123008195';

export function useRealAds(): boolean {
  return import.meta.env.VITE_REAL_ADS === '1' && REAL_REWARDED_AD_ID !== '';
}

export function rewardedAdId(): string {
  return useRealAds() ? REAL_REWARDED_AD_ID : TEST_REWARDED_AD_ID;
}

// AdMob wants to know it's a test request independently of which ad unit is
// used, so pass this alongside the id rather than inferring it downstream.
export function isTestingAds(): boolean {
  return !useRealAds();
}
