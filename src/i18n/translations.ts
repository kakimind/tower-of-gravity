export interface LanguageInfo {
  code: string;
  nativeName: string;
}

// 22 target languages for release. Only ko and en have complete translations
// today; the rest fall back to English until real translations are supplied.
export const LANGUAGES: LanguageInfo[] = [
  { code: 'ko', nativeName: '한국어' },
  { code: 'en', nativeName: 'English' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'zh-Hans', nativeName: '简体中文' },
  { code: 'zh-Hant', nativeName: '繁體中文' },
  { code: 'es', nativeName: 'Español' },
  { code: 'es-419', nativeName: 'Español (Latinoamérica)' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'hi', nativeName: 'हिन्दी' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'th', nativeName: 'ไทย' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
  { code: 'tr', nativeName: 'Türkçe' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'sv', nativeName: 'Svenska' },
];

export type TranslationKey =
  | 'title'
  | 'hud.stage'
  | 'hud.moves'
  | 'hud.score'
  | 'hud.target'
  | 'footerHint'
  | 'settings.title'
  | 'settings.language'
  | 'settings.exit'
  | 'settings.close'
  | 'settings.exitConfirm'
  | 'direction.down'
  | 'direction.left'
  | 'direction.up'
  | 'direction.right'
  | 'gravity.flip'
  | 'placement.instruction'
  | 'game.start'
  | 'story.startButton'
  | 'reshuffle.banner'
  | 'stageClear.overachieved'
  | 'stageClear.normal'
  | 'stageClear.next'
  | 'stageClear.allDone'
  | 'outOfMoves.title'
  | 'outOfMoves.watchAd'
  | 'outOfMoves.leave'
  | 'outOfMoves.confirmAd'
  | 'common.watch'
  | 'common.cancel'
  | 'common.leave'
  | 'ad.playing'
  | 'endBanner.backToLobby'
  | 'intro.floorStage'
  | 'event.itemGot'
  | 'shopkeeper.name'
  | 'placementIntro.boughtOnly'
  | 'placementIntro.eventOnly'
  | 'placementIntro.both'
  | 'placementIntro.instruction'
  | 'item.lineRow'
  | 'item.lineCol'
  | 'item.crossBomb'
  | 'item.colorBomb'
  | 'lobby.floorStage'
  | 'lobby.currency'
  | 'lobby.ascend'
  | 'lobby.noHeartsConfirm'
  | 'lobby.shop'
  | 'lobby.nextHeart'
  | 'lobby.boostBonusMoves'
  | 'lobby.boostOwned'
  | 'lobby.shopTitle'
  | 'lobby.shopMovesLabel'
  | 'lobby.priceStardust'
  | 'lobby.shopAdLabel'
  | 'lobby.get'
  | 'lobby.confirmWatchAdReward'
  | 'lobby.insufficientCurrency'
  | 'game.combo';

type Dictionary = Record<TranslationKey, string>;

const ko: Dictionary = {
  title: '중력의 탑',
  'hud.stage': '탑',
  'hud.moves': '주문',
  'hud.score': '마력',
  'hud.target': '목표',
  footerHint: '재료를 원하는 방향으로 밀어서 조합하세요\n· {n}수마다 실패한 주문이 중력을 뒤집습니다',
  'settings.title': '설정',
  'settings.language': '언어',
  'settings.exit': '나가기',
  'settings.close': '닫기',
  'settings.exitConfirm': '정말 나가시겠어요? 진행 중인\n스테이지는 저장되지 않습니다.',
  'direction.down': '아래',
  'direction.left': '왼쪽',
  'direction.up': '위',
  'direction.right': '오른쪽',
  'gravity.flip': '중력 전환!',
  'placement.instruction': '이 아이템을 배치할\n위치를 정해주세요',
  'game.start': '게임 시작~',
  'story.startButton': '시작 ▶',
  'reshuffle.banner': '이동 가능한 조합이\n없어 재배치합니다',
  'stageClear.overachieved': '스테이지 {stage} 클리어! 목표 2배 달성!\n(+{reward} 🌟)',
  'stageClear.normal': '스테이지 {stage} 클리어! (+{reward} 🌟)',
  'stageClear.next': '다음 스테이지 {stage} ▶',
  'stageClear.allDone': '모든 스테이지 완료!',
  'outOfMoves.title': '주문 횟수 종료',
  'outOfMoves.watchAd': '🎬 광고 보고 +10수',
  'outOfMoves.leave': '🚪 나가기 (하트 -1)',
  'outOfMoves.confirmAd': '광고를 보고 주문 10회를\n더 받으시겠어요?',
  'common.watch': '🎬 보기',
  'common.cancel': '취소',
  'common.leave': '🚪 나가기',
  'ad.playing': '광고 재생 중...',
  'endBanner.backToLobby': '🏠 로비로',
  'intro.floorStage': '{floor}층 · 스테이지 {stage}',
  'event.itemGot': '「{item}」 획득!',
  'shopkeeper.name': '상점지기',
  'placementIntro.boughtOnly': '구매하신 특수 재료 {n}개를',
  'placementIntro.eventOnly': '이벤트로 받은 특수 재료 {n}개를',
  'placementIntro.both': '구매하신 특수 재료 {bought}개와 이벤트로 받은 특수 재료 {event}개, 총 {total}개를',
  'placementIntro.instruction': '{itemLine} 원하는 칸에 배치할 수 있어요.\n준비되면 시작을 눌러주세요.',
  'item.lineRow': '가로줄 제거',
  'item.lineCol': '세로줄 제거',
  'item.crossBomb': '십자 폭탄',
  'item.colorBomb': '컬러 폭탄',
  'lobby.floorStage': '{floor}층 · 스테이지 {stage} / {total}',
  'lobby.currency': '🌟 {n} 별가루',
  'lobby.ascend': '탑 오르기 ▶',
  'lobby.noHeartsConfirm': '하트가 없어요. 광고를\n보고 하트를 채울까요?',
  'lobby.shop': '🛒 상점',
  'lobby.nextHeart': '다음 하트 {mm}:{ss}',
  'lobby.boostBonusMoves': '다음 판 주문+3 x{n}',
  'lobby.boostOwned': '보유 부스터: {items}',
  'lobby.shopTitle': '상점',
  'lobby.shopMovesLabel': '🪄 다음 판 주문 +3',
  'lobby.priceStardust': '별가루 {n}',
  'lobby.shopAdLabel': '🎬 광고 보고 별가루 200개 받기',
  'lobby.get': '받기',
  'lobby.confirmWatchAdReward': '광고를 보고 별가루\n200개를 받으시겠어요?',
  'lobby.insufficientCurrency': '별가루가 부족합니다',
  'game.combo': '콤보 x{n}!',
};

const en: Dictionary = {
  title: 'Tower of Gravity',
  'hud.stage': 'Tower',
  'hud.moves': 'Moves',
  'hud.score': 'Mana',
  'hud.target': 'Goal',
  footerHint: 'Swipe an ingredient toward a neighbor to swap it\n· gravity flips every {n} moves',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.exit': 'Exit',
  'settings.close': 'Close',
  'settings.exitConfirm': 'Are you sure you want to exit? Progress\non this stage will not be saved.',
  'direction.down': 'down',
  'direction.left': 'left',
  'direction.up': 'up',
  'direction.right': 'right',
  'gravity.flip': 'Gravity shift!',
  'placement.instruction': 'Choose a tile to place\nthis item',
  'game.start': 'Game start~',
  'story.startButton': 'Start ▶',
  'reshuffle.banner': 'No more moves available —\nreshuffling the board',
  'stageClear.overachieved': 'Stage {stage} clear! Doubled the goal!\n(+{reward} 🌟)',
  'stageClear.normal': 'Stage {stage} clear! (+{reward} 🌟)',
  'stageClear.next': 'Next stage {stage} ▶',
  'stageClear.allDone': 'All stages complete!',
  'outOfMoves.title': 'Out of moves',
  'outOfMoves.watchAd': '🎬 Watch ad for +10 moves',
  'outOfMoves.leave': '🚪 Leave (-1 heart)',
  'outOfMoves.confirmAd': 'Watch an ad to get\n10 more moves?',
  'common.watch': '🎬 Watch',
  'common.cancel': 'Cancel',
  'common.leave': '🚪 Leave',
  'ad.playing': 'Playing ad...',
  'endBanner.backToLobby': '🏠 Back to lobby',
  'intro.floorStage': 'Floor {floor} · Stage {stage}',
  'event.itemGot': '"{item}" obtained!',
  'shopkeeper.name': 'Shopkeeper',
  'placementIntro.boughtOnly': 'The {n} special ingredient(s) you bought',
  'placementIntro.eventOnly': 'The {n} special ingredient(s) you got from an event',
  'placementIntro.both': 'The {bought} you bought plus {event} from events — {total} special ingredients in total',
  'placementIntro.instruction': '{itemLine} can be placed on any tile\nyou like. Press start when ready.',
  'item.lineRow': 'Row Clear',
  'item.lineCol': 'Column Clear',
  'item.crossBomb': 'Cross Bomb',
  'item.colorBomb': 'Color Bomb',
  'lobby.floorStage': 'Floor {floor} · Stage {stage} / {total}',
  'lobby.currency': '🌟 {n} Stardust',
  'lobby.ascend': 'Ascend the Tower ▶',
  'lobby.noHeartsConfirm': 'No hearts left. Watch an ad\nto refill one?',
  'lobby.shop': '🛒 Shop',
  'lobby.nextHeart': 'Next heart {mm}:{ss}',
  'lobby.boostBonusMoves': 'Next run +3 moves x{n}',
  'lobby.boostOwned': 'Boosters: {items}',
  'lobby.shopTitle': 'Shop',
  'lobby.shopMovesLabel': '🪄 Next run +3 moves',
  'lobby.priceStardust': '{n} Stardust',
  'lobby.shopAdLabel': '🎬 Watch ad for 200 Stardust',
  'lobby.get': 'Get',
  'lobby.confirmWatchAdReward': 'Watch an ad to get\n200 Stardust?',
  'lobby.insufficientCurrency': 'Not enough Stardust',
  'game.combo': 'COMBO x{n}!',
};

export const DICTIONARIES: Partial<Record<string, Dictionary>> = { ko, en };

export function getDictionary(langCode: string): Dictionary {
  return DICTIONARIES[langCode] ?? DICTIONARIES.en ?? ko;
}
