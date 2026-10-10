import { getLanguage } from '../i18n';
import { getFloor } from '../engine/StageConfig';

export { getFloor };

export interface StoryLine {
  speaker: string;
  text: string;
}

type SpeakerId = 'archivist' | 'wisp' | 'gatekeeper' | 'sprite' | 'apprentice';

const SPEAKER_IDS: SpeakerId[] = ['archivist', 'wisp', 'gatekeeper', 'sprite', 'apprentice'];

type SpeakerPool = Record<SpeakerId, string[]>;

// Floor-banded, per-character pools: each band covers a stretch of floors, and
// within a band every character has their own voice so the same scenario reads
// differently depending on which character speaks (scholarly vs. teasing vs. stern vs.
// whimsical vs. anxious-peer), instead of one flat pool shared by all speakers.
//
// Each line breaks at whichever word boundary keeps the two lines closest
// to equal length, so the dialog card reads as a balanced two-line block
// instead of one long line stacked on a short fragment.

interface BandSet {
  early: SpeakerPool;
  rising: SpeakerPool;
  deep: SpeakerPool;
  high: SpeakerPool;
  summit: SpeakerPool;
  peak: SpeakerPool;
}

type BandKey = keyof BandSet;

const BAND_RANGES: { min: number; max: number; key: BandKey }[] = [
  { min: 2, max: 9, key: 'early' },
  { min: 10, max: 29, key: 'rising' },
  { min: 30, max: 49, key: 'deep' },
  { min: 50, max: 69, key: 'high' },
  { min: 70, max: 89, key: 'summit' },
  { min: 90, max: 100, key: 'peak' },
];

export type EventItem = 'bonusMove' | 'lineRow' | 'lineCol' | 'crossBomb' | 'colorBomb';

export interface RandomEvent {
  speaker: string;
  text: string;
  item: EventItem;
  itemLabel: string;
}

interface LangStory {
  speakerNames: Record<SpeakerId, string>;
  bands: BandSet;
  // One-time turning points — each claims "from here on", so each is pinned to a
  // single floor instead of being able to land on many floors and contradict
  // itself. Always voiced by the gatekeeper: these read as tower-wide
  // proclamations, not personal banter.
  pinnedLines: Record<number, string>;
  eventLines: { speaker: SpeakerId; text: string }[];
  itemLabels: Record<EventItem, string>;
  stage1: string;
  stage1000: string;
}

const ko: LangStory = {
  speakerNames: {
    archivist: '늙은 사서',
    wisp: '도깨비불',
    gatekeeper: '탑의 문지기',
    sprite: '먼지 요정',
    apprentice: '견습 마법사',
  },
  bands: {
    early: {
      archivist: [
        '{floor}층의 기록은 아직 내 서가에도\n없군. 네가 처음으로 남기는 셈이야.',
        '오래된 책일수록 {floor}층 같은 낮은 곳의 이야기부터 적혀 있지.',
        '먼지 밑에 낡은 글씨가 보이는군.\n{floor}층도 한때는 누군가의 시작이었어.',
      ],
      wisp: [
        '흐흐, {floor}층이라고 봐주는\n거 없어. 발 조심해.',
        '여기 함정 하나 있는데... 말해줄까\n말까, {floor}층이니까 봐줄게.',
        '낮은 층이라고 심심할 줄 알았지?\n{floor}층도 제법 재밌는 걸.',
      ],
      gatekeeper: [
        '{floor}층 통과. 규칙은\n간단해, 방심하지 말 것.',
        '탑의 법도는 {floor}층부터 똑같이\n적용된다. 예외는 없어.',
        '{floor}층에서 멈추는 자가\n많았다. 너는 다르길 바란다.',
      ],
      sprite: [
        '여기 먼지 좀 봐! {floor}층엔\n내 친구들이 아주 많이 살아.',
        '작은 금이 하나 있네~ {floor}층도\n비밀 하나쯤은 숨기고 있나 봐.',
        '히히, {floor}층 계단은 밟을\n때마다 소리가 달라! 재밌다.',
      ],
      apprentice: [
        '나도 {floor}층 올라올 때 손이\n떨렸어. 너도 그렇지?',
        '{floor}층 정도는 나도 기억나.\n긴장하지 말고 천천히 해.',
        '같이 올라가는 기분이야. {floor}층,\n우리 둘 다 아직 초보니까.',
      ],
    },
    rising: {
      archivist: [
        '{floor}층부터 글자가 낯설어지는군.\n옛 언어로 적힌 경고일세.',
        '실패한 주문의 기록이 {floor}층 어딘가에 남아있다고 들었다.',
        '이 높이의 기록은 손상이 많아.\n{floor}층의 진실은 아직 불완전해.',
      ],
      wisp: [
        '중력이 또 뒤집히려나 봐,\n{floor}층에서 꼭 조심해!',
        '재료들이 빛나는 거 보여?\n{floor}층부터 마력이 좀 짙어졌어.',
        '삐걱삐걱, {floor}층 계단이\n불안하게 우는 소리 들리지?',
      ],
      gatekeeper: [
        '{floor}층부터는 경계를 두 배로.\n탑이 변덕스러워지는 구간이다.',
        '여기서 멈춘 도전자들의 흔적이 벽에\n새겨져 있다. {floor}층을 명심해.',
        '{floor}층의 공기가 다르다. 방심한\n자는 중력에게 삼켜진다.',
      ],
      sprite: [
        '우와, {floor}층 벽에 그림이\n움직이는 것처럼 보여!',
        '촛불이 바람도 없이 흔들려...\n{floor}층엔 뭔가 있나 봐, 두근두근.',
        '{floor}층부터 글씨가 요상해.\n나도 못 읽겠어, 히히.',
      ],
      apprentice: [
        '{floor}층까지 왔다니... 나보다\n빠른 것 같아, 솔직히 부럽다.',
        '여기서부터 진짜 긴장되네.\n{floor}층, 같이 조심하자.',
        '스승님이 {floor}층부터는 특히\n조심하라고 하셨어. 기억해 둬.',
      ],
    },
    deep: {
      archivist: [
        '{floor}층의 공기 기록엔 \'무겁다\'는 말만 반복돼 있어.',
        '길 잃은 마법사의 이야기가 {floor}층\n서가에 남아있지. 조심하게.',
        '탑이 기울어진다는 기록,\n{floor}층부터 실제로 나타나는군.',
      ],
      wisp: [
        '발밑이 들썩이지? {floor}층은 아직\n중력이 제정신이 아니거든.',
        '재료들끼리 서로 끌어당기는 거 봐,\n{floor}층이라 유독 그래, 흐흐.',
        '여기 낡은 지팡이 봤어? {floor}층의\n흔적이야, 주인은 어디 갔을까.',
      ],
      gatekeeper: [
        '{floor}층부터는 압력이\n다르다. 단단히 버텨라.',
        '이 높이까지 온 자는 많지 않다.\n{floor}층의 무게를 느껴봐라.',
        '탑이 조금씩 기울어진다. {floor}층부턴\n특히 더 그렇다, 경계하라.',
      ],
      sprite: [
        '여기 재료들 되게 단단해졌어!\n{floor}층 압력 때문인가 봐.',
        '나도 {floor}층 공기는 좀 무겁게\n느껴져... 숨쉬기 힘들어.',
        '어딘가에서 길 잃은 마법사 냄새가\n나... {floor}층, 진짜야!',
      ],
      apprentice: [
        '{floor}층부터는 나도 숨이 찬\n느낌이야. 천천히 가자.',
        '여기까지 버틴 재료들 보면 나도 힘이\n나... {floor}층, 할 수 있어.',
        '스승님도 {floor}층 얘기는 안\n해주셨어. 우리가 처음일지도.',
      ],
    },
    high: {
      archivist: [
        '이 위쪽 서가의 책들은 아무도 못\n읽었어. {floor}층의 지식은 주인이 없지.',
        '{floor}층 기록엔 \'고독\'이라는 단어만 반복돼 있군.',
        '마법진이 스스로 다시 그려진다는 기록,\n{floor}층이 뭔가를 기억하는 모양이야.',
      ],
      wisp: [
        '별빛이 창문으로 들어와!\n{floor}층은 벌써 구름 위라고.',
        '공기 희박한 거 느껴지지? {floor}층부턴\n나도 숨쉬기 조심해, 흐흐.',
        '탑지기도 여긴 잘 안 와. {floor}층부턴\n나밖에 없다고 생각해도 돼.',
      ],
      gatekeeper: [
        '{floor}층부턴 나도 순찰이\n뜸하다. 혼자라고 여겨라.',
        '발소리가 유난히 크게 울리지.\n{floor}층은 오래 비어 있었다.',
        '여기서부턴 중력보다 네 의지가 더\n중요할 것이다, {floor}층의 시험이지.',
      ],
      sprite: [
        '여기 책장엔 먼지도 특별해!\n{floor}층 먼지는 반짝거려.',
        '별들이 창문보다 가까운 것 같아~\n{floor}층은 이상하게 조용해.',
        '탑이 숨 쉬는 것처럼 떨려...\n{floor}층부터 유독 그래, 신기하지?',
      ],
      apprentice: [
        '{floor}층까지 혼자 왔다는 게\n믿기지 않아. 대단해.',
        '숨이 가빠지지 않아? {floor}층부턴\n나도 천천히 걷고 있어.',
        '여기서부턴 정말 네 의지인 것\n같아. {floor}층, 믿어 봐.',
      ],
    },
    summit: {
      archivist: [
        '구름 아래 세상의 기록은 여기선 의미가\n없어. {floor}층은 하늘의 일부야.',
        '탑 꼭대기 빛에 대한 기록은 희미해.\n{floor}층에서부터 진짜가 보일 거야.',
        '여기까지 온 자를 적은 명부는 아주\n짧지. {floor}층의 적막이 그 증거다.',
      ],
      wisp: [
        '바람 소리만 들리지? {floor}층엔\n진짜 아무것도 없어, 조용하다.',
        '재료들이 날개 단 것처럼 가벼워\n보여! {floor}층 마력 때문인가, 흐흐.',
        '별들이 창문보다 가까워...\n{floor}층은 이상할 정도로 고요해.',
      ],
      gatekeeper: [
        '{floor}층까지 버틴 자, 넌\n보통 견습생이 아니다.',
        '탑이 미세하게 떨린다. {floor}층부턴\n숨죽이고 올라야 한다.',
        '여기부턴 규칙보다 각오가\n먼저다, {floor}층을 명심해라.',
      ],
      sprite: [
        '구름이 발밑에 있어! {floor}층은\n진짜 하늘 위야, 신난다.',
        '탑이 숨 쉬듯 흔들려...\n{floor}층은 뭔가 달라, 두근두근.',
        '여기까지 올라온 애는 거의 없었어!\n{floor}층, 너 특별한 거 같아.',
      ],
      apprentice: [
        '탑 꼭대기 빛이 보이는 것 같아...\n{floor}층에서부터 진짜 느껴져.',
        '여기까지 온 걸 보면 너, 보통이\n아닌가 봐. {floor}층, 나도 믿어볼게.',
        '숨소리만 들려... {floor}층,\n같이 조용히 가자.',
      ],
    },
    peak: {
      archivist: [
        '정상이 코앞이다. {floor}층의\n기록은 이제 내가 써야겠군.',
        '마지막 봉인에 대한 기록,\n{floor}층을 지나면 완성될 거야.',
        '{floor}층... 여기까지 올 거라곤\n나도 몰랐다. 끝이 보이는군.',
      ],
      wisp: [
        '탑 전체가 널 지켜보는 것 같아!\n{floor}층부턴 특히 그래, 흐흐.',
        '이 높이의 중력은 변덕이 아니라\n의지를 가진 것처럼 움직여, 조심해.',
        '{floor}층, 공기가 벌써 다르게\n느껴지지 않아? 거의 다 왔어.',
      ],
      gatekeeper: [
        '{floor}층을 지나면 얼마 남지\n않았다. 마지막까지 집중하라.',
        '탑의 마지막 시험이 가까워진다.\n{floor}층의 공기를 느껴라.',
        '여기까지 왔다면 돌아갈 수\n없다. {floor}층, 끝까지 가라.',
      ],
      sprite: [
        '거의 다 왔어! {floor}층 공기가\n완전 달라, 두근두근.',
        '탑이 널 지켜보는 거 같아...\n{floor}층부턴 나도 떨려.',
        '{floor}층, 끝이 보이는\n것 같아! 같이 가자!',
      ],
      apprentice: [
        '{floor}층까지 왔다는 게 아직도\n안 믿겨. 거의 다 왔어.',
        '마지막 봉인이 가까워...\n{floor}층, 나도 떨리지만 믿어.',
        '{floor}층... 여기까지 올 줄은\n몰랐어. 같이 끝을 보자.',
      ],
    },
  },
  pinnedLines: {
    30: '여기부터는 주문이 자꾸 엇나간다.\n{floor}층의 중력은 변덕스러우니 조심하라.',
    60: '조심해서 올라가라. {floor}층부턴\n탑이 스스로 생각하는 것 같거든.',
    80: '여기부터 탑의 설계도 자체가 달라진다. {floor}층은\n원래 이 탑의 일부가 아니었다는 말도 있다.',
    95: '거의 다 왔다. {floor}층 너머엔\n봉인된 마법이 직접 느껴질 것이다.',
  },
  // These already pair with a second "「item」 획득!" line appended by the
  // caller (GameScene), so the dialog ends up two lines without needing an
  // internal break here too.
  eventLines: [
    { speaker: 'sprite', text: '반짝이는 걸 주웠어! 너한테 줄게, 받아!' },
    { speaker: 'wisp', text: '흐흐, 선물이야. 공짜는 아니지만... 오늘은 그냥 줄게.' },
    { speaker: 'archivist', text: '서가에 떨어진 물건이군. 네게 쓸모가 있겠어.' },
    { speaker: 'gatekeeper', text: '탑이 너를 시험할 자격을 인정했다. 이것을 받아라.' },
    { speaker: 'apprentice', text: '나도 하나 더 있었는데... 이거 너 가져. 행운을 빌어!' },
  ],
  itemLabels: {
    bonusMove: '이동 +3 부스터',
    lineRow: '가로 제거 재료',
    lineCol: '세로 제거 재료',
    crossBomb: '십자 폭탄 재료',
    colorBomb: '컬러 폭탄 재료',
  },
  stage1: '탑 꼭대기에 봉인된 마법을 되찾아야 한다.\n견습생, 준비됐다면 첫 층부터 시작하자.',
  stage1000: '마침내 탑의 끝에 도달했군. 이곳의\n마력은... 온전히 네 몫이다.',
};

const en: LangStory = {
  speakerNames: {
    archivist: 'Old Archivist',
    wisp: 'Will-o\'-wisp',
    gatekeeper: 'Tower Gatekeeper',
    sprite: 'Dust Sprite',
    apprentice: 'Apprentice Mage',
  },
  bands: {
    early: {
      archivist: [
        'Floor {floor} isn\'t in my shelves yet.\nYou\'re the first to write its story.',
        'The oldest books start with low floors\nlike floor {floor} — everyone begins somewhere.',
        'Faded ink under the dust...\nfloor {floor} was once someone\'s beginning too.',
      ],
      wisp: [
        'Heh, no mercy just because\nit\'s floor {floor}. Watch your step.',
        'There\'s a trap here... should I warn you?\nEh, floor {floor}, I\'ll let it slide.',
        'Thought a low floor would be boring?\nFloor {floor} still has some bite.',
      ],
      gatekeeper: [
        'Floor {floor}, cleared. The rule is\nsimple: never let your guard down.',
        'The tower\'s law applies the same\nfrom floor {floor} on. No exceptions.',
        'Many stopped at floor {floor}.\nI hope you\'re different.',
      ],
      sprite: [
        'Look at this dust! Floor {floor}\nis home to so many of my friends.',
        'A little crack here~ even floor {floor}\nseems to hide a secret.',
        'Hehe, the stairs on floor {floor}\nsound different with every step!',
      ],
      apprentice: [
        'My hands shook climbing to floor {floor}\ntoo. Yours as well?',
        'I remember floor {floor} well enough.\nDon\'t be nervous, take it slow.',
        'Feels like we\'re climbing together.\nFloor {floor} — we\'re both still beginners.',
      ],
    },
    rising: {
      archivist: [
        'From floor {floor} the letters grow\nstrange — warnings in an old tongue.',
        'I heard records of failed spells\nlie somewhere on floor {floor}.',
        'Records at this height are damaged.\nFloor {floor}\'s truth is still incomplete.',
      ],
      wisp: [
        'Gravity\'s about to flip again,\nbe careful on floor {floor}!',
        'See the ingredients glowing?\nThe magic thickens from floor {floor}.',
        'Creak, creak — hear the stairs\ngroaning uneasily on floor {floor}?',
      ],
      gatekeeper: [
        'From floor {floor}, double your guard.\nThe tower grows fickle here.',
        'Traces of those who stopped here\nmark the walls. Remember floor {floor}.',
        'The air is different on floor {floor}.\nThe careless get swallowed by gravity.',
      ],
      sprite: [
        'Whoa, the pictures on floor {floor}\'s\nwalls look like they\'re moving!',
        'The candle flickers with no wind...\nsomething\'s here on floor {floor}, I\'m nervous.',
        'The writing turns strange from floor {floor}.\nEven I can\'t read it, hehe.',
      ],
      apprentice: [
        'Reaching floor {floor} already... you\'re\nfaster than me, honestly, I\'m a little jealous.',
        'It gets tense from here.\nFloor {floor}, let\'s be careful together.',
        'My teacher warned me floor {floor}\nneeds extra care. Remember that.',
      ],
    },
    deep: {
      archivist: [
        'The weather records for floor {floor}\njust repeat the word \'heavy.\'',
        'A tale of a lost mage lingers\non floor {floor}\'s shelves. Be careful.',
        'Records of the tower tilting\nactually start appearing from floor {floor}.',
      ],
      wisp: [
        'Feel the floor trembling? Floor {floor}\nstill hasn\'t settled its gravity.',
        'Look how the ingredients pull\ntoward each other here, heh.',
        'See this old staff? It\'s from\nfloor {floor} — where did its owner go?',
      ],
      gatekeeper: [
        'From floor {floor}, the pressure\nchanges. Brace yourself.',
        'Few have reached this height.\nFeel the weight of floor {floor}.',
        'The tower tilts little by little.\nEspecially from floor {floor}. Stay alert.',
      ],
      sprite: [
        'The ingredients feel so hard now!\nMust be the pressure on floor {floor}.',
        'Even I feel the air grow heavy\non floor {floor}... hard to breathe.',
        'I smell a lost mage somewhere...\nfloor {floor}, I swear it\'s real!',
      ],
      apprentice: [
        'From floor {floor} even I feel\nout of breath. Let\'s go slow.',
        'Seeing how the ingredients held on\ngives me strength... floor {floor}, we can do this.',
        'Even my teacher never mentioned floor {floor}.\nMaybe we\'re the first ones here.',
      ],
    },
    high: {
      archivist: [
        'No one\'s ever read the books up here.\nFloor {floor}\'s knowledge has no owner.',
        'Floor {floor}\'s records just repeat\none word: \'solitude.\'',
        'A record says the sigils redraw\nthemselves — floor {floor} seems to remember something.',
      ],
      wisp: [
        'Starlight\'s pouring through the window!\nFloor {floor} is already above the clouds.',
        'Feel the thin air? From floor {floor}\neven I watch my breath, heh.',
        'Even the gatekeeper rarely comes here.\nFrom floor {floor} on, it\'s just me.',
      ],
      gatekeeper: [
        'My patrols grow rare from floor {floor}.\nConsider yourself alone.',
        'Footsteps echo unusually loud.\nFloor {floor} has stood empty for ages.',
        'From here, your will matters more\nthan gravity — floor {floor} tests exactly that.',
      ],
      sprite: [
        'Even the dust on the shelves here\nis special! Floor {floor}\'s dust sparkles.',
        'The stars feel closer than the windows~\nfloor {floor} is strangely quiet.',
        'The tower trembles like it\'s breathing...\nespecially from floor {floor}, isn\'t that strange?',
      ],
      apprentice: [
        'I can\'t believe you\'ve come this far alone.\nFloor {floor}, that\'s amazing.',
        'Getting short of breath? From floor {floor}\nI\'m walking slower too.',
        'This really feels like your own will now.\nFloor {floor}, believe in it.',
      ],
    },
    summit: {
      archivist: [
        'Records of the world below mean\nnothing here. Floor {floor} belongs to the sky.',
        'Records of the tower\'s summit light\nare faint. Floor {floor} is where it gets real.',
        'The list of those who\'ve come this far\nis short. Floor {floor}\'s silence proves it.',
      ],
      wisp: [
        'Just the sound of wind, right?\nThere\'s truly nothing on floor {floor}, so quiet.',
        'The ingredients look light as feathers!\nMust be floor {floor}\'s magic, heh.',
        'The stars feel closer than the window...\nfloor {floor} is strangely still.',
      ],
      gatekeeper: [
        'Having endured to floor {floor}, you\'re\nno ordinary apprentice.',
        'The tower trembles faintly. From\nfloor {floor}, climb holding your breath.',
        'From here, resolve matters more\nthan rules — remember floor {floor}.',
      ],
      sprite: [
        'The clouds are under your feet! Floor\n{floor} is truly above the sky, I\'m thrilled.',
        'The tower shivers like it\'s breathing...\nfloor {floor} feels different, my heart\'s racing.',
        'Almost no one\'s made it this far!\nFloor {floor}, you must be special.',
      ],
      apprentice: [
        'I think I can see the light at the\ntower\'s peak... it feels real from floor {floor}.',
        'Getting this far means you\'re no\nordinary climber. Floor {floor}, I believe in you too.',
        'Only the sound of breathing...\nfloor {floor}, let\'s go on quietly together.',
      ],
    },
    peak: {
      archivist: [
        'The summit is close. I\'ll be the one\nto write floor {floor}\'s record now.',
        'The record of the final seal will\nbe complete once you pass floor {floor}.',
        'Floor {floor}... I never thought\nwe\'d come this far. The end is in sight.',
      ],
      wisp: [
        'It feels like the whole tower\'s watching\nyou! Especially from floor {floor}, heh.',
        'The gravity at this height moves like\nit has a will, not just whims. Be careful.',
        'Floor {floor}, doesn\'t the air already\nfeel different? We\'re almost there.',
      ],
      gatekeeper: [
        'Not much remains past floor {floor}.\nStay focused to the very end.',
        'The tower\'s final trial draws near.\nFeel the air of floor {floor}.',
        'There\'s no turning back from here.\nFloor {floor}, see it through to the end.',
      ],
      sprite: [
        'Almost there! The air on floor {floor}\nfeels completely different, I\'m thrilled.',
        'The tower feels like it\'s watching you...\nI\'m nervous too from floor {floor}.',
        'Floor {floor}, I can see the end\ncoming! Let\'s go together!',
      ],
      apprentice: [
        'I still can\'t believe we\'ve come this\nfar. Floor {floor}, we\'re almost there.',
        'The final seal draws near...\nfloor {floor}, I\'m nervous too, but I believe in you.',
        'Floor {floor}... I never thought we\'d\nmake it here. Let\'s see the end together.',
      ],
    },
  },
  pinnedLines: {
    30: 'From here, spells start to go astray.\nFloor {floor}\'s gravity is fickle, stay careful.',
    60: 'Climb carefully. From floor {floor},\nthe tower seems to think for itself.',
    80: 'From here, the tower\'s very design changes. Some\nsay floor {floor} was never part of the original tower.',
    95: 'Almost there. Beyond floor {floor},\nyou\'ll feel the sealed magic itself.',
  },
  eventLines: [
    { speaker: 'sprite', text: 'Found something shiny! It\'s yours, here you go!' },
    { speaker: 'wisp', text: 'Heh, a gift. Not exactly free, but... I\'ll let this one slide.' },
    { speaker: 'archivist', text: 'Something fell in the stacks. It should be useful to you.' },
    { speaker: 'gatekeeper', text: 'The tower deems you worthy of this trial. Take it.' },
    { speaker: 'apprentice', text: 'I had an extra one anyway... here, take it. Good luck!' },
  ],
  itemLabels: {
    bonusMove: 'Moves +3 Boost',
    lineRow: 'Row Clear Ingredient',
    lineCol: 'Column Clear Ingredient',
    crossBomb: 'Cross Bomb Ingredient',
    colorBomb: 'Color Bomb Ingredient',
  },
  stage1: 'We must reclaim the magic sealed at the\ntower\'s peak. Apprentice, let\'s begin, if you\'re ready.',
  stage1000: 'You\'ve finally reached the top of the tower.\nThe magic here... is entirely yours now.',
};

const ja: LangStory = {
  speakerNames: {
    archivist: '老いた記録官',
    wisp: 'いたずら鬼火',
    gatekeeper: '塔の門番',
    sprite: '埃の精',
    apprentice: '見習い魔法使い',
  },
  bands: {
    early: {
      archivist: [
        '{floor}階の記録は、まだ我が書架にはない。\nその物語を記す最初の者は君だ。',
        'もっとも古い書も、{floor}階ほどの低層から\n語り始める。始まりは誰にもあるものだ。',
        '埃の下に、薄れた文字が見える。\n{floor}階もかつては誰かの始まりだったのだ。',
      ],
      wisp: [
        'ふふ、{floor}階だからって\n手加減はないよ。足元に気をつけて。',
        'ここに罠があるんだけど……教えようかな。\nまあ{floor}階だし、今回は見逃してあげる。',
        '低い階なら退屈だと思った？\n{floor}階だって、ちゃんと噛みつくんだよ。',
      ],
      gatekeeper: [
        '{floor}階、通過。規則は単純だ。\nいかなる時も油断するな。',
        '塔の法は{floor}階にも等しく及ぶ。\n例外は認められない。',
        '{floor}階で足を止めた者も多い。\n貴様は違うとよいがな。',
      ],
      sprite: [
        'この埃を見て！ {floor}階には\nぼくの友だちがたくさん住んでるんだ。',
        '小さなひびを見つけたよ。{floor}階にも\n秘密が一つくらい隠れていそう。',
        'えへへ、{floor}階の階段は\n踏むたびに違う音がするね。',
      ],
      apprentice: [
        '僕も{floor}階まで上った時は\n手が震えたよ。君もそう？',
        '{floor}階のことは、僕も覚えてる。\n緊張しないで、ゆっくり行こう。',
        '一緒に上っている気がするよ。\n{floor}階なら、僕らはまだ初心者だね。',
      ],
    },
    rising: {
      archivist: [
        '{floor}階から文字が奇妙に歪み始める。\n古い言葉で記された警告だ。',
        '失敗した呪文の記録が、{floor}階のどこかに\n残されていると聞いたことがある。',
        'この高さの記録は傷みが激しい。\n{floor}階の真実は、まだ完全ではない。',
      ],
      wisp: [
        '重力がまたひっくり返りそうだよ。\n{floor}階では気をつけてね。',
        '材料が光ってるの、見える？\n{floor}階から魔力が濃くなってきたんだ。',
        'ぎし、ぎし。{floor}階の階段が\n不安そうに鳴ってるの、聞こえる？',
      ],
      gatekeeper: [
        '{floor}階からは警戒を二倍にせよ。\n塔が気まぐれになる区間だ。',
        'ここで止まった者たちの痕跡が\n壁に残っている。{floor}階を忘れるな。',
        '{floor}階の空気は違う。\n油断する者は重力に呑まれる。',
      ],
      sprite: [
        'わあ、{floor}階の壁の絵が\n動いているみたいに見えるよ！',
        '風もないのに燭台が揺れてる……\n{floor}階には何かいるのかな。そわそわする。',
        '{floor}階から文字が不思議になるね。\nぼくにも読めないや、えへへ。',
      ],
      apprentice: [
        'もう{floor}階まで来たんだ……正直、\n僕より速くて少しうらやましいよ。',
        'ここから本当に緊張するね。\n{floor}階、一緒に気をつけよう。',
        '先生が、{floor}階は特に注意しろって\n言っていたんだ。覚えておいて。',
      ],
    },
    deep: {
      archivist: [
        '{floor}階の気象記録には、ただ\n「重い」という言葉だけが繰り返されている。',
        '道に迷った魔法使いの物語が、{floor}階の\n棚に残っている。慎重に進みたまえ。',
        '塔が傾き始めたという記録は、\n{floor}階から実際に現れ始める。',
      ],
      wisp: [
        '床が震えてるの、感じる？ {floor}階は\nまだ重力の機嫌が定まってないんだ。',
        '材料同士が引き寄せ合ってるのを見て。\n{floor}階って、やっぱり変だね。ふふ。',
        'この古い杖、見える？ {floor}階のものだよ。\n持ち主はどこへ行ったのかな。',
      ],
      gatekeeper: [
        '{floor}階からは圧力が変わる。\n身構えて進め。',
        'この高さまで来た者は少ない。\n{floor}階の重みをその身で知れ。',
        '塔は少しずつ傾いていく。\n特に{floor}階からだ。警戒を怠るな。',
      ],
      sprite: [
        '材料がすごく硬く感じるよ！\n{floor}階の圧力のせいかな。',
        'ぼくでも{floor}階の空気は重く感じる……\n息をするのがちょっと大変。',
        'どこかで迷子の魔法使いの匂いがする……\n{floor}階だよ、本当だってば！',
      ],
      apprentice: [
        '{floor}階からは僕まで息が切れてくる。\nゆっくり行こう。',
        '材料が踏ん張っているのを見ると\n力が出るよ。{floor}階、僕らなら行ける。',
        '先生でさえ{floor}階の話はしなかった。\nもしかしたら、僕らが初めてかもしれない。',
      ],
    },
    high: {
      archivist: [
        'この上の書物を読んだ者は、まだいない。\n{floor}階の知は、主を持たぬままだ。',
        '{floor}階の記録には、ただ一語、\n「孤独」とだけ繰り返し記されている。',
        '魔法陣が自ら描き直されるという記録がある。\n{floor}階は何かを覚えているらしい。',
      ],
      wisp: [
        '窓から星明かりが流れ込んでる！\n{floor}階はもう雲の上なんだよ。',
        '空気が薄いの、分かる？ {floor}階からは\nぼくだって呼吸に気をつけるんだ。ふふ。',
        '門番でさえ、ここにはめったに来ないよ。\n{floor}階から先は、ぼくと君だけ。',
      ],
      gatekeeper: [
        '{floor}階からは、私の巡回もまれになる。\n一人で進むものと心得よ。',
        '足音が異様に大きく響く。\n{floor}階は長く空のままだった。',
        'ここからは重力よりも意志が重要だ。\n{floor}階は、まさにそれを試す。',
      ],
      sprite: [
        'ここの棚の埃まで特別なんだ！\n{floor}階の埃はきらきらしてるよ。',
        '星が窓より近く感じるね。\n{floor}階は不思議なくらい静かだよ。',
        '塔が呼吸するみたいに震えてる……\n{floor}階から特にそうだよ。変だよね？',
      ],
      apprentice: [
        'ここまで一人で来たなんて信じられない。\n{floor}階だよ、本当にすごい。',
        '息が苦しくなってない？ {floor}階からは\n僕も歩くのが遅くなってる。',
        'ここからは、本当に君自身の意志みたいだ。\n{floor}階、その力を信じて。',
      ],
    },
    summit: {
      archivist: [
        '雲の下の世界の記録は、ここでは意味を失う。\n{floor}階は空に属している。',
        '塔の頂の光についての記録は淡い。\n{floor}階からこそ、それは本物になる。',
        'ここまで来た者の名簿はごく短い。\n{floor}階の静けさが、その証だ。',
      ],
      wisp: [
        '風の音だけが聞こえるでしょ？\n{floor}階には本当に何もない。静かだね。',
        '材料が羽みたいに軽く見える！\n{floor}階の魔力のせいかな。ふふ。',
        '星が窓より近い……\n{floor}階は不思議なほど静まり返ってる。',
      ],
      gatekeeper: [
        '{floor}階まで耐え抜いたのなら、\nもはや並の見習いではない。',
        '塔がかすかに震えている。{floor}階からは\n息を詰めて上れ。',
        'ここからは規則より覚悟が先に立つ。\n{floor}階を心に刻め。',
      ],
      sprite: [
        '雲が足の下にあるよ！ {floor}階は\n本当に空の上なんだ。わくわくするね。',
        '塔が息をするみたいに震えてる……\n{floor}階は違う感じがする。胸がどきどきするよ。',
        'ここまで上れた人なんて、ほとんどいないよ！\n{floor}階、君って特別なのかも。',
      ],
      apprentice: [
        '塔の頂の光が見える気がする……\n{floor}階からは、本当に近く感じるよ。',
        'ここまで来られたなら、普通の登り手じゃない。\n{floor}階、僕も君を信じるよ。',
        '聞こえるのは息の音だけ……\n{floor}階、一緒に静かに進もう。',
      ],
    },
    peak: {
      archivist: [
        '頂は近い。{floor}階の記録は、\nいま私が書き残すことになるだろう。',
        '最後の封印についての記録は、\n{floor}階を越えれば完成する。',
        '{floor}階……ここまで来るとは思わなかった。\n終わりが見えてきたな。',
      ],
      wisp: [
        '塔全体が君を見つめてるみたい！\n{floor}階からは特にね。ふふ。',
        'この高さの重力は、気まぐれじゃなく\n意志を持って動いてるみたい。気をつけて。',
        '{floor}階の空気、もう違って感じない？\nあと少しで届くよ。',
      ],
      gatekeeper: [
        '{floor}階を越えれば、残りはわずかだ。\n最後まで集中を切らすな。',
        '塔の最後の試練が近づいている。\n{floor}階の空気を感じろ。',
        'ここまで来たなら退く道はない。\n{floor}階、終わりまで見届けよ。',
      ],
      sprite: [
        'もう少しだよ！ {floor}階の空気は\n今までと全然違うね。わくわくする。',
        '塔が君を見守っているみたい……\n{floor}階からは、ぼくまで緊張するよ。',
        '{floor}階、終わりが見えてきた気がする！\n一緒に行こう！',
      ],
      apprentice: [
        'ここまで来たなんて、まだ信じられない。\n{floor}階、もう少しだよ。',
        '最後の封印が近い……{floor}階、\n僕も緊張してる。でも君を信じてる。',
        '{floor}階……ここまで来られるなんて\n思わなかった。一緒に終わりを見よう。',
      ],
    },
  },
  pinnedLines: {
    30: 'ここから呪文は少しずつ乱れ始める。\n{floor}階の重力は気まぐれだ。慎重に進め。',
    60: '注意して上れ。{floor}階からは、\n塔そのものが考えているように見える。',
    80: 'ここから塔の設計そのものが変わる。{floor}階は\nもともと塔の一部ではなかった、という説もある。',
    95: 'ほとんど頂だ。{floor}階の先では、\n封じられた魔法そのものを感じるだろう。',
  },
  eventLines: [
    { speaker: 'sprite', text: 'きらきらしたものを見つけたよ！ 君にあげる、受け取って！' },
    { speaker: 'wisp', text: 'ふふ、贈り物だよ。完全にただとは言わないけど……今日はあげる。' },
    { speaker: 'archivist', text: '書架から物が落ちてきた。君の役に立つはずだ。' },
    { speaker: 'gatekeeper', text: '塔はこの試練に挑む資格を認めた。受け取れ。' },
    { speaker: 'apprentice', text: 'ちょうど一つ余ってたんだ……これ、持っていって。幸運を祈るよ！' },
  ],
  itemLabels: {
    bonusMove: '移動回数+3ブースト',
    lineRow: '横一列消去の材料',
    lineCol: '縦一列消去の材料',
    crossBomb: '十字爆弾の材料',
    colorBomb: 'カラーボムの材料',
  },
  stage1: '塔の頂に封じられた魔法を取り戻さねばならない。\n見習いよ、準備ができたなら第一階から始めよう。',
  stage1000: 'ついに塔の頂にたどり着いた。\nここにある魔法は……もう完全に君のものだ。',
};

const zhHans: LangStory = {
  speakerNames: {
    archivist: '老档案师',
    wisp: '鬼火',
    gatekeeper: '塔门守卫',
    sprite: '尘埃精灵',
    apprentice: '见习魔法师',
  },
  bands: {
    early: {
      archivist: [
        '{floor}层的记录尚未收入\n我的书架。你将是第一笔。',
        '越古老的书，越是先写\n{floor}层这样低处的故事。',
        '尘埃下有褪色的字迹。\n{floor}层也曾是某人的开端。',
      ],
      wisp: [
        '嘿嘿，别以为是{floor}层\n我就会放水。小心脚下。',
        '这里有个陷阱...要不要说呢？\n算啦，{floor}层就饶你一次。',
        '以为低层会无聊吗？\n{floor}层也挺有看头的。',
      ],
      gatekeeper: [
        '{floor}层通过。规矩很简单：\n绝不可掉以轻心。',
        '塔的法度从{floor}层起\n同样适用。没有例外。',
        '许多人止步于{floor}层。\n我希望你与他们不同。',
      ],
      sprite: [
        '快看这些灰尘！{floor}层\n住着好多我的朋友呢。',
        '这里有一道小裂缝~{floor}层\n好像也藏着一个秘密。',
        '嘻嘻，{floor}层的台阶\n每踩一步声音都不一样！',
      ],
      apprentice: [
        '我爬到{floor}层时手也\n发抖呢。你也是吧？',
        '{floor}层我还记得。\n别紧张，慢慢来。',
        '像是一起往上爬呢。\n{floor}层，我们都还是新手。',
      ],
    },
    rising: {
      archivist: [
        '从{floor}层起，文字变得\n陌生了。是古语写下的警告。',
        '据说失败咒文的记录\n就在{floor}层某处。',
        '这个高度的记录多有残缺。\n{floor}层的真相尚未完整。',
      ],
      wisp: [
        '重力又快要翻脸啦，\n在{floor}层可要小心！',
        '看见材料在发光吗？\n从{floor}层起魔力变浓了。',
        '吱呀吱呀，听见{floor}层\n楼梯不安地呻吟了吗？',
      ],
      gatekeeper: [
        '从{floor}层起，加倍戒备。\n此处塔性已变得反复无常。',
        '墙上留着止步者的痕迹。\n记住{floor}层。',
        '{floor}层的空气不同。\n疏忽者会被重力吞没。',
      ],
      sprite: [
        '哇，{floor}层墙上的画\n看起来像在动呢！',
        '没有风，烛火却在晃...\n{floor}层有东西，我有点慌。',
        '从{floor}层起字变奇怪了。\n连我也看不懂，嘻嘻。',
      ],
      apprentice: [
        '已经到{floor}层了...你比我\n快多了，老实说有点羡慕。',
        '从这里开始会紧张起来。\n{floor}层，我们一起小心。',
        '老师提醒过我，{floor}层\n要格外谨慎。记住哦。',
      ],
    },
    deep: {
      archivist: [
        '{floor}层的气象记录里\n只反复写着“沉重”二字。',
        '一位迷失魔法师的故事\n留在{floor}层书架上。小心。',
        '关于塔身倾斜的记录，\n确实从{floor}层开始出现。',
      ],
      wisp: [
        '感觉地板在发颤吗？{floor}层\n的重力还没安分下来。',
        '瞧材料彼此吸引的样子，\n{floor}层就是会这样，嘿嘿。',
        '看这根旧法杖？它来自\n{floor}层，主人去哪儿了呢？',
      ],
      gatekeeper: [
        '从{floor}层起，压力会变。\n稳住自己。',
        '能到此高度者寥寥无几。\n感受{floor}层的重量。',
        '塔正一点点倾斜。\n尤其从{floor}层起，保持警戒。',
      ],
      sprite: [
        '材料现在摸起来好硬！\n一定是{floor}层的压力吧。',
        '连我都觉得{floor}层的空气\n变重了...有点喘不过气。',
        '我闻到迷路魔法师的气味...\n{floor}层，我说真的！',
      ],
      apprentice: [
        '从{floor}层起，连我都觉得\n喘不过气。我们慢慢走。',
        '看材料撑到这里的样子，\n我也有劲了...{floor}层，我们行的。',
        '连老师也没提过{floor}层。\n也许我们是第一批到这里的人。',
      ],
    },
    high: {
      archivist: [
        '这里的书从未有人读完。\n{floor}层的知识尚无主人。',
        '{floor}层的记录只反复\n写着一个词：“孤独”。',
        '记录说符文会自行重绘。\n{floor}层似乎记得什么。',
      ],
      wisp: [
        '星光正从窗里倾泻！\n{floor}层已经在云端之上啦。',
        '空气变薄了吧？从{floor}层起\n连我都得留意呼吸，嘿嘿。',
        '连守门人也很少来这里。\n从{floor}层起，就只剩我啦。',
      ],
      gatekeeper: [
        '从{floor}层起，我的巡查稀少。\n你可视自己为独行。',
        '脚步声响得异样。\n{floor}层已空置了许多年。',
        '从这里起，意志比重力更重要。\n{floor}层正考验此事。',
      ],
      sprite: [
        '这里书架上的灰尘也特别！\n{floor}层的灰尘会闪光呢。',
        '星星比窗户还近呢~\n{floor}层安静得很奇怪。',
        '塔像在呼吸一样发颤...\n尤其从{floor}层起，很怪吧？',
      ],
      apprentice: [
        '不敢相信你独自来到这么高。\n{floor}层，真的了不起。',
        '喘不过气了吗？从{floor}层起\n我也走得更慢了。',
        '现在真的像是在靠你的意志。\n{floor}层，相信它吧。',
      ],
    },
    summit: {
      archivist: [
        '下方世界的记录在这里\n已无意义。{floor}层属于天空。',
        '塔顶之光的记录很淡。\n到了{floor}层，真实才显现。',
        '能到此处者名单极短。\n{floor}层的寂静就是证明。',
      ],
      wisp: [
        '只剩风声，对吧？{floor}层\n真的什么都没有，好安静。',
        '材料看起来轻得像羽毛！\n一定是{floor}层的魔力，嘿嘿。',
        '星星比窗户更近了...\n{floor}层静得出奇。',
      ],
      gatekeeper: [
        '能撑到{floor}层，说明你\n已非寻常见习者。',
        '塔在微微颤动。从{floor}层起，\n屏住气往上爬。',
        '从这里起，决心重于规则。\n记住{floor}层。',
      ],
      sprite: [
        '云在脚下啦！{floor}层\n真的高过天空，我好兴奋。',
        '塔像呼吸般发抖...\n{floor}层不一样，我心跳好快。',
        '几乎没人到过这么远！\n{floor}层，你一定很特别。',
      ],
      apprentice: [
        '我好像看见塔顶的光了...\n到{floor}层，感觉它是真的。',
        '能到这里就不是普通攀登者。\n{floor}层，我也相信你。',
        '只听得见呼吸声...\n{floor}层，我们安静地继续吧。',
      ],
    },
    peak: {
      archivist: [
        '顶端已近。{floor}层的记录\n如今将由我亲手写下。',
        '最终封印的记录，等你越过\n{floor}层便会完成。',
        '{floor}层...我没想到\n会走到这里。终点已在眼前。',
      ],
      wisp: [
        '像整座塔都在看着你呢！\n尤其从{floor}层起，嘿嘿。',
        '这个高度的重力像有意志，\n不只是任性。小心。',
        '{floor}层，空气已经\n不一样了吧？快到了。',
      ],
      gatekeeper: [
        '越过{floor}层后所剩无多。\n直到最后都要专注。',
        '塔的最终试炼已然逼近。\n感受{floor}层的空气。',
        '从这里没有退路。\n{floor}层，把它走到尽头。',
      ],
      sprite: [
        '快到啦！{floor}层的空气\n完全不同，我好兴奋。',
        '塔像是在注视着你...\n从{floor}层起我也紧张。',
        '{floor}层，我看见终点\n要来了！一起走吧！',
      ],
      apprentice: [
        '我还是不敢相信走了这么远。\n{floor}层，我们快到了。',
        '最终封印近在眼前...\n{floor}层，我也紧张，但相信你。',
        '{floor}层...没想到真能到这里。\n一起看看结局吧。',
      ],
    },
  },
  pinnedLines: {
    30: '从这里起，咒文开始走偏。\n{floor}层的重力反复无常，小心。',
    60: '谨慎攀登。从{floor}层起，\n这座塔仿佛会自行思考。',
    80: '从这里起，塔的构造本身改变了。\n有人说{floor}层原本并不属于这座塔。',
    95: '快到了。越过{floor}层之后，\n你将亲自感到被封印的魔力。',
  },
  eventLines: [
    { speaker: 'sprite', text: '捡到亮晶晶的东西！给你，拿着吧！' },
    { speaker: 'wisp', text: '嘿嘿，算礼物吧。不是完全免费的...今天就放过你。' },
    { speaker: 'archivist', text: '书架间掉下了一件东西。它应当对你有用。' },
    { speaker: 'gatekeeper', text: '塔认可你有资格承受此试炼。收下。' },
    { speaker: 'apprentice', text: '我正好多一个...给你，拿去吧。祝你好运！' },
  ],
  itemLabels: {
    bonusMove: '移动 +3 增益',
    lineRow: '横排清除材料',
    lineCol: '纵列清除材料',
    crossBomb: '十字爆破材料',
    colorBomb: '彩色爆破材料',
  },
  stage1: '我们必须夺回封印在\n塔顶的魔力。见习者，准备好就开始吧。',
  stage1000: '你终于抵达了塔顶。\n这里的魔力...如今全都属于你了。',
};

const zhHant: LangStory = {
  speakerNames: {
    archivist: '老檔案師',
    wisp: '鬼火',
    gatekeeper: '塔門守衛',
    sprite: '塵埃精靈',
    apprentice: '見習魔法師',
  },
  bands: {
    early: {
      archivist: [
        '{floor}層的記錄尚未收入\n我的書架。你將是第一筆。',
        '越古老的書，越是先寫\n{floor}層這樣低處的故事。',
        '塵埃下有褪色的字跡。\n{floor}層也曾是某人的開端。',
      ],
      wisp: [
        '嘿嘿，別以為是{floor}層\n我就會放水。小心腳下。',
        '這裡有個陷阱...要不要說呢？\n算啦，{floor}層就饒你一次。',
        '以為低層會無聊嗎？\n{floor}層也挺有看頭的。',
      ],
      gatekeeper: [
        '{floor}層通過。規矩很簡單：\n絕不可掉以輕心。',
        '塔的法度從{floor}層起\n同樣適用。沒有例外。',
        '許多人止步於{floor}層。\n我希望你與他們不同。',
      ],
      sprite: [
        '快看這些灰塵！{floor}層\n住著好多我的朋友呢。',
        '這裡有一道小裂縫~{floor}層\n好像也藏著一個祕密。',
        '嘻嘻，{floor}層的臺階\n每踩一步聲音都不一樣！',
      ],
      apprentice: [
        '我爬到{floor}層時手也\n發抖呢。你也是吧？',
        '{floor}層我還記得。\n別緊張，慢慢來。',
        '像是一起往上爬呢。\n{floor}層，我們都還是新手。',
      ],
    },
    rising: {
      archivist: [
        '從{floor}層起，文字變得\n陌生了。是古語寫下的警告。',
        '據說失敗咒文的記錄\n就在{floor}層某處。',
        '這個高度的記錄多有殘缺。\n{floor}層的真相尚未完整。',
      ],
      wisp: [
        '重力又快要翻臉啦，\n在{floor}層可要小心！',
        '看見材料在發光嗎？\n從{floor}層起魔力變濃了。',
        '吱呀吱呀，聽見{floor}層\n樓梯不安地呻吟了嗎？',
      ],
      gatekeeper: [
        '從{floor}層起，加倍戒備。\n此處塔性已變得反覆無常。',
        '牆上留著止步者的痕跡。\n記住{floor}層。',
        '{floor}層的空氣不同。\n疏忽者會被重力吞沒。',
      ],
      sprite: [
        '哇，{floor}層牆上的畫\n看起來像在動呢！',
        '沒有風，燭火卻在晃...\n{floor}層有東西，我有點慌。',
        '從{floor}層起字變奇怪了。\n連我也看不懂，嘻嘻。',
      ],
      apprentice: [
        '已經到{floor}層了...你比我\n快多了，老實說有點羨慕。',
        '從這裡開始會緊張起來。\n{floor}層，我們一起小心。',
        '老師提醒過我，{floor}層\n要格外謹慎。記住喔。',
      ],
    },
    deep: {
      archivist: [
        '{floor}層的氣象記錄裡\n只反覆寫著「沉重」二字。',
        '一位迷失魔法師的故事\n留在{floor}層書架上。小心。',
        '關於塔身傾斜的記錄，\n確實從{floor}層開始出現。',
      ],
      wisp: [
        '感覺地板在發顫嗎？{floor}層\n的重力還沒安分下來。',
        '瞧材料彼此吸引的樣子，\n{floor}層就是會這樣，嘿嘿。',
        '看這根舊法杖？它來自\n{floor}層，主人去哪兒了呢？',
      ],
      gatekeeper: [
        '從{floor}層起，壓力會變。\n穩住自己。',
        '能到此高度者寥寥無幾。\n感受{floor}層的重量。',
        '塔正一點點傾斜。\n尤其從{floor}層起，保持警戒。',
      ],
      sprite: [
        '材料現在摸起來好硬！\n一定是{floor}層的壓力吧。',
        '連我都覺得{floor}層的空氣\n變重了...有點喘不過氣。',
        '我聞到迷路魔法師的氣味...\n{floor}層，我說真的！',
      ],
      apprentice: [
        '從{floor}層起，連我都覺得\n喘不過氣。我們慢慢走。',
        '看材料撐到這裡的樣子，\n我也有勁了...{floor}層，我們行的。',
        '連老師也沒提過{floor}層。\n也許我們是第一批到這裡的人。',
      ],
    },
    high: {
      archivist: [
        '這裡的書從未有人讀完。\n{floor}層的知識尚無主人。',
        '{floor}層的記錄只反覆\n寫著一個詞：「孤獨」。',
        '記錄說符文會自行重繪。\n{floor}層似乎記得什麼。',
      ],
      wisp: [
        '星光正從窗裡傾瀉！\n{floor}層已經在雲端之上啦。',
        '空氣變薄了吧？從{floor}層起\n連我都得留意呼吸，嘿嘿。',
        '連守門人也很少來這裡。\n從{floor}層起，就只剩我啦。',
      ],
      gatekeeper: [
        '從{floor}層起，我的巡查稀少。\n你可視自己為獨行。',
        '腳步聲響得異樣。\n{floor}層已空置了許多年。',
        '從這裡起，意志比重力更重要。\n{floor}層正考驗此事。',
      ],
      sprite: [
        '這裡書架上的灰塵也特別！\n{floor}層的灰塵會閃光呢。',
        '星星比窗戶還近呢~\n{floor}層安靜得很奇怪。',
        '塔像在呼吸一樣發顫...\n尤其從{floor}層起，很怪吧？',
      ],
      apprentice: [
        '不敢相信你獨自來到這麼高。\n{floor}層，真的了不起。',
        '喘不過氣了嗎？從{floor}層起\n我也走得更慢了。',
        '現在真的像是在靠你的意志。\n{floor}層，相信它吧。',
      ],
    },
    summit: {
      archivist: [
        '下方世界的記錄在這裡\n已無意義。{floor}層屬於天空。',
        '塔頂之光的記錄很淡。\n到了{floor}層，真實才顯現。',
        '能到此處者名單極短。\n{floor}層的寂靜就是證明。',
      ],
      wisp: [
        '只剩風聲，對吧？{floor}層\n真的什麼都沒有，好安靜。',
        '材料看起來輕得像羽毛！\n一定是{floor}層的魔力，嘿嘿。',
        '星星比窗戶更近了...\n{floor}層靜得出奇。',
      ],
      gatekeeper: [
        '能撐到{floor}層，說明你\n已非尋常見習者。',
        '塔在微微顫動。從{floor}層起，\n屏住氣往上爬。',
        '從這裡起，決心重於規則。\n記住{floor}層。',
      ],
      sprite: [
        '雲在腳下啦！{floor}層\n真的高過天空，我好興奮。',
        '塔像呼吸般發抖...\n{floor}層不一樣，我心跳好快。',
        '幾乎沒人到過這麼遠！\n{floor}層，你一定很特別。',
      ],
      apprentice: [
        '我好像看見塔頂的光了...\n到{floor}層，感覺它是真的。',
        '能到這裡就不是普通攀登者。\n{floor}層，我也相信你。',
        '只聽得見呼吸聲...\n{floor}層，我們安靜地繼續吧。',
      ],
    },
    peak: {
      archivist: [
        '頂端已近。{floor}層的記錄\n如今將由我親手寫下。',
        '最終封印的記錄，等你越過\n{floor}層便會完成。',
        '{floor}層...我沒想到\n會走到這裡。終點已在眼前。',
      ],
      wisp: [
        '像整座塔都在看著你呢！\n尤其從{floor}層起，嘿嘿。',
        '這個高度的重力像有意志，\n不只是任性。小心。',
        '{floor}層，空氣已經\n不一樣了吧？快到了。',
      ],
      gatekeeper: [
        '越過{floor}層後所剩無多。\n直到最後都要專注。',
        '塔的最終試煉已然逼近。\n感受{floor}層的空氣。',
        '從這裡沒有退路。\n{floor}層，把它走到盡頭。',
      ],
      sprite: [
        '快到啦！{floor}層的空氣\n完全不同，我好興奮。',
        '塔像是在注視著你...\n從{floor}層起我也緊張。',
        '{floor}層，我看見終點\n要來了！一起走吧！',
      ],
      apprentice: [
        '我還是不敢相信走了這麼遠。\n{floor}層，我們快到了。',
        '最終封印近在眼前...\n{floor}層，我也緊張，但相信你。',
        '{floor}層...沒想到真能到這裡。\n一起看看結局吧。',
      ],
    },
  },
  pinnedLines: {
    30: '從這裡起，咒文開始走偏。\n{floor}層的重力反覆無常，小心。',
    60: '謹慎攀登。從{floor}層起，\n這座塔彷彿會自行思考。',
    80: '從這裡起，塔的構造本身改變了。\n有人說{floor}層原本並不屬於這座塔。',
    95: '快到了。越過{floor}層之後，\n你將親自感到被封印的魔力。',
  },
  eventLines: [
    { speaker: 'sprite', text: '撿到亮晶晶的東西！給你，拿著吧！' },
    { speaker: 'wisp', text: '嘿嘿，算禮物吧。不是完全免費的...今天就放過你。' },
    { speaker: 'archivist', text: '書架間掉下了一件東西。它應當對你有用。' },
    { speaker: 'gatekeeper', text: '塔認可你有資格承受此試煉。收下。' },
    { speaker: 'apprentice', text: '我正好多一個...給你，拿去吧。祝你好運！' },
  ],
  itemLabels: {
    bonusMove: '移動 +3 增益',
    lineRow: '橫排清除材料',
    lineCol: '縱列清除材料',
    crossBomb: '十字爆破材料',
    colorBomb: '彩色爆破材料',
  },
  stage1: '我們必須奪回封印在\n塔頂的魔力。見習者，準備好就開始吧。',
  stage1000: '你終於抵達了塔頂。\n這裡的魔力...如今全都屬於你了。',
};

const es: LangStory = {
  speakerNames: {
    archivist: 'Viejo Archivista',
    wisp: 'Fuego Fatuo',
    gatekeeper: 'Guardián de la Torre',
    sprite: 'Duende del Polvo',
    apprentice: 'Maga Aprendiz',
  },
  bands: {
    early: {
      archivist: [
        'El piso {floor} aún no figura\nen mis estantes. Tú escribirás su primera línea.',
        'Los libros más antiguos empiezan\npor pisos bajos como el {floor}.',
        'Hay tinta desvaída bajo el polvo.\nEl piso {floor} también fue un comienzo.',
      ],
      wisp: [
        'Je, no habrá piedad solo porque\nsea el piso {floor}. Mira dónde pisas.',
        'Hay una trampa aquí... ¿te aviso?\nBah, por ser el piso {floor}, te la perdono.',
        '¿Creías que un piso bajo aburriría?\nEl piso {floor} todavía muerde.',
      ],
      gatekeeper: [
        'Piso {floor}, superado. La regla es\nsimple: jamás bajes la guardia.',
        'La ley de la torre se aplica igual\ndesde el piso {floor}. Sin excepciones.',
        'Muchos se detuvieron en el piso {floor}.\nEspero que tú seas diferente.',
      ],
      sprite: [
        '¡Mira este polvo! En el piso {floor}\nviven muchísimos amigos míos.',
        'Una grieta pequeñita~ hasta el piso {floor}\nparece esconder un secreto.',
        'Ji ji, las escaleras del piso {floor}\nsuenan distinto con cada paso.',
      ],
      apprentice: [
        'A mí también me temblaron las manos\nal subir al piso {floor}. ¿A ti igual?',
        'Recuerdo bastante bien el piso {floor}.\nNo te pongas nerviosa, ve despacio.',
        'Se siente como si subiéramos juntas.\nPiso {floor}, aún somos principiantes.',
      ],
    },
    rising: {
      archivist: [
        'Desde el piso {floor}, las letras\nse vuelven extrañas: advertencias antiguas.',
        'Oí que los registros de conjuros fallidos\nreposan en algún lugar del piso {floor}.',
        'Los registros de esta altura están dañados.\nLa verdad del piso {floor} sigue incompleta.',
      ],
      wisp: [
        'La gravedad está por voltearse otra vez;\n¡cuidado en el piso {floor}!',
        '¿Ves cómo brillan los ingredientes?\nLa magia espesa desde el piso {floor}.',
        'Cric, cric... ¿oyes la escalera\nquejarse inquieta en el piso {floor}?',
      ],
      gatekeeper: [
        'Desde el piso {floor}, dobla la guardia.\nLa torre se vuelve caprichosa aquí.',
        'Las marcas de quienes pararon aquí\ncubren los muros. Recuerda el piso {floor}.',
        'El aire cambia en el piso {floor}.\nLa gravedad devora a quienes se descuidan.',
      ],
      sprite: [
        '¡Guau, los dibujos de las paredes\ndel piso {floor} parecen moverse!',
        'La vela tiembla sin viento...\nhay algo en el piso {floor}, me da nervios.',
        'La escritura se tuerce desde el piso {floor}.\nNi yo puedo leerla, ji ji.',
      ],
      apprentice: [
        '¿Ya llegaste al piso {floor}? Vas\nmás rápido que yo, y me da un poco de envidia.',
        'Desde aquí se pone tenso.\nPiso {floor}, tengamos cuidado juntas.',
        'Mi maestra advirtió que el piso {floor}\nrequiere más cuidado. Recuérdalo.',
      ],
    },
    deep: {
      archivist: [
        'Los registros del clima del piso {floor}\nsolo repiten la palabra “pesado”.',
        'La historia de una maga perdida permanece\nen los estantes del piso {floor}. Cuidado.',
        'Los registros de la torre inclinándose\naparecen desde el piso {floor}.',
      ],
      wisp: [
        '¿Sientes temblar el suelo? El piso {floor}\naún no ha asentado su gravedad.',
        'Mira cómo los ingredientes se atraen aquí.\nEn el piso {floor} pasa eso, je.',
        '¿Ves este viejo bastón? Viene del\npiso {floor}; ¿adónde fue su dueña?',
      ],
      gatekeeper: [
        'Desde el piso {floor}, la presión\ncambia. Afírmate.',
        'Pocos alcanzaron esta altura.\nSiente el peso del piso {floor}.',
        'La torre se inclina poco a poco.\nSobre todo desde el piso {floor}. Alerta.',
      ],
      sprite: [
        '¡Los ingredientes se sienten durísimos!\nDebe de ser la presión del piso {floor}.',
        'Hasta yo siento el aire pesado\nen el piso {floor}... cuesta respirar.',
        'Huelo a una maga perdida por ahí...\npiso {floor}, ¡te juro que es cierto!',
      ],
      apprentice: [
        'Desde el piso {floor}, hasta yo\nme quedo sin aire. Vayamos despacio.',
        'Ver cómo resistieron los ingredientes\nme anima... piso {floor}, podemos hacerlo.',
        'Ni mi maestra mencionó el piso {floor}.\nQuizá somos las primeras en llegar.',
      ],
    },
    high: {
      archivist: [
        'Nadie ha leído los libros de aquí arriba.\nEl saber del piso {floor} no tiene dueño.',
        'Los registros del piso {floor} solo\nrepiten una palabra: “soledad”.',
        'Un registro dice que los sellos se redibujan.\nEl piso {floor} parece recordar algo.',
      ],
      wisp: [
        '¡La luz de las estrellas entra por la ventana!\nEl piso {floor} ya está sobre las nubes.',
        '¿Notas el aire delgado? Desde el piso {floor}\nhasta yo cuido mi aliento, je.',
        'Ni el guardián viene casi nunca aquí.\nDesde el piso {floor}, quedo solo yo.',
      ],
      gatekeeper: [
        'Mis rondas escasean desde el piso {floor}.\nConsidérate a solas.',
        'Los pasos resuenan de forma extraña.\nEl piso {floor} lleva eras vacío.',
        'Desde aquí, la voluntad pesa más\nque la gravedad; el piso {floor} lo prueba.',
      ],
      sprite: [
        '¡Hasta el polvo de estos estantes\nes especial! El del piso {floor} brilla.',
        'Las estrellas parecen más cerca que las ventanas~\nel piso {floor} está raramente callado.',
        'La torre tiembla como si respirara...\nsobre todo desde el piso {floor}, ¿raro, no?',
      ],
      apprentice: [
        'No puedo creer que llegaras tan alto sola.\nPiso {floor}, eso es increíble.',
        '¿Te falta el aire? Desde el piso {floor}\nyo también camino más lento.',
        'Ahora sí parece depender de tu voluntad.\nPiso {floor}, cree en ella.',
      ],
    },
    summit: {
      archivist: [
        'Los registros del mundo inferior\nno valen aquí. El piso {floor} pertenece al cielo.',
        'Los registros de la luz de la cumbre\nson tenues. En el piso {floor} empieza lo real.',
        'La lista de quienes llegaron tan lejos\nes breve. El silencio del piso {floor} lo prueba.',
      ],
      wisp: [
        'Solo se oye el viento, ¿verdad?\nNo hay nada en el piso {floor}; qué silencio.',
        '¡Los ingredientes parecen plumas!\nSerá la magia del piso {floor}, je.',
        'Las estrellas parecen más cerca que la ventana...\nel piso {floor} está extrañamente quieto.',
      ],
      gatekeeper: [
        'Si resististe hasta el piso {floor},\nno eres una aprendiz común.',
        'La torre tiembla apenas. Desde el\npiso {floor}, sube conteniendo el aliento.',
        'Desde aquí, la resolución pesa más\nque las reglas. Recuerda el piso {floor}.',
      ],
      sprite: [
        '¡Las nubes están bajo tus pies! El piso {floor}\nde verdad está sobre el cielo, qué emoción.',
        'La torre se estremece como si respirara...\nel piso {floor} se siente distinto; me late todo.',
        '¡Casi nadie llegó tan lejos!\nPiso {floor}, debes de ser especial.',
      ],
      apprentice: [
        'Creo ver la luz de la cima...\ndesde el piso {floor}, se siente real.',
        'Llegar tan lejos significa que no eres\nuna escaladora común. Piso {floor}, creo en ti.',
        'Solo se oye nuestra respiración...\npiso {floor}, sigamos juntas en silencio.',
      ],
    },
    peak: {
      archivist: [
        'La cumbre está cerca. Ahora seré yo\nquien escriba el registro del piso {floor}.',
        'El registro del sello final quedará\ncompleto cuando pases el piso {floor}.',
        'Piso {floor}... nunca pensé\nque llegaríamos tan lejos. El final se ve.',
      ],
      wisp: [
        '¡Parece que toda la torre te mira!\nSobre todo desde el piso {floor}, je.',
        'La gravedad a esta altura se mueve\ncon voluntad, no con capricho. Cuidado.',
        'Piso {floor}, ¿no sientes ya\nque el aire cambió? Falta poco.',
      ],
      gatekeeper: [
        'Queda poco más allá del piso {floor}.\nConcéntrate hasta el final.',
        'La prueba final de la torre se acerca.\nSiente el aire del piso {floor}.',
        'Desde aquí no hay regreso.\nPiso {floor}, llega hasta el final.',
      ],
      sprite: [
        '¡Ya casi! El aire del piso {floor}\nse siente completamente distinto, qué emoción.',
        'La torre parece estar mirándote...\ndesde el piso {floor} yo también estoy nerviosa.',
        'Piso {floor}, ¡puedo ver\nque se acerca el final! ¡Vamos juntas!',
      ],
      apprentice: [
        'Aún no creo que hayamos llegado tan lejos.\nPiso {floor}, ya casi estamos.',
        'El sello final se acerca...\npiso {floor}, yo también tiemblo, pero creo en ti.',
        'Piso {floor}... jamás pensé que llegaríamos aquí.\nVeamos el final juntas.',
      ],
    },
  },
  pinnedLines: {
    30: 'Desde aquí, los conjuros empiezan a desviarse.\nLa gravedad del piso {floor} es caprichosa; cuidado.',
    60: 'Sube con cuidado. Desde el piso {floor},\nla torre parece pensar por sí misma.',
    80: 'Desde aquí cambia el diseño mismo de la torre.\nDicen que el piso {floor} nunca fue parte de la original.',
    95: 'Ya casi. Más allá del piso {floor},\nsentirás la magia sellada en persona.',
  },
  eventLines: [
    { speaker: 'sprite', text: '¡Encontré algo brillante! Es tuyo, ¡toma!' },
    { speaker: 'wisp', text: 'Je, un regalo. No exactamente gratis, pero... hoy lo dejaré pasar.' },
    { speaker: 'archivist', text: 'Algo cayó entre los estantes. Debería servirte.' },
    { speaker: 'gatekeeper', text: 'La torre te juzga digna de esta prueba. Tómalo.' },
    { speaker: 'apprentice', text: 'Tenía uno de sobra... aquí, llévatelo. ¡Buena suerte!' },
  ],
  itemLabels: {
    bonusMove: 'Impulso +3 movimientos',
    lineRow: 'Ingrediente limpia fila',
    lineCol: 'Ingrediente limpia columna',
    crossBomb: 'Ingrediente bomba cruz',
    colorBomb: 'Ingrediente bomba de color',
  },
  stage1: 'Debemos recuperar la magia sellada\nen la cima de la torre. Aprendiz, empecemos si estás lista.',
  stage1000: 'Por fin llegaste a la cima de la torre.\nLa magia de aquí... ahora es toda tuya.',
};

const es419: LangStory = {
  speakerNames: {
    archivist: 'Viejo Archivista',
    wisp: 'Fuego Fatuo',
    gatekeeper: 'Guardián de la Torre',
    sprite: 'Duendecillo del Polvo',
    apprentice: 'Aprendiz de Maga',
  },
  bands: {
    early: {
      archivist: [
        'El piso {floor} todavía no figura\nen mis anaqueles. Tú dejarás su primer registro.',
        'Los libros más antiguos empiezan\npor pisos bajos como el {floor}.',
        'Se ve tinta vieja bajo el polvo.\nEl piso {floor} también fue el inicio de alguien.',
      ],
      wisp: [
        'Je, no habrá trato suave solo porque\nsea el piso {floor}. Cuida tus pasos.',
        'Hay una trampa por aquí... ¿te digo?\nBueno, por ser el piso {floor}, te ayudo.',
        '¿Pensaste que un piso bajo sería aburrido?\nEl piso {floor} tiene su gracia.',
      ],
      gatekeeper: [
        'Piso {floor}, superado. La regla es\nsimple: no bajes la guardia.',
        'La ley de la torre rige igual\ndesde el piso {floor}. No hay excepciones.',
        'Muchos se quedaron en el piso {floor}.\nEspero que tú seas diferente.',
      ],
      sprite: [
        '¡Mira cuánto polvo! En el piso {floor}\nviven un montón de mis amigos.',
        'Una grieta chiquita~ hasta el piso {floor}\nparece guardar un secreto.',
        'Ji ji, las escaleras del piso {floor}\nsuenan distinto con cada pisada.',
      ],
      apprentice: [
        'A mí también me temblaron las manos\nal subir al piso {floor}. ¿A ti no?',
        'El piso {floor} sí lo recuerdo.\nNo te apures, ve paso a paso.',
        'Siento que subimos juntas. Piso {floor},\ntodavía somos principiantes las dos.',
      ],
    },
    rising: {
      archivist: [
        'Desde el piso {floor}, las letras se vuelven\nextrañas: advertencias en lengua antigua.',
        'Dicen que registros de hechizos fallidos\nquedan en algún rincón del piso {floor}.',
        'Los registros de esta altura están dañados.\nLa verdad del piso {floor} aún está incompleta.',
      ],
      wisp: [
        'La gravedad va a voltearse otra vez,\n¡mucho cuidado en el piso {floor}!',
        '¿Ves cómo brillan los ingredientes?\nDesde el piso {floor}, la magia se pone densa.',
        'Cric, cric... ¿oyes cómo la escalera\ngime nerviosa en el piso {floor}?',
      ],
      gatekeeper: [
        'Desde el piso {floor}, duplica la guardia.\nLa torre se vuelve caprichosa aquí.',
        'Las huellas de quienes se detuvieron aquí\nmarcan los muros. Recuerda el piso {floor}.',
        'El aire cambia en el piso {floor}.\nLa gravedad devora a quien se descuida.',
      ],
      sprite: [
        '¡Guau, los dibujos en las paredes\ndel piso {floor} parecen moverse!',
        'La vela tiembla sin viento...\nhay algo en el piso {floor}, qué nervios.',
        'Desde el piso {floor}, la escritura se pone rara.\nNi yo la entiendo, ji ji.',
      ],
      apprentice: [
        '¿Ya llegaste al piso {floor}? Vas más rápido\nque yo... la verdad, me da envidia.',
        'Desde aquí sí se pone tenso.\nPiso {floor}, cuidémonos juntas.',
        'Mi maestra dijo que desde el piso {floor}\nhay que tener especial cuidado. Recuérdalo.',
      ],
    },
    deep: {
      archivist: [
        'Los registros del aire en el piso {floor}\nsolo repiten una palabra: "pesado".',
        'La historia de una maga perdida sigue\nen los anaqueles del piso {floor}. Cuidado.',
        'Los informes de una torre inclinada\nempiezan a cumplirse desde el piso {floor}.',
      ],
      wisp: [
        '¿Sientes que el suelo se mueve? El piso {floor}\ntodavía tiene la gravedad desquiciada.',
        'Mira cómo los ingredientes se atraen entre sí;\nen el piso {floor} pasa más, je.',
        '¿Viste este bastón viejo? Es del piso {floor};\nme pregunto dónde quedó su dueño.',
      ],
      gatekeeper: [
        'Desde el piso {floor}, la presión\nes distinta. Mantente firme.',
        'No muchos llegan a esta altura.\nSiente el peso del piso {floor}.',
        'La torre se inclina poco a poco.\nDesde el piso {floor} se nota más. Alerta.',
      ],
      sprite: [
        '¡Los ingredientes se pusieron durísimos!\nDebe de ser la presión del piso {floor}.',
        'Hasta a mí el aire del piso {floor}\nse me hace pesado... cuesta respirar.',
        'Huele a maga perdida por alguna parte...\npiso {floor}, ¡lo digo en serio!',
      ],
      apprentice: [
        'Desde el piso {floor}, hasta yo\nsiento que me falta el aire. Vamos lento.',
        'Ver ingredientes que resistieron tanto\nme da ánimo... piso {floor}, sí podemos.',
        'Mi maestra tampoco habló del piso {floor}.\nTal vez seamos las primeras en llegar.',
      ],
    },
    high: {
      archivist: [
        'Nadie ha leído los libros de estos anaqueles.\nEl saber del piso {floor} no tiene dueño.',
        'Los registros del piso {floor} repiten\nuna sola palabra: "soledad".',
        'Hay registros de círculos mágicos que se redibujan.\nEl piso {floor} parece recordar algo.',
      ],
      wisp: [
        '¡La luz de las estrellas entra por la ventana!\nEl piso {floor} ya está sobre las nubes.',
        '¿Notas el aire delgado? Desde el piso {floor},\nhasta yo cuido cómo respiro, je.',
        'Ni el guardián suele venir aquí.\nDesde el piso {floor}, puedes contar conmigo.',
      ],
      gatekeeper: [
        'Desde el piso {floor}, mis rondas son raras.\nConsidérate sola.',
        'Los pasos resuenan demasiado fuerte.\nEl piso {floor} lleva mucho tiempo vacío.',
        'Desde aquí, tu voluntad pesa más\nque la gravedad. Esa es la prueba del piso {floor}.',
      ],
      sprite: [
        '¡Hasta el polvo de estos estantes es especial!\nEl polvo del piso {floor} brilla.',
        'Las estrellas parecen más cerca que las ventanas~\nel piso {floor} está extrañamente callado.',
        'La torre tiembla como si respirara...\ndesde el piso {floor} se siente mucho. ¿Raro, no?',
      ],
      apprentice: [
        'No puedo creer que hayas llegado sola hasta aquí.\nPiso {floor}, eres increíble.',
        '¿No te falta el aire? Desde el piso {floor},\nyo también camino más despacio.',
        'Desde aquí parece depender de tu voluntad.\nPiso {floor}, confía en ella.',
      ],
    },
    summit: {
      archivist: [
        'Los registros del mundo bajo las nubes\nya no valen aquí. El piso {floor} es parte del cielo.',
        'Los textos sobre la luz de la cima son borrosos.\nDesde el piso {floor}, verás la verdad.',
        'La lista de quienes llegaron tan alto\nes muy corta. El silencio del piso {floor} lo prueba.',
      ],
      wisp: [
        'Solo se oye el viento, ¿verdad?\nEn el piso {floor} no hay nada de nada. Qué quieto.',
        '¡Los ingredientes parecen tener alas!\nSerá la magia del piso {floor}, je.',
        'Las estrellas están más cerca que la ventana...\nel piso {floor} está raro de tan tranquilo.',
      ],
      gatekeeper: [
        'Si resististe hasta el piso {floor},\nno eres una aprendiz cualquiera.',
        'La torre vibra apenas. Desde el piso {floor},\nsube conteniendo el aliento.',
        'Desde aquí, el temple viene antes que las reglas.\nRecuerda el piso {floor}.',
      ],
      sprite: [
        '¡Las nubes están bajo tus pies! El piso {floor}\nde verdad queda sobre el cielo, ¡qué emoción!',
        'La torre se balancea como si respirara...\nel piso {floor} es distinto, late fuerte.',
        '¡Casi nadie ha subido hasta acá!\nPiso {floor}, creo que eres especial.',
      ],
      apprentice: [
        'Creo que veo la luz de la cima...\ndesde el piso {floor}, se siente real.',
        'Si llegaste hasta aquí, no eres nada común.\nPiso {floor}, yo también voy a creer.',
        'Solo se oye la respiración...\npiso {floor}, sigamos juntas en silencio.',
      ],
    },
    peak: {
      archivist: [
        'La cumbre está a un paso. El registro\ndel piso {floor} tendré que escribirlo yo.',
        'El registro del sello final quedará completo\ncuando atravieses el piso {floor}.',
        'Piso {floor}... ni yo pensé\nque llegarías hasta aquí. Ya se ve el final.',
      ],
      wisp: [
        '¡Parece que toda la torre te observa!\nDesde el piso {floor} se siente más, je.',
        'A esta altura, la gravedad no es capricho:\nse mueve como si tuviera voluntad. Cuidado.',
        'Piso {floor}, ¿no sientes que el aire\nya cambió? Ya casi llegas.',
      ],
      gatekeeper: [
        'Tras pasar el piso {floor}, queda poco.\nConcéntrate hasta el final.',
        'La última prueba de la torre se acerca.\nSiente el aire del piso {floor}.',
        'Si llegaste hasta aquí, no hay vuelta atrás.\nPiso {floor}, avanza hasta el final.',
      ],
      sprite: [
        '¡Ya casi llegamos! El aire del piso {floor}\nes completamente distinto, qué emoción.',
        'La torre parece estar mirándote...\ndesde el piso {floor}, yo también tiemblo.',
        'Piso {floor}, ¡creo que ya\nse ve el final! ¡Vamos juntas!',
      ],
      apprentice: [
        'Todavía no creo que llegaras al piso {floor}.\nYa casi estamos.',
        'El sello final está cerca...\npiso {floor}, también tiemblo, pero creo en ti.',
        'Piso {floor}... no pensé que llegaríamos.\nVeamos el final juntas.',
      ],
    },
  },
  pinnedLines: {
    30: 'Desde aquí, los hechizos empiezan a desviarse.\nLa gravedad del piso {floor} es caprichosa; ten cuidado.',
    60: 'Sube con cuidado. Desde el piso {floor},\nla torre parece pensar por sí misma.',
    80: 'Desde aquí cambia el plano mismo de la torre.\nDicen que el piso {floor} no era parte original de ella.',
    95: 'Ya casi. Más allá del piso {floor},\nsentirás directamente la magia sellada.',
  },
  eventLines: [
    { speaker: 'sprite', text: '¡Encontré algo brillante! Te lo doy, ¡tómalo!' },
    { speaker: 'wisp', text: 'Je, es un regalo. No es gratis... pero hoy te lo dejo.' },
    { speaker: 'archivist', text: 'Un objeto cayó entre los anaqueles. Te será útil.' },
    { speaker: 'gatekeeper', text: 'La torre reconoció tu derecho a ser puesta a prueba. Recíbelo.' },
    { speaker: 'apprentice', text: 'Tenía uno más... llévatelo tú. ¡Buena suerte!' },
  ],
  itemLabels: {
    bonusMove: 'Potenciador +3 movimientos',
    lineRow: 'Ingrediente limpia fila',
    lineCol: 'Ingrediente limpia columna',
    crossBomb: 'Ingrediente bomba cruz',
    colorBomb: 'Ingrediente bomba de color',
  },
  stage1: 'Debemos recuperar la magia sellada\nen la cima de la torre. Aprendiz, empecemos si estás lista.',
  stage1000: 'Por fin llegaste al final de la torre.\nLa magia de este lugar... ahora es toda tuya.',
};

const pt: LangStory = {
  speakerNames: {
    archivist: 'Velho Arquivista',
    wisp: 'Fogo-Fátuo',
    gatekeeper: 'Guardião da Torre',
    sprite: 'Duende do Pó',
    apprentice: 'Aprendiz de Maga',
  },
  bands: {
    early: {
      archivist: [
        'O registo do piso {floor} ainda\nnão está nas minhas estantes. Serás tu a deixá-lo.',
        'Quanto mais antigo o livro, mais começa\npor pisos baixos como o {floor}.',
        'Vejo letras antigas sob o pó.\nO piso {floor} também foi o começo de alguém.',
      ],
      wisp: [
        'Hehe, não há descanso só por ser\no piso {floor}. Cuidado onde pisas.',
        'Há uma armadilha aqui... digo-te ou não?\nPor ser o piso {floor}, vá, eu aviso.',
        'Achaste que um piso baixo seria aborrecido?\nO piso {floor} até tem graça.',
      ],
      gatekeeper: [
        'Piso {floor}, ultrapassado. A regra é\nsimples: nunca baixes a guarda.',
        'A lei da torre aplica-se igualmente\ndesde o piso {floor}. Sem exceções.',
        'Muitos pararam no piso {floor}.\nEspero que sejas diferente.',
      ],
      sprite: [
        'Olha este pó! No piso {floor}\nvivem imensos amigos meus.',
        'Uma fenda pequenina~ até o piso {floor}\nparece esconder um segredo.',
        'Hi hi, as escadas do piso {floor}\nsoam diferente a cada passo!',
      ],
      apprentice: [
        'Também me tremiam as mãos quando subi\nao piso {floor}. Contigo também acontece?',
        'Do piso {floor} ainda me lembro.\nNão fiques nervosa, vai devagar.',
        'Parece que subimos juntas. Piso {floor},\nainda somos ambas principiantes.',
      ],
    },
    rising: {
      archivist: [
        'A partir do piso {floor}, as letras tornam-se\nestranhas: avisos numa língua antiga.',
        'Ouvi dizer que registos de feitiços falhados\nficaram algures no piso {floor}.',
        'Os registos desta altura estão danificados.\nA verdade do piso {floor} ainda está incompleta.',
      ],
      wisp: [
        'A gravidade vai virar outra vez,\ntem muito cuidado no piso {floor}!',
        'Vês os ingredientes a brilhar?\nDesde o piso {floor}, a magia ficou mais densa.',
        'Nhec, nhec... ouves as escadas\na gemer inquietas no piso {floor}?',
      ],
      gatekeeper: [
        'Desde o piso {floor}, redobra a vigilância.\nA torre torna-se caprichosa nesta zona.',
        'As marcas dos que aqui pararam estão\nnas paredes. Não esqueças o piso {floor}.',
        'O ar do piso {floor} é diferente.\nQuem se descuida é engolido pela gravidade.',
      ],
      sprite: [
        'Uau, os desenhos nas paredes do piso {floor}\nparecem estar a mexer-se!',
        'A vela treme sem vento...\nhá algo no piso {floor}, que nervoso.',
        'Desde o piso {floor}, a escrita fica esquisita.\nNem eu a consigo ler, hi hi.',
      ],
      apprentice: [
        'Já chegaste ao piso {floor}... és\nmais rápida do que eu, confesso que invejo.',
        'Daqui para a frente é que assusta.\nPiso {floor}, vamos com cuidado juntas.',
        'A mestra disse para ter especial cuidado\na partir do piso {floor}. Lembra-te.',
      ],
    },
    deep: {
      archivist: [
        'Nos registos do ar do piso {floor},\nsó se repete a palavra "pesado".',
        'A história de uma maga perdida ficou\nnas estantes do piso {floor}. Tem cuidado.',
        'Os registos de que a torre se inclina\ncomeçam mesmo a ver-se no piso {floor}.',
      ],
      wisp: [
        'Sentes o chão a tremer? O piso {floor}\nainda tem a gravidade toda avariada.',
        'Olha como os ingredientes se atraem;\nno piso {floor} é mesmo assim, hehe.',
        'Viste este bastão velho? É do piso {floor};\nonde terá ido parar a dona?',
      ],
      gatekeeper: [
        'Desde o piso {floor}, a pressão\né outra. Aguenta firme.',
        'Poucos chegaram a esta altura.\nSente o peso do piso {floor}.',
        'A torre inclina-se aos poucos.\nDesde o piso {floor}, sobretudo. Mantém-te alerta.',
      ],
      sprite: [
        'Os ingredientes ficaram duríssimos!\nDeve ser a pressão do piso {floor}.',
        'Até eu sinto o ar do piso {floor}\nmais pesado... custa respirar.',
        'Cheira-me a maga perdida por aí...\npiso {floor}, é mesmo verdade!',
      ],
      apprentice: [
        'Desde o piso {floor}, até eu\nfico sem fôlego. Vamos devagar.',
        'Ver os ingredientes resistirem até aqui\ndá-me força... piso {floor}, conseguimos.',
        'Nem a mestra me falou do piso {floor}.\nTalvez sejamos as primeiras.',
      ],
    },
    high: {
      archivist: [
        'Ninguém conseguiu ler os livros daqui de cima.\nO saber do piso {floor} não tem dono.',
        'Nos registos do piso {floor}, só\nse repete uma palavra: "solidão".',
        'Há registos de círculos mágicos que se redesenham.\nO piso {floor} parece lembrar-se de algo.',
      ],
      wisp: [
        'A luz das estrelas entra pela janela!\nO piso {floor} já está acima das nuvens.',
        'Sentes o ar rarefeito? Desde o piso {floor},\naté eu tenho cuidado ao respirar, hehe.',
        'Nem o guardião vem muito aqui.\nDesde o piso {floor}, podes contar só comigo.',
      ],
      gatekeeper: [
        'Desde o piso {floor}, as minhas rondas\nsão raras. Considera-te sozinha.',
        'Os passos ecoam demasiado alto.\nO piso {floor} está vazio há muito tempo.',
        'Daqui em diante, a tua vontade importa mais\nque a gravidade: é a prova do piso {floor}.',
      ],
      sprite: [
        'Até o pó das estantes é especial!\nO pó do piso {floor} brilha.',
        'As estrelas parecem mais perto que as janelas~\no piso {floor} está estranhamente calado.',
        'A torre treme como se respirasse...\ndesde o piso {floor}, nota-se mais. Estranho, não é?',
      ],
      apprentice: [
        'Nem acredito que chegaste tão alto sozinha.\nPiso {floor}, isso é incrível.',
        'Não te falta o ar? Desde o piso {floor},\neu também ando mais devagar.',
        'Daqui em diante parece mesmo depender\nda tua vontade. Piso {floor}, acredita nela.',
      ],
    },
    summit: {
      archivist: [
        'Os registos do mundo sob as nuvens\nnada significam aqui. O piso {floor} pertence ao céu.',
        'Os registos da luz do topo são ténues.\nDesde o piso {floor}, verás o verdadeiro.',
        'A lista de quem chegou até aqui é curta.\nO silêncio do piso {floor} prova-o.',
      ],
      wisp: [
        'Só se ouve o vento, não é?\nNo piso {floor} não há mesmo nada. Que silêncio.',
        'Os ingredientes parecem ter asas!\nSerá a magia do piso {floor}, hehe.',
        'As estrelas estão mais perto que a janela...\no piso {floor} é calmo demais.',
      ],
      gatekeeper: [
        'Quem resistiu até ao piso {floor}\nnão é uma aprendiz vulgar.',
        'A torre treme levemente. Desde o piso {floor},\nsobe de respiração suspensa.',
        'Daqui em diante, a determinação vem\nantes das regras. Lembra-te do piso {floor}.',
      ],
      sprite: [
        'As nuvens estão debaixo dos pés! O piso {floor}\né mesmo acima do céu, que emoção.',
        'A torre oscila como se respirasse...\no piso {floor} é diferente, bate-me o coração.',
        'Quase ninguém chegou tão longe!\nPiso {floor}, pareces mesmo especial.',
      ],
      apprentice: [
        'Acho que vejo a luz do topo...\ndesde o piso {floor}, parece real.',
        'Depois de chegares até aqui, não és comum.\nPiso {floor}, eu também vou acreditar.',
        'Só se ouve a respiração...\npiso {floor}, vamos em silêncio juntas.',
      ],
    },
    peak: {
      archivist: [
        'O cume está mesmo ali. O registo\ndo piso {floor} terei de o escrever eu.',
        'O registo do último selo ficará completo\nquando passares o piso {floor}.',
        'Piso {floor}... nem eu pensei\nque chegarias aqui. Já se vê o fim.',
      ],
      wisp: [
        'Parece que a torre inteira te observa!\nDesde o piso {floor}, sobretudo, hehe.',
        'A gravidade desta altura não é capricho:\nmove-se como se tivesse vontade. Cuidado.',
        'Piso {floor}, já sentes o ar\ndiferente? Está quase.',
      ],
      gatekeeper: [
        'Depois do piso {floor}, falta pouco.\nMantém a concentração até ao fim.',
        'A derradeira prova da torre aproxima-se.\nSente o ar do piso {floor}.',
        'Se chegaste até aqui, não há retorno.\nPiso {floor}, vai até ao fim.',
      ],
      sprite: [
        'Estamos quase! O ar do piso {floor}\né completamente diferente, que emoção.',
        'A torre parece estar a olhar para ti...\ndesde o piso {floor}, também eu tremo.',
        'Piso {floor}, acho que já vejo\no fim! Vamos juntas!',
      ],
      apprentice: [
        'Ainda nem acredito que chegaste ao piso {floor}.\nEstamos quase.',
        'O último selo está perto...\npiso {floor}, também tremo, mas acredito.',
        'Piso {floor}... nunca pensei que chegaríamos.\nVamos ver o fim juntas.',
      ],
    },
  },
  pinnedLines: {
    30: 'Daqui em diante, os feitiços começam a falhar.\nA gravidade do piso {floor} é caprichosa; cuidado.',
    60: 'Sobe com prudência. Desde o piso {floor},\na torre parece pensar por si mesma.',
    80: 'Daqui em diante, até o desenho da torre muda.\nDizem que o piso {floor} nem fazia parte dela.',
    95: 'Está quase. Para lá do piso {floor},\nsentirás diretamente a magia selada.',
  },
  eventLines: [
    { speaker: 'sprite', text: 'Encontrei uma coisa brilhante! É para ti, toma!' },
    { speaker: 'wisp', text: 'Hehe, é um presente. Não é de graça... mas hoje deixo passar.' },
    { speaker: 'archivist', text: 'Um objeto caiu entre as estantes. Há de ser-te útil.' },
    { speaker: 'gatekeeper', text: 'A torre reconheceu que és digna da prova. Aceita isto.' },
    { speaker: 'apprentice', text: 'Eu tinha mais um... fica com ele. Boa sorte!' },
  ],
  itemLabels: {
    bonusMove: 'Reforço +3 movimentos',
    lineRow: 'Ingrediente limpa linha',
    lineCol: 'Ingrediente limpa coluna',
    crossBomb: 'Ingrediente bomba em cruz',
    colorBomb: 'Ingrediente bomba de cor',
  },
  stage1: 'Temos de recuperar a magia selada\nno topo da torre. Aprendiz, se estás pronta, comecemos.',
  stage1000: 'Finalmente chegaste ao fim da torre.\nA magia deste lugar... pertence-te por inteiro.',
};

const ptBR: LangStory = {
  speakerNames: {
    archivist: 'Velho Arquivista',
    wisp: 'Fogo-Fátuo',
    gatekeeper: 'Guardião da Torre',
    sprite: 'Duende da Poeira',
    apprentice: 'Aprendiz de Maga',
  },
  bands: {
    early: {
      archivist: [
        'O registro do andar {floor} ainda\nnão está nas minhas estantes. Você será a primeira.',
        'Quanto mais antigo o livro, mais ele começa\npor andares baixos como o {floor}.',
        'Vejo letras antigas sob a poeira.\nO andar {floor} também já foi o começo de alguém.',
      ],
      wisp: [
        'Hehe, não tem moleza só porque\né o andar {floor}. Olha onde pisa.',
        'Tem uma armadilha aqui... conto ou não?\nPor ser o andar {floor}, vou dar uma colher de chá.',
        'Achou que andar baixo seria sem graça?\nO andar {floor} até que diverte.',
      ],
      gatekeeper: [
        'Andar {floor}, superado. A regra é\nsimples: nunca baixe a guarda.',
        'A lei da torre vale igualmente\na partir do andar {floor}. Sem exceções.',
        'Muitos pararam no andar {floor}.\nEspero que você seja diferente.',
      ],
      sprite: [
        'Olha só essa poeira! No andar {floor}\nmoram muitos amigos meus.',
        'Uma rachadurinha~ até o andar {floor}\nparece esconder um segredo.',
        'Hi hi, a escada do andar {floor}\nfaz um som diferente a cada passo!',
      ],
      apprentice: [
        'Minhas mãos também tremiam quando subi\nao andar {floor}. Com você também?',
        'Do andar {floor} eu ainda lembro.\nNão fica nervosa, vai com calma.',
        'Parece que estamos subindo juntas. Andar {floor},\nainda somos iniciantes.',
      ],
    },
    rising: {
      archivist: [
        'A partir do andar {floor}, as letras ficam\nestranhas: avisos numa língua antiga.',
        'Ouvi dizer que registros de feitiços falhos\nficaram em algum canto do andar {floor}.',
        'Os registros desta altura estão danificados.\nA verdade do andar {floor} ainda está incompleta.',
      ],
      wisp: [
        'A gravidade vai virar de novo,\ntoma muito cuidado no andar {floor}!',
        'Vê os ingredientes brilhando?\nDesde o andar {floor}, a magia ficou mais densa.',
        'Nhéc, nhéc... está ouvindo a escada\ngemer nervosa no andar {floor}?',
      ],
      gatekeeper: [
        'Desde o andar {floor}, dobre a vigilância.\nA torre fica caprichosa neste trecho.',
        'As marcas de quem parou aqui estão\nnas paredes. Lembre-se do andar {floor}.',
        'O ar do andar {floor} é diferente.\nQuem se descuida é engolido pela gravidade.',
      ],
      sprite: [
        'Uau, os desenhos nas paredes do andar {floor}\nparecem estar se mexendo!',
        'A vela treme sem vento...\ntem alguma coisa no andar {floor}, que nervoso.',
        'Desde o andar {floor}, a escrita fica esquisita.\nNem eu consigo ler, hi hi.',
      ],
      apprentice: [
        'Você já chegou ao andar {floor}... é\nmais rápida que eu, confesso que dá inveja.',
        'Daqui para frente dá medo de verdade.\nAndar {floor}, vamos com cuidado juntas.',
        'Minha mestra disse para ter cuidado especial\na partir do andar {floor}. Lembra disso.',
      ],
    },
    deep: {
      archivist: [
        'Nos registros do ar do andar {floor},\nsó se repete a palavra "pesado".',
        'A história de uma maga perdida ficou\nnas estantes do andar {floor}. Tome cuidado.',
        'Os registros de que a torre se inclina\ncomeçam a aparecer de fato no andar {floor}.',
      ],
      wisp: [
        'Sente o chão tremendo? O andar {floor}\nainda está com a gravidade fora do eixo.',
        'Olha como os ingredientes se atraem;\nno andar {floor} isso fica pior, hehe.',
        'Viu este cajado velho? É do andar {floor};\nonde será que foi parar a dona?',
      ],
      gatekeeper: [
        'Desde o andar {floor}, a pressão\né outra. Firme-se bem.',
        'Poucos chegaram a esta altura.\nSinta o peso do andar {floor}.',
        'A torre se inclina pouco a pouco.\nDesde o andar {floor}, principalmente. Fique alerta.',
      ],
      sprite: [
        'Os ingredientes ficaram duríssimos!\nDeve ser a pressão do andar {floor}.',
        'Até eu sinto o ar do andar {floor}\nmais pesado... fica difícil respirar.',
        'Estou sentindo cheiro de maga perdida por aí...\nandar {floor}, é sério!',
      ],
      apprentice: [
        'Desde o andar {floor}, até eu\nfico sem fôlego. Vamos devagar.',
        'Ver os ingredientes resistirem até aqui\nme dá força... andar {floor}, a gente consegue.',
        'Nem minha mestra falou do andar {floor}.\nTalvez a gente seja a primeira.',
      ],
    },
    high: {
      archivist: [
        'Ninguém conseguiu ler os livros daqui de cima.\nO saber do andar {floor} não tem dono.',
        'Nos registros do andar {floor}, só\nse repete uma palavra: "solidão".',
        'Há registros de círculos mágicos que se redesenham.\nO andar {floor} parece se lembrar de algo.',
      ],
      wisp: [
        'A luz das estrelas entra pela janela!\nO andar {floor} já está acima das nuvens.',
        'Sente o ar rarefeito? Desde o andar {floor},\naté eu tomo cuidado ao respirar, hehe.',
        'Nem o guardião costuma vir aqui.\nDesde o andar {floor}, pode contar só comigo.',
      ],
      gatekeeper: [
        'Desde o andar {floor}, minhas rondas\nsão raras. Considere-se sozinha.',
        'Os passos ecoam alto demais.\nO andar {floor} está vazio há muito tempo.',
        'Daqui em diante, sua vontade importa mais\nque a gravidade: é a prova do andar {floor}.',
      ],
      sprite: [
        'Até a poeira das estantes é especial!\nA poeira do andar {floor} brilha.',
        'As estrelas parecem mais perto que as janelas~\no andar {floor} está estranhamente quieto.',
        'A torre treme como se respirasse...\ndesde o andar {floor}, dá para sentir. Estranho, né?',
      ],
      apprentice: [
        'Nem acredito que você chegou tão alto sozinha.\nAndar {floor}, isso é incrível.',
        'Não está ficando sem ar? Desde o andar {floor},\neu também ando mais devagar.',
        'Daqui em diante parece depender mesmo\nda sua vontade. Andar {floor}, acredita nela.',
      ],
    },
    summit: {
      archivist: [
        'Os registros do mundo sob as nuvens\nnão significam nada aqui. O andar {floor} pertence ao céu.',
        'Os registros da luz do topo são tênues.\nDesde o andar {floor}, você verá o verdadeiro.',
        'A lista de quem chegou até aqui é curta.\nO silêncio do andar {floor} prova isso.',
      ],
      wisp: [
        'Só dá para ouvir o vento, né?\nNo andar {floor} não tem nada mesmo. Que silêncio.',
        'Os ingredientes parecem ter asas!\nDeve ser a magia do andar {floor}, hehe.',
        'As estrelas estão mais perto que a janela...\no andar {floor} é calmo até demais.',
      ],
      gatekeeper: [
        'Quem resistiu até o andar {floor}\nnão é uma aprendiz comum.',
        'A torre treme de leve. Desde o andar {floor},\nsuba prendendo a respiração.',
        'Daqui em diante, a determinação vem\nantes das regras. Lembre-se do andar {floor}.',
      ],
      sprite: [
        'As nuvens estão debaixo dos pés! O andar {floor}\né mesmo acima do céu, que emoção.',
        'A torre balança como se respirasse...\no andar {floor} é diferente, meu coração dispara.',
        'Quase ninguém chegou tão longe!\nAndar {floor}, você parece especial.',
      ],
      apprentice: [
        'Acho que estou vendo a luz do topo...\ndesde o andar {floor}, parece real.',
        'Depois de chegar até aqui, você não é comum.\nAndar {floor}, eu também vou acreditar.',
        'Só dá para ouvir a respiração...\nandar {floor}, vamos juntas em silêncio.',
      ],
    },
    peak: {
      archivist: [
        'O cume está logo ali. O registro\ndo andar {floor} terei de escrever eu.',
        'O registro do último selo ficará completo\nquando você passar pelo andar {floor}.',
        'Andar {floor}... nem eu pensei\nque você chegaria aqui. Já dá para ver o fim.',
      ],
      wisp: [
        'Parece que a torre inteira está te observando!\nDesde o andar {floor}, principalmente, hehe.',
        'A gravidade desta altura não é capricho:\nmove-se como se tivesse vontade. Cuidado.',
        'Andar {floor}, já sente o ar\ndiferente? Está quase.',
      ],
      gatekeeper: [
        'Depois do andar {floor}, falta pouco.\nMantenha a concentração até o fim.',
        'A última prova da torre se aproxima.\nSinta o ar do andar {floor}.',
        'Se chegou até aqui, não há retorno.\nAndar {floor}, vá até o fim.',
      ],
      sprite: [
        'Estamos quase! O ar do andar {floor}\né completamente diferente, que emoção.',
        'A torre parece estar olhando para você...\ndesde o andar {floor}, eu também tremo.',
        'Andar {floor}, acho que já vejo\no fim! Vamos juntas!',
      ],
      apprentice: [
        'Ainda nem acredito que você chegou ao andar {floor}.\nEstamos quase.',
        'O último selo está perto...\nandar {floor}, também tremo, mas acredito.',
        'Andar {floor}... nunca pensei que chegaríamos.\nVamos ver o fim juntas.',
      ],
    },
  },
  pinnedLines: {
    30: 'Daqui em diante, os feitiços começam a falhar.\nA gravidade do andar {floor} é caprichosa; cuidado.',
    60: 'Suba com prudência. Desde o andar {floor},\na torre parece pensar por si mesma.',
    80: 'Daqui em diante, até o projeto da torre muda.\nDizem que o andar {floor} nem fazia parte dela.',
    95: 'Está quase. Depois do andar {floor},\nvocê sentirá diretamente a magia selada.',
  },
  eventLines: [
    { speaker: 'sprite', text: 'Achei uma coisa brilhante! É para você, pega!' },
    { speaker: 'wisp', text: 'Hehe, é um presente. Não é de graça... mas hoje passa.' },
    { speaker: 'archivist', text: 'Um objeto caiu entre as estantes. Deve ser útil para você.' },
    { speaker: 'gatekeeper', text: 'A torre reconheceu que você é digna da prova. Aceite isto.' },
    { speaker: 'apprentice', text: 'Eu tinha mais um... fica com ele. Boa sorte!' },
  ],
  itemLabels: {
    bonusMove: 'Reforço +3 movimentos',
    lineRow: 'Ingrediente limpa linha',
    lineCol: 'Ingrediente limpa coluna',
    crossBomb: 'Ingrediente bomba em cruz',
    colorBomb: 'Ingrediente bomba de cor',
  },
  stage1: 'Precisamos recuperar a magia selada\nno topo da torre. Aprendiz, se estiver pronta, vamos começar.',
  stage1000: 'Finalmente você chegou ao fim da torre.\nA magia deste lugar... agora é toda sua.',
};

const fr: LangStory = {
  speakerNames: {
    archivist: 'Vieil Archiviste',
    wisp: 'Feu follet',
    gatekeeper: 'Gardien de la Tour',
    sprite: 'Fée de poussière',
    apprentice: 'Apprentie mage',
  },
  bands: {
    early: {
      archivist: [
        `L'étage {floor} n'est pas encore dans mes rayons.\nTu seras la première à en laisser l'histoire.`,
        `Les plus vieux livres commencent par les bas étages,\ncomme le {floor}. Toute histoire a un seuil.`,
        `Sous la poussière, je vois une encre fanée.\nL'étage {floor} fut jadis le début de quelqu'un.`,
      ],
      wisp: [
        `Héhé, pas de faveur sous prétexte\nque c'est l'étage {floor}. Regarde où tu mets les pieds.`,
        `Il y a un piège ici... je te le dis ou pas ?\nBon, étage {floor}, je te laisse filer.`,
        `Tu croyais qu'un étage bas serait ennuyeux ?\nL'étage {floor} a déjà du mordant.`,
      ],
      gatekeeper: [
        `Étage {floor} franchi. La règle est\nsimple : ne jamais baisser la garde.`,
        `La loi de la tour s'applique dès\nl'étage {floor}. Aucune exception.`,
        `Beaucoup se sont arrêtés à l'étage {floor}.\nJ'espère que tu seras différente.`,
      ],
      sprite: [
        `Regarde toute cette poussière ! À l'étage {floor},\nplein de mes amis habitent ici.`,
        `Une petite fissure, tiens~ même l'étage {floor}\nsemble cacher un secret.`,
        `Hihi, les marches de l'étage {floor}\nchantent autrement à chaque pas !`,
      ],
      apprentice: [
        `Moi aussi, j'avais les mains qui tremblaient\nen montant à l'étage {floor}. Toi aussi ?`,
        `Je me souviens encore de l'étage {floor}.\nNe te crispe pas, vas-y doucement.`,
        `J'ai l'impression qu'on grimpe ensemble.\nÉtage {floor}, on débute encore toutes les deux.`,
      ],
    },
    rising: {
      archivist: [
        `À partir de l'étage {floor}, les lettres\nse font étrangères. Des avertissements anciens.`,
        `On dit que des sorts ratés ont laissé\ndes archives quelque part à l'étage {floor}.`,
        `Les registres de cette hauteur sont abîmés.\nLa vérité de l'étage {floor} reste incomplète.`,
      ],
      wisp: [
        `La gravité va encore se retourner,\nsois prudente à l'étage {floor} !`,
        `Tu vois les ingrédients luire ?\nDepuis l'étage {floor}, la magie s'épaissit.`,
        `Crac, crac... tu entends l'escalier\ngémir à l'étage {floor} ?`,
      ],
      gatekeeper: [
        `À partir de l'étage {floor}, double ta vigilance.\nLa tour devient capricieuse ici.`,
        `Les traces de ceux qui ont renoncé ici\nsont gravées au mur. Souviens-toi du {floor}.`,
        `L'air de l'étage {floor} est différent.\nL'imprudente sera avalée par la gravité.`,
      ],
      sprite: [
        `Ouah, les dessins des murs de l'étage {floor}\nont l'air de bouger !`,
        `La bougie tremble sans vent...\nil y a quelque chose à l'étage {floor}, ça palpite.`,
        `Depuis l'étage {floor}, l'écriture devient bizarre.\nMême moi je ne sais pas la lire, hihi.`,
      ],
      apprentice: [
        `Déjà arrivée à l'étage {floor}... tu es\nplus rapide que moi, j'avoue que je t'envie.`,
        `À partir d'ici, ça devient vraiment tendu.\nÉtage {floor}, faisons attention ensemble.`,
        `Ma maîtresse disait qu'à l'étage {floor},\nil faut être très prudente. Souviens-t'en.`,
      ],
    },
    deep: {
      archivist: [
        `Dans les relevés d'air de l'étage {floor},\nun seul mot revient : "lourd".`,
        `L'histoire d'une mage égarée demeure\nsur les rayons de l'étage {floor}. Prudence.`,
        `Les notes sur l'inclinaison de la tour\napparaissent vraiment dès l'étage {floor}.`,
      ],
      wisp: [
        `Tu sens le sol remuer ? À l'étage {floor},\nla gravité n'a pas encore toute sa tête.`,
        `Regarde les ingrédients s'attirer entre eux,\nc'est l'étage {floor} qui fait ça, héhé.`,
        `Tu as vu ce vieux bâton ? Une trace\nde l'étage {floor}. Où est passée sa maîtresse ?`,
      ],
      gatekeeper: [
        `À partir de l'étage {floor}, la pression\nchange. Tiens bon.`,
        `Peu sont montés jusqu'à cette hauteur.\nSens le poids de l'étage {floor}.`,
        `La tour penche peu à peu. Dès l'étage {floor},\nc'est plus marqué. Reste en alerte.`,
      ],
      sprite: [
        `Les ingrédients sont devenus tout durs !\nC'est sûrement la pression de l'étage {floor}.`,
        `Même moi, je sens l'air de l'étage {floor}\ndevenir lourd... j'ai du mal à respirer.`,
        `Je sens une odeur de mage perdue quelque part...\nÉtage {floor}, je te jure que c'est vrai !`,
      ],
      apprentice: [
        `Depuis l'étage {floor}, même moi\nje manque de souffle. Allons lentement.`,
        `Voir les ingrédients tenir jusque-là\nme donne du courage... étage {floor}, on peut y arriver.`,
        `Ma maîtresse ne m'a jamais parlé de l'étage {floor}.\nPeut-être qu'on est les premières.`,
      ],
    },
    high: {
      archivist: [
        `Personne n'a lu les livres de ces rayons.\nLe savoir de l'étage {floor} n'a pas de maître.`,
        `Dans les registres de l'étage {floor},\nun seul mot revient : "solitude".`,
        `Un registre dit que les cercles se redessinent.\nL'étage {floor} semble se souvenir de quelque chose.`,
      ],
      wisp: [
        `La lumière des étoiles entre par la fenêtre !\nL'étage {floor} est déjà au-dessus des nuages.`,
        `Tu sens l'air si mince ? Dès l'étage {floor},\nmême moi je fais attention à respirer, héhé.`,
        `Même le gardien vient rarement ici.\nDepuis l'étage {floor}, tu n'as plus que moi.`,
      ],
      gatekeeper: [
        `À partir de l'étage {floor}, mes rondes\nse font rares. Considère-toi seule.`,
        `Les pas résonnent étrangement fort.\nL'étage {floor} est vide depuis longtemps.`,
        `D'ici, ta volonté comptera plus\nque la gravité. Voilà l'épreuve du {floor}.`,
      ],
      sprite: [
        `Même la poussière des étagères est spéciale !\nCelle de l'étage {floor} scintille.`,
        `Les étoiles semblent plus proches que les fenêtres~\nl'étage {floor} est bizarrement silencieux.`,
        `La tour tremble comme si elle respirait...\nsurtout depuis l'étage {floor}. Curieux, non ?`,
      ],
      apprentice: [
        `Je n'arrive pas à croire que tu sois montée seule\njusqu'à l'étage {floor}. Tu es incroyable.`,
        `Tu ne manques pas d'air ? Depuis l'étage {floor},\nmoi aussi je marche plus lentement.`,
        `D'ici, on dirait vraiment que tout dépend\nde ta volonté. Étage {floor}, crois-y.`,
      ],
    },
    summit: {
      archivist: [
        `Les archives du monde sous les nuages\nne valent plus ici. L'étage {floor} appartient au ciel.`,
        `Les notes sur la lumière du sommet sont pâles.\nDès l'étage {floor}, le vrai se montrera.`,
        `La liste de ceux qui sont venus si haut\nest très courte. Le silence du {floor} le prouve.`,
      ],
      wisp: [
        `On n'entend que le vent, hein ? À l'étage {floor},\nil n'y a vraiment rien. Quel calme.`,
        `Les ingrédients semblent avoir des ailes !\nLa magie de l'étage {floor}, peut-être, héhé.`,
        `Les étoiles sont plus proches que la fenêtre...\nl'étage {floor} est calme à en devenir étrange.`,
      ],
      gatekeeper: [
        `Avoir tenu jusqu'à l'étage {floor},\nce n'est pas le fait d'une apprentie ordinaire.`,
        `La tour tremble faiblement. Dès l'étage {floor},\nil faut monter le souffle retenu.`,
        `D'ici, la résolution passe avant les règles.\nGarde l'étage {floor} en mémoire.`,
      ],
      sprite: [
        `Les nuages sont sous tes pieds ! L'étage {floor}\nest vraiment au-dessus du ciel, quelle joie.`,
        `La tour oscille comme si elle respirait...\nl'étage {floor} est différent, mon coeur bat fort.`,
        `Presque personne n'est monté si loin !\nÉtage {floor}, tu as vraiment l'air spéciale.`,
      ],
      apprentice: [
        `Je crois voir la lumière du sommet...\nDepuis l'étage {floor}, elle paraît réelle.`,
        `Être arrivée jusque-là, ce n'est pas ordinaire.\nÉtage {floor}, moi aussi je vais croire en toi.`,
        `On n'entend que nos souffles...\nÉtage {floor}, avançons doucement ensemble.`,
      ],
    },
    peak: {
      archivist: [
        `Le sommet est tout proche. Le registre\nde l'étage {floor}, c'est moi qui l'écrirai.`,
        `Le registre du dernier sceau sera complet\nlorsque tu auras passé l'étage {floor}.`,
        `Étage {floor}... je ne pensais pas\nque tu viendrais si loin. La fin se voit.`,
      ],
      wisp: [
        `On dirait que toute la tour te regarde !\nSurtout depuis l'étage {floor}, héhé.`,
        `À cette hauteur, la gravité n'est plus caprice.\nElle bouge comme si elle avait une volonté.`,
        `Étage {floor}, tu ne sens pas déjà\nque l'air a changé ? On y est presque.`,
      ],
      gatekeeper: [
        `Au-delà de l'étage {floor}, il reste peu.\nReste concentrée jusqu'au bout.`,
        `La dernière épreuve de la tour approche.\nSens l'air de l'étage {floor}.`,
        `Si tu es venue jusqu'ici, nul retour.\nÉtage {floor}, va jusqu'au bout.`,
      ],
      sprite: [
        `On y est presque ! L'air de l'étage {floor}\nest complètement différent, ça palpite.`,
        `La tour semble te regarder...\ndepuis l'étage {floor}, moi aussi je tremble.`,
        `Étage {floor}, je crois voir\nla fin ! Allons-y ensemble !`,
      ],
      apprentice: [
        `Je n'arrive toujours pas à croire\nque tu sois à l'étage {floor}. Presque fini.`,
        `Le dernier sceau est proche...\nÉtage {floor}, je tremble aussi, mais j'y crois.`,
        `Étage {floor}... je n'aurais jamais cru\nqu'on viendrait jusque-là. Voyons la fin ensemble.`,
      ],
    },
  },
  pinnedLines: {
    30: `D'ici, les sorts commencent à dévier.\nLa gravité de l'étage {floor} est capricieuse : prudence.`,
    60: `Monte avec prudence. Dès l'étage {floor},\nla tour semble penser par elle-même.`,
    80: `D'ici, même le plan de la tour change.\nOn dit que l'étage {floor} n'en faisait pas partie.`,
    95: `Tu y es presque. Au-delà de l'étage {floor},\ntu sentiras directement la magie scellée.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `J'ai ramassé quelque chose qui brille ! Tiens, c'est pour toi !` },
    { speaker: 'wisp', text: `Héhé, c'est un cadeau. Pas gratuit... mais aujourd'hui je te le donne.` },
    { speaker: 'archivist', text: `Un objet est tombé entre les rayons. Il te sera sûrement utile.` },
    { speaker: 'gatekeeper', text: `La tour a reconnu ton droit à l'épreuve. Accepte ceci.` },
    { speaker: 'apprentice', text: `J'en avais encore un... prends-le. Je te souhaite bonne chance !` },
  ],
  itemLabels: {
    bonusMove: 'Renfort +3 coups',
    lineRow: 'Ingrédient efface-ligne',
    lineCol: 'Ingrédient efface-colonne',
    crossBomb: 'Ingrédient bombe en croix',
    colorBomb: 'Ingrédient bombe de couleur',
  },
  stage1: `Nous devons reprendre la magie scellée\nau sommet de la tour. Apprentie, si tu es prête, commençons.`,
  stage1000: `Tu as enfin atteint la fin de la tour.\nLa magie de ce lieu... t'appartient tout entière.`,
};

const de: LangStory = {
  speakerNames: {
    archivist: 'Alter Archivar',
    wisp: 'Irrlicht',
    gatekeeper: 'Turmwächter',
    sprite: 'Staubfee',
    apprentice: 'Zauberlehrling',
  },
  bands: {
    early: {
      archivist: [
        `Ebene {floor} steht noch nicht in meinen Regalen.\nDu wirst die Erste sein, die ihre Geschichte schreibt.`,
        `Die ältesten Bücher beginnen bei niedrigen Ebenen\nwie {floor}. Jeder Anfang liegt irgendwo.`,
        `Unter dem Staub sehe ich verblasste Tinte.\nAuch Ebene {floor} war einst jemandes Anfang.`,
      ],
      wisp: [
        `Hehe, nur weil es Ebene {floor} ist,\nwird hier nichts geschenkt. Pass auf die Füße auf.`,
        `Hier ist eine Falle... soll ich es dir sagen?\nNa gut, bei Ebene {floor} drücke ich ein Auge zu.`,
        `Dachtest du, eine niedrige Ebene wäre langweilig?\nEbene {floor} hat schon ordentlich Biss.`,
      ],
      gatekeeper: [
        `Ebene {floor} passiert. Die Regel ist\neinfach: niemals unachtsam werden.`,
        `Das Gesetz des Turms gilt ab\nEbene {floor} genauso. Keine Ausnahmen.`,
        `Viele blieben auf Ebene {floor} stehen.\nIch hoffe, du bist anders.`,
      ],
      sprite: [
        `Sieh dir diesen Staub an! Auf Ebene {floor}\nwohnen ganz viele meiner Freunde.`,
        `Ein kleiner Riss, schau~ selbst Ebene {floor}\nscheint ein Geheimnis zu verstecken.`,
        `Hihi, die Stufen von Ebene {floor}\nklingen bei jedem Tritt anders!`,
      ],
      apprentice: [
        `Auch mir haben auf Ebene {floor}\ndie Hände gezittert. Dir auch?`,
        `An Ebene {floor} erinnere ich mich noch gut.\nNur nicht nervös werden, geh langsam.`,
        `Es fühlt sich an, als kletterten wir zusammen.\nEbene {floor}, wir sind beide noch Anfängerinnen.`,
      ],
    },
    rising: {
      archivist: [
        `Ab Ebene {floor} werden die Schriftzeichen\nfremd. Warnungen in einer alten Sprache.`,
        `Aufzeichnungen missglückter Zauber sollen\nirgendwo auf Ebene {floor} liegen.`,
        `Die Chroniken dieser Höhe sind beschädigt.\nDie Wahrheit von Ebene {floor} ist noch unvollständig.`,
      ],
      wisp: [
        `Die Schwerkraft kippt wohl gleich wieder,\npass auf Ebene {floor} bloß auf!`,
        `Siehst du die Zutaten leuchten?\nAb Ebene {floor} wird die Magie dichter.`,
        `Knarr, knarr... hörst du die Treppe\nauf Ebene {floor} so unruhig ächzen?`,
      ],
      gatekeeper: [
        `Ab Ebene {floor} verdopple deine Wachsamkeit.\nDer Turm wird in diesem Abschnitt launisch.`,
        `Die Spuren derer, die hier aufgaben,\nstehen an den Wänden. Merke dir Ebene {floor}.`,
        `Die Luft auf Ebene {floor} ist anders.\nUnachtsame verschlingt die Schwerkraft.`,
      ],
      sprite: [
        `Wow, die Bilder an den Wänden von Ebene {floor}\nsehen aus, als würden sie sich bewegen!`,
        `Die Kerze flackert ohne Wind...\nauf Ebene {floor} ist etwas, wie aufregend.`,
        `Ab Ebene {floor} wird die Schrift seltsam.\nNicht mal ich kann sie lesen, hihi.`,
      ],
      apprentice: [
        `Schon bis Ebene {floor} gekommen... du bist\nehrlich schneller als ich, ein bisschen neidisch bin ich.`,
        `Ab hier wird es wirklich angespannt.\nEbene {floor}, lass uns gemeinsam vorsichtig sein.`,
        `Meine Meisterin warnte, ab Ebene {floor}\nbesonders aufzupassen. Vergiss das nicht.`,
      ],
    },
    deep: {
      archivist: [
        `In den Luftaufzeichnungen von Ebene {floor}\nwiederholt sich nur ein Wort: "schwer".`,
        `Die Geschichte einer verirrten Magierin ruht\nin den Regalen von Ebene {floor}. Sei vorsichtig.`,
        `Berichte, dass der Turm sich neigt,\ntreten ab Ebene {floor} tatsächlich auf.`,
      ],
      wisp: [
        `Spürst du den Boden beben? Auf Ebene {floor}\nist die Schwerkraft noch nicht bei Sinnen.`,
        `Sieh nur, wie die Zutaten einander anziehen.\nAuf Ebene {floor} ist das besonders stark, hehe.`,
        `Hast du diesen alten Stab gesehen? Eine Spur\nvon Ebene {floor}. Wo ist seine Besitzerin hin?`,
      ],
      gatekeeper: [
        `Ab Ebene {floor} verändert sich\nder Druck. Halte stand.`,
        `Nur wenige erreichten diese Höhe.\nSpüre das Gewicht von Ebene {floor}.`,
        `Der Turm neigt sich allmählich. Ab Ebene {floor}\nganz besonders. Bleib wachsam.`,
      ],
      sprite: [
        `Die Zutaten sind richtig hart geworden!\nDas liegt bestimmt am Druck von Ebene {floor}.`,
        `Sogar ich finde die Luft auf Ebene {floor}\nziemlich schwer... Atmen fällt schwer.`,
        `Irgendwo riecht es nach verirrter Magierin...\nEbene {floor}, wirklich wahr!`,
      ],
      apprentice: [
        `Ab Ebene {floor} komme sogar ich\naußer Atem. Gehen wir langsam.`,
        `Wenn ich sehe, wie die Zutaten durchhalten,\ngibt mir das Kraft... Ebene {floor}, wir schaffen das.`,
        `Nicht einmal meine Meisterin sprach von Ebene {floor}.\nVielleicht sind wir die Ersten hier.`,
      ],
    },
    high: {
      archivist: [
        `Die Bücher hier oben hat niemand gelesen.\nDas Wissen von Ebene {floor} hat keinen Besitzer.`,
        `In den Aufzeichnungen von Ebene {floor}\nsteht immer nur ein Wort: "Einsamkeit".`,
        `Ein Bericht sagt, die Siegelkreise zeichnen sich neu.\nEbene {floor} scheint sich an etwas zu erinnern.`,
      ],
      wisp: [
        `Sternenlicht fällt durchs Fenster!\nEbene {floor} liegt schon über den Wolken.`,
        `Spürst du die dünne Luft? Ab Ebene {floor}\nachte sogar ich auf meinen Atem, hehe.`,
        `Selbst der Wächter kommt kaum hierher.\nAb Ebene {floor} hast du nur noch mich.`,
      ],
      gatekeeper: [
        `Ab Ebene {floor} werden meine Rundgänge\nselten. Betrachte dich als allein.`,
        `Schritte hallen ungewöhnlich laut.\nEbene {floor} steht seit langer Zeit leer.`,
        `Von hier an zählt dein Wille mehr\nals Schwerkraft. Das ist die Prüfung von Ebene {floor}.`,
      ],
      sprite: [
        `Sogar der Staub in den Regalen ist besonders!\nDer Staub von Ebene {floor} glitzert.`,
        `Die Sterne wirken näher als die Fenster~\nEbene {floor} ist seltsam still.`,
        `Der Turm zittert, als würde er atmen...\nab Ebene {floor} besonders. Seltsam, oder?`,
      ],
      apprentice: [
        `Ich kann kaum glauben, dass du allein\nbis Ebene {floor} kamst. Das ist großartig.`,
        `Geht dir nicht die Luft aus? Ab Ebene {floor}\ngehe auch ich langsamer.`,
        `Ab hier scheint es wirklich auf deinen Willen\nanzukommen. Ebene {floor}, vertrau darauf.`,
      ],
    },
    summit: {
      archivist: [
        `Die Chroniken der Welt unter den Wolken\nbedeuten hier nichts. Ebene {floor} gehört dem Himmel.`,
        `Die Berichte vom Licht der Turmspitze sind blass.\nAb Ebene {floor} zeigt sich das Wahre.`,
        `Die Liste derer, die so weit kamen,\nist sehr kurz. Die Stille von Ebene {floor} beweist es.`,
      ],
      wisp: [
        `Man hört nur den Wind, oder?\nAuf Ebene {floor} ist wirklich nichts. So still.`,
        `Die Zutaten sehen federleicht aus!\nBestimmt Magie von Ebene {floor}, hehe.`,
        `Die Sterne sind näher als das Fenster...\nEbene {floor} ist unheimlich ruhig.`,
      ],
      gatekeeper: [
        `Wer bis Ebene {floor} standhielt,\nist kein gewöhnlicher Lehrling.`,
        `Der Turm bebt kaum merklich. Ab Ebene {floor}\nsteigst du besser mit angehaltenem Atem.`,
        `Von hier an kommt Entschlossenheit\nvor Regeln. Merke dir Ebene {floor}.`,
      ],
      sprite: [
        `Die Wolken liegen unter deinen Füßen! Ebene {floor}\nist wirklich über dem Himmel, wie aufregend.`,
        `Der Turm schwankt, als würde er atmen...\nEbene {floor} ist anders, mein Herz klopft.`,
        `Fast niemand ist je so weit gestiegen!\nEbene {floor}, du bist wohl etwas Besonderes.`,
      ],
      apprentice: [
        `Ich glaube, ich sehe das Licht der Spitze...\nab Ebene {floor} fühlt es sich echt an.`,
        `Wer so weit gekommen ist, ist nicht gewöhnlich.\nEbene {floor}, ich glaube auch an dich.`,
        `Man hört nur noch Atemzüge...\nEbene {floor}, lass uns leise zusammen weitergehen.`,
      ],
    },
    peak: {
      archivist: [
        `Der Gipfel ist zum Greifen nah. Den Eintrag\nzu Ebene {floor} werde nun ich verfassen.`,
        `Der Bericht über das letzte Siegel wird vollendet,\nsobald du Ebene {floor} überschreitest.`,
        `Ebene {floor}... ich dachte nicht,\ndass du so weit kommst. Das Ende ist sichtbar.`,
      ],
      wisp: [
        `Es fühlt sich an, als sähe der ganze Turm dich an!\nBesonders ab Ebene {floor}, hehe.`,
        `Die Schwerkraft in dieser Höhe ist keine Laune.\nSie bewegt sich, als hätte sie einen Willen.`,
        `Ebene {floor}, merkst du nicht schon,\ndass die Luft anders ist? Fast geschafft.`,
      ],
      gatekeeper: [
        `Nach Ebene {floor} bleibt nicht mehr viel.\nBleib bis zuletzt konzentriert.`,
        `Die letzte Prüfung des Turms rückt näher.\nSpüre die Luft von Ebene {floor}.`,
        `Wer bis hierher kam, kann nicht zurück.\nEbene {floor}, geh bis zum Ende.`,
      ],
      sprite: [
        `Fast da! Die Luft auf Ebene {floor}\nist völlig anders, mein Herz hüpft.`,
        `Der Turm scheint dich anzusehen...\nab Ebene {floor} zittere ich auch.`,
        `Ebene {floor}, ich glaube, ich sehe\ndas Ende! Lass uns zusammen gehen!`,
      ],
      apprentice: [
        `Ich kann noch immer nicht glauben,\ndass du Ebene {floor} erreicht hast. Fast da.`,
        `Das letzte Siegel ist nah...\nEbene {floor}, ich zittere auch, aber ich glaube daran.`,
        `Ebene {floor}... nie dachte ich,\ndass wir so weit kommen. Sehen wir das Ende zusammen.`,
      ],
    },
  },
  pinnedLines: {
    30: `Ab hier geraten Zauber immer wieder aus der Bahn.\nDie Schwerkraft von Ebene {floor} ist launisch. Vorsicht.`,
    60: `Steig vorsichtig weiter. Ab Ebene {floor}\nscheint der Turm selbst zu denken.`,
    80: `Ab hier verändert sich sogar der Bauplan des Turms.\nMan sagt, Ebene {floor} gehörte ursprünglich nicht dazu.`,
    95: `Fast geschafft. Jenseits von Ebene {floor}\nwirst du die versiegelte Magie unmittelbar spüren.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Ich habe etwas Glänzendes gefunden! Für dich, nimm es!` },
    { speaker: 'wisp', text: `Hehe, ein Geschenk. Nicht umsonst... aber heute gebe ich es dir so.` },
    { speaker: 'archivist', text: `Ein Gegenstand ist zwischen die Regale gefallen. Er dürfte dir nützen.` },
    { speaker: 'gatekeeper', text: `Der Turm hat dich als würdig für die Prüfung anerkannt. Nimm dies.` },
    { speaker: 'apprentice', text: `Ich hatte noch eins übrig... nimm du es. Viel Glück!` },
  ],
  itemLabels: {
    bonusMove: 'Verstärker +3 Züge',
    lineRow: 'Zutat für Reihenlöschung',
    lineCol: 'Zutat für Spaltenlöschung',
    crossBomb: 'Zutat für Kreuzbombe',
    colorBomb: 'Zutat für Farbbombe',
  },
  stage1: `Wir müssen die Magie zurückholen,\ndie auf der Turmspitze versiegelt ist. Lehrling, wenn du bereit bist, beginnen wir.`,
  stage1000: `Endlich hast du das Ende des Turms erreicht.\nDie Magie dieses Ortes... gehört nun ganz dir.`,
};

const it: LangStory = {
  speakerNames: {
    archivist: 'Vecchio Archivista',
    wisp: 'Fuoco fatuo',
    gatekeeper: 'Guardiano della Torre',
    sprite: 'Fata della polvere',
    apprentice: 'Apprendista maga',
  },
  bands: {
    early: {
      archivist: [
        `Il piano {floor} non è ancora nei miei scaffali.\nSarai tu la prima a lasciarne la storia.`,
        `I libri più antichi iniziano dai piani bassi,\ncome il {floor}. Ogni racconto ha un principio.`,
        `Sotto la polvere vedo inchiostro sbiadito.\nAnche il piano {floor} fu l'inizio di qualcuno.`,
      ],
      wisp: [
        `Eheh, niente sconti solo perché\nè il piano {floor}. Guarda dove metti i piedi.`,
        `Qui c'è una trappola... te lo dico o no?\nVa bene, è il piano {floor}, chiuderò un occhio.`,
        `Pensavi che un piano basso fosse noioso?\nIl piano {floor} sa già mordere.`,
      ],
      gatekeeper: [
        `Piano {floor} superato. La regola è\nsemplice: mai abbassare la guardia.`,
        `La legge della torre vale uguale\ndal piano {floor}. Nessuna eccezione.`,
        `Molti si sono fermati al piano {floor}.\nSpero che tu sia diversa.`,
      ],
      sprite: [
        `Guarda quanta polvere! Al piano {floor}\nvivono tantissimi miei amici.`,
        `Una piccola crepa, guarda~ anche il piano {floor}\nsembra nascondere un segreto.`,
        `Ih ih, le scale del piano {floor}\nfanno un suono diverso a ogni passo!`,
      ],
      apprentice: [
        `Anche a me tremavano le mani\nsalendo al piano {floor}. Anche a te?`,
        `Il piano {floor} me lo ricordo ancora.\nNon agitarti, vai piano.`,
        `Sembra di salire insieme.\nPiano {floor}, siamo ancora principianti entrambe.`,
      ],
    },
    rising: {
      archivist: [
        `Dal piano {floor}, le lettere diventano\nestranee. Avvertimenti in una lingua antica.`,
        `Dicono che i registri degli incantesimi falliti\nsiano rimasti da qualche parte al piano {floor}.`,
        `I registri di questa altezza sono danneggiati.\nLa verità del piano {floor} è ancora incompleta.`,
      ],
      wisp: [
        `La gravità sta per capovolgersi di nuovo,\nfai molta attenzione al piano {floor}!`,
        `Vedi gli ingredienti che brillano?\nDal piano {floor}, la magia si è fatta più densa.`,
        `Scric, scric... senti le scale\ngemere inquiete al piano {floor}?`,
      ],
      gatekeeper: [
        `Dal piano {floor}, raddoppia la guardia.\nLa torre diventa capricciosa in questo tratto.`,
        `Le tracce di chi si fermò qui sono\nincise sui muri. Ricorda il piano {floor}.`,
        `L'aria del piano {floor} è diversa.\nChi si distrae viene inghiottita dalla gravità.`,
      ],
      sprite: [
        `Uau, i disegni sui muri del piano {floor}\nsembrano muoversi!`,
        `La candela trema senza vento...\nc'è qualcosa al piano {floor}, che batticuore.`,
        `Dal piano {floor}, la scrittura diventa strana.\nNemmeno io riesco a leggerla, ih ih.`,
      ],
      apprentice: [
        `Sei già arrivata al piano {floor}... sei\npiù veloce di me, lo ammetto, ti invidio un po'.`,
        `Da qui in poi la tensione sale davvero.\nPiano {floor}, stiamo attente insieme.`,
        `La maestra disse di fare molta attenzione\nsoprattutto dal piano {floor}. Ricordatelo.`,
      ],
    },
    deep: {
      archivist: [
        `Nei registri dell'aria del piano {floor},\nsi ripete solo una parola: "pesante".`,
        `La storia di una maga smarrita resta\nsugli scaffali del piano {floor}. Prudenza.`,
        `I resoconti della torre che si inclina\ncompaiono davvero dal piano {floor}.`,
      ],
      wisp: [
        `Senti il pavimento sobbalzare? Al piano {floor},\nla gravità non è ancora in sé.`,
        `Guarda gli ingredienti attirarsi fra loro,\nal piano {floor} succede più che altrove, eheh.`,
        `Hai visto questo vecchio bastone? È una traccia\ndel piano {floor}. Dov'è finita la proprietaria?`,
      ],
      gatekeeper: [
        `Dal piano {floor}, la pressione\ncambia. Reggi saldamente.`,
        `Pochi sono arrivati a questa altezza.\nSenti il peso del piano {floor}.`,
        `La torre si inclina poco a poco. Dal piano {floor}\nancora di più. Resta all'erta.`,
      ],
      sprite: [
        `Gli ingredienti sono diventati durissimi!\nSarà la pressione del piano {floor}.`,
        `Perfino io sento l'aria del piano {floor}\nfarsi pesante... respiro a fatica.`,
        `Da qualche parte sento odore di maga perduta...\nPiano {floor}, dico davvero!`,
      ],
      apprentice: [
        `Dal piano {floor}, persino io\nmi sento senza fiato. Andiamo piano.`,
        `Vedere gli ingredienti resistere fin qui\nmi dà forza... piano {floor}, ce la faremo.`,
        `Nemmeno la maestra mi parlò del piano {floor}.\nForse siamo le prime.`,
      ],
    },
    high: {
      archivist: [
        `Nessuno ha letto i libri quassù.\nIl sapere del piano {floor} non ha padrone.`,
        `Nei registri del piano {floor}, si ripete\nuna sola parola: "solitudine".`,
        `Un registro dice che i cerchi magici si ridisegnano.\nIl piano {floor} pare ricordare qualcosa.`,
      ],
      wisp: [
        `La luce delle stelle entra dalla finestra!\nIl piano {floor} è già sopra le nuvole.`,
        `Senti l'aria sottile? Dal piano {floor},\nperfino io sto attenta a respirare, eheh.`,
        `Nemmeno il guardiano viene spesso qui.\nDal piano {floor}, puoi contare solo su di me.`,
      ],
      gatekeeper: [
        `Dal piano {floor}, le mie ronde\nsi fanno rare. Considerati sola.`,
        `I passi risuonano insolitamente forti.\nIl piano {floor} è vuoto da molto tempo.`,
        `Da qui, la tua volontà conterà più\ndella gravità. Questa è la prova del piano {floor}.`,
      ],
      sprite: [
        `Perfino la polvere sugli scaffali è speciale!\nLa polvere del piano {floor} scintilla.`,
        `Le stelle sembrano più vicine delle finestre~\nil piano {floor} è stranamente silenzioso.`,
        `La torre trema come se respirasse...\nsoprattutto dal piano {floor}. Non è curioso?`,
      ],
      apprentice: [
        `Non riesco a credere che tu sia arrivata sola\nfino al piano {floor}. Sei incredibile.`,
        `Non ti manca il fiato? Dal piano {floor},\nanch'io cammino più lentamente.`,
        `Da qui sembra davvero dipendere\ndalla tua volontà. Piano {floor}, credici.`,
      ],
    },
    summit: {
      archivist: [
        `I registri del mondo sotto le nuvole\nqui non valgono nulla. Il piano {floor} appartiene al cielo.`,
        `I resoconti della luce in cima sono deboli.\nDal piano {floor}, vedrai ciò che è vero.`,
        `L'elenco di chi è arrivato fin qui è brevissimo.\nIl silenzio del piano {floor} lo dimostra.`,
      ],
      wisp: [
        `Si sente solo il vento, vero?\nAl piano {floor} non c'è proprio nulla. Che quiete.`,
        `Gli ingredienti sembrano avere le ali!\nSarà la magia del piano {floor}, eheh.`,
        `Le stelle sono più vicine della finestra...\nil piano {floor} è quieto in modo strano.`,
      ],
      gatekeeper: [
        `Chi ha resistito fino al piano {floor}\nnon è un'apprendista qualunque.`,
        `La torre vibra appena. Dal piano {floor},\nbisogna salire trattenendo il respiro.`,
        `Da qui, la risolutezza viene prima delle regole.\nRicorda il piano {floor}.`,
      ],
      sprite: [
        `Le nuvole sono sotto i tuoi piedi! Il piano {floor}\nè davvero sopra il cielo, che emozione.`,
        `La torre ondeggia come se respirasse...\nil piano {floor} è diverso, mi batte il cuore.`,
        `Quasi nessuno è salito così in alto!\nPiano {floor}, sembri proprio speciale.`,
      ],
      apprentice: [
        `Mi sembra di vedere la luce della cima...\ndal piano {floor}, pare reale.`,
        `Essere arrivata fin qui significa che non sei comune.\nPiano {floor}, anch'io crederò in te.`,
        `Si sente solo il respiro...\nPiano {floor}, andiamo avanti in silenzio insieme.`,
      ],
    },
    peak: {
      archivist: [
        `La vetta è a un passo. Il registro\ndel piano {floor} dovrò scriverlo io.`,
        `Il registro dell'ultimo sigillo sarà completo\nquando supererai il piano {floor}.`,
        `Piano {floor}... non pensavo\nche saresti arrivata fin qui. La fine si vede.`,
      ],
      wisp: [
        `Sembra che tutta la torre ti stia osservando!\nSoprattutto dal piano {floor}, eheh.`,
        `La gravità a questa altezza non è capriccio.\nSi muove come se avesse volontà.`,
        `Piano {floor}, non senti già\nche l'aria è diversa? Ci siamo quasi.`,
      ],
      gatekeeper: [
        `Oltre il piano {floor}, resta poco.\nMantieni la concentrazione fino alla fine.`,
        `L'ultima prova della torre si avvicina.\nSenti l'aria del piano {floor}.`,
        `Se sei arrivata fin qui, non c'è ritorno.\nPiano {floor}, vai fino in fondo.`,
      ],
      sprite: [
        `Ci siamo quasi! L'aria del piano {floor}\nè completamente diversa, che batticuore.`,
        `La torre sembra guardarti...\ndal piano {floor}, tremo anch'io.`,
        `Piano {floor}, credo di vedere\nla fine! Andiamo insieme!`,
      ],
      apprentice: [
        `Ancora non credo che tu sia arrivata\nal piano {floor}. Ci siamo quasi.`,
        `L'ultimo sigillo è vicino...\npiano {floor}, tremo anch'io, ma ci credo.`,
        `Piano {floor}... non pensavo saremmo arrivate\nfin qui. Vediamo la fine insieme.`,
      ],
    },
  },
  pinnedLines: {
    30: `Da qui in poi, gli incantesimi deviano spesso.\nLa gravità del piano {floor} è capricciosa: prudenza.`,
    60: `Sali con cautela. Dal piano {floor},\nla torre sembra pensare da sola.`,
    80: `Da qui cambia perfino il progetto della torre.\nDicono che il piano {floor} non ne facesse parte.`,
    95: `Ci sei quasi. Oltre il piano {floor},\nsentirai direttamente la magia sigillata.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Ho raccolto una cosa scintillante! È per te, prendila!` },
    { speaker: 'wisp', text: `Eheh, è un regalo. Non proprio gratis... ma oggi te lo lascio.` },
    { speaker: 'archivist', text: `Un oggetto è caduto fra gli scaffali. Ti sarà certamente utile.` },
    { speaker: 'gatekeeper', text: `La torre ha riconosciuto il tuo diritto alla prova. Accetta questo.` },
    { speaker: 'apprentice', text: `Ne avevo ancora uno... prendilo tu. Ti auguro fortuna!` },
  ],
  itemLabels: {
    bonusMove: 'Potenziamento +3 mosse',
    lineRow: 'Ingrediente cancella riga',
    lineCol: 'Ingrediente cancella colonna',
    crossBomb: 'Ingrediente bomba a croce',
    colorBomb: 'Ingrediente bomba colore',
  },
  stage1: `Dobbiamo recuperare la magia sigillata\nin cima alla torre. Apprendista, se sei pronta, cominciamo.`,
  stage1000: `Finalmente hai raggiunto la fine della torre.\nLa magia di questo luogo... ora è tutta tua.`,
};

const ru: LangStory = {
  speakerNames: {
    archivist: 'Старый Архивариус',
    wisp: 'Блуждающий огонек',
    gatekeeper: 'Страж Башни',
    sprite: 'Пыльная фея',
    apprentice: 'Ученица мага',
  },
  bands: {
    early: {
      archivist: [
        `Этажа {floor} еще нет на моих полках.\nТы первой впишешь его историю.`,
        `Древнейшие книги начинаются с нижних этажей,\nвроде {floor}. У каждого пути есть начало.`,
        `Под пылью проступают выцветшие чернила...\nэтаж {floor} тоже когда-то был чьим-то началом.`,
      ],
      wisp: [
        `Хе-хе, поблажек не будет только потому,\nчто это этаж {floor}. Смотри под ноги.`,
        `Здесь ловушка... предупредить тебя?\nЛадно, этаж {floor}, на этот раз промолчу.`,
        `Думала, низкий этаж будет скучным?\nУ этажа {floor} тоже есть зубки.`,
      ],
      gatekeeper: [
        `Этаж {floor} пройден. Правило\nпростое: никогда не теряй бдительности.`,
        `Закон башни одинаково действует\nс этажа {floor}. Исключений нет.`,
        `Многие остановились на этаже {floor}.\nНадеюсь, ты окажешься иной.`,
      ],
      sprite: [
        `Посмотри, сколько пыли! На этаже {floor}\nживет столько моих друзей.`,
        `Вот маленькая трещинка~ даже этаж {floor}\nсловно прячет секрет.`,
        `Хи-хи, ступени этажа {floor}\nзвучат по-разному с каждым шагом!`,
      ],
      apprentice: [
        `У меня тоже дрожали руки,\nкогда я лезла на этаж {floor}. У тебя тоже?`,
        `Этаж {floor} я еще хорошо помню.\nНе нервничай, идем не спеша.`,
        `Будто мы поднимаемся вместе.\nЭтаж {floor}, мы обе еще новички.`,
      ],
    },
    rising: {
      archivist: [
        `С этажа {floor} письмена становятся чужими:\nпредостережения на древнем языке.`,
        `Говорят, записи о неудачных заклятиях\nлежат где-то на этаже {floor}.`,
        `Летописи этой высоты повреждены.\nИстина этажа {floor} все еще неполна.`,
      ],
      wisp: [
        `Гравитация вот-вот снова перевернется,\nбудь осторожна на этаже {floor}!`,
        `Видишь, как светятся ингредиенты?\nС этажа {floor} магия становится гуще.`,
        `Скрип-скрип... слышишь, как лестница\nтревожно стонет на этаже {floor}?`,
      ],
      gatekeeper: [
        `С этажа {floor} удвой осторожность.\nЗдесь башня становится своенравной.`,
        `Следы тех, кто здесь остановился,\nврезаны в стены. Запомни этаж {floor}.`,
        `Воздух на этаже {floor} иной.\nНевнимательных поглощает гравитация.`,
      ],
      sprite: [
        `Ого, рисунки на стенах этажа {floor}\nсловно шевелятся!`,
        `Свеча дрожит без ветра...\nна этаже {floor} что-то есть, мне не по себе.`,
        `С этажа {floor} письмена делаются странными.\nДаже я их не читаю, хи-хи.`,
      ],
      apprentice: [
        `Ты уже добралась до этажа {floor}...\nты быстрее меня, честно, я немного завидую.`,
        `Отсюда становится по-настоящему тревожно.\nЭтаж {floor}, будем осторожны вместе.`,
        `Наставница предупреждала: с этажа {floor}\nнужно быть особенно внимательной. Помни это.`,
      ],
    },
    deep: {
      archivist: [
        `В записях о воздухе этажа {floor}\nповторяется лишь слово «тяжелый».`,
        `Сказание о потерянной волшебнице\nзадержалось на полках этажа {floor}. Осторожнее.`,
        `Записи о том, что башня кренится,\nвпервые появляются именно с этажа {floor}.`,
      ],
      wisp: [
        `Чувствуешь, как дрожит пол? На этаже {floor}\nгравитация еще не пришла в себя.`,
        `Смотри, как ингредиенты тянутся друг к другу\nздесь, хе-хе. Забавно, правда?`,
        `Видишь этот старый посох? Он с этажа {floor}.\nКуда же делась его хозяйка?`,
      ],
      gatekeeper: [
        `С этажа {floor} давление\nменяется. Держись крепче.`,
        `Немногие доходили до такой высоты.\nОщути вес этажа {floor}.`,
        `Башня мало-помалу кренится.\nОсобенно с этажа {floor}. Будь начеку.`,
      ],
      sprite: [
        `Ингредиенты стали такими твердыми!\nНаверное, из-за давления этажа {floor}.`,
        `Даже я чувствую, как воздух на этаже {floor}\nтяжелеет... трудно дышать.`,
        `Где-то пахнет потерянной волшебницей...\nэтаж {floor}, честно-честно!`,
      ],
      apprentice: [
        `С этажа {floor} даже у меня\nперехватывает дыхание. Пойдем медленно.`,
        `Когда вижу, как ингредиенты держатся,\nмне легче... этаж {floor}, мы справимся.`,
        `Даже наставница не говорила об этаже {floor}.\nМожет, мы первые, кто сюда дошел.`,
      ],
    },
    high: {
      archivist: [
        `Книги здесь наверху никто не читал.\nЗнание этажа {floor} не имеет владельца.`,
        `В записях этажа {floor} снова и снова\nодно слово: «одиночество».`,
        `В летописи сказано, что печати чертят себя заново.\nПохоже, этаж {floor} что-то помнит.`,
      ],
      wisp: [
        `Звездный свет льется в окно!\nЭтаж {floor} уже выше облаков.`,
        `Чувствуешь разреженный воздух? С этажа {floor}\nдаже я слежу за дыханием, хе-хе.`,
        `Даже страж редко приходит сюда.\nС этажа {floor} у тебя есть только я.`,
      ],
      gatekeeper: [
        `С этажа {floor} мои обходы\nстановятся редки. Считай, ты одна.`,
        `Шаги отдаются непривычно громко.\nЭтаж {floor} пустует долгие века.`,
        `Отсюда твоя воля важнее гравитации.\nИменно это проверяет этаж {floor}.`,
      ],
      sprite: [
        `Даже пыль на полках здесь особенная!\nПыль этажа {floor} сияет.`,
        `Звезды кажутся ближе окон~\nэтаж {floor} странно тих.`,
        `Башня дрожит, будто дышит...\nособенно с этажа {floor}. Правда странно?`,
      ],
      apprentice: [
        `Не верится, что ты одна добралась\nдо этажа {floor}. Это невероятно.`,
        `Тебе не хватает воздуха? С этажа {floor}\nя тоже иду медленнее.`,
        `Отсюда все правда зависит\nот твоей воли. Этаж {floor}, верь ей.`,
      ],
    },
    summit: {
      archivist: [
        `Хроники мира под облаками\nздесь ничего не значат. Этаж {floor} принадлежит небу.`,
        `Записи о свете вершины бледны.\nС этажа {floor} проявится подлинное.`,
        `Список тех, кто дошел так далеко,\nочень короток. Тишина этажа {floor} тому доказательство.`,
      ],
      wisp: [
        `Слышен только ветер, да?\nНа этаже {floor} правда ничего нет. Такая тишина.`,
        `Ингредиенты будто стали невесомыми!\nМагия этажа {floor}, наверное, хе-хе.`,
        `Звезды ближе, чем окно...\nэтаж {floor} пугающе спокоен.`,
      ],
      gatekeeper: [
        `Тот, кто выдержал до этажа {floor},\nуже не обычная ученица.`,
        `Башня едва заметно дрожит. С этажа {floor}\nлучше подниматься, затаив дыхание.`,
        `Отсюда решимость стоит выше правил.\nЗапомни этаж {floor}.`,
      ],
      sprite: [
        `Облака у тебя под ногами! Этаж {floor}\nи правда выше неба, как волнительно.`,
        `Башня качается, будто дышит...\nэтаж {floor} другой, сердце колотится.`,
        `Почти никто не поднимался так высоко!\nЭтаж {floor}, ты, наверное, особенная.`,
      ],
      apprentice: [
        `Кажется, я вижу свет вершины...\nс этажа {floor} он выглядит настоящим.`,
        `Если ты дошла так далеко, ты необычная.\nЭтаж {floor}, я тоже в тебя верю.`,
        `Слышно только дыхание...\nэтаж {floor}, пойдем дальше тихо, вместе.`,
      ],
    },
    peak: {
      archivist: [
        `Вершина почти перед нами. Запись\nоб этаже {floor} теперь придется сделать мне.`,
        `Летопись последней печати завершится,\nкогда ты минуешь этаж {floor}.`,
        `Этаж {floor}... я не думал,\nчто ты дойдешь так далеко. Конец уже виден.`,
      ],
      wisp: [
        `Кажется, вся башня смотрит на тебя!\nОсобенно с этажа {floor}, хе-хе.`,
        `Гравитация на этой высоте уже не прихоть.\nОна движется так, будто имеет волю.`,
        `Этаж {floor}, разве ты уже не чувствуешь,\nчто воздух иной? Почти пришли.`,
      ],
      gatekeeper: [
        `После этажа {floor} остается немного.\nСохраняй сосредоточенность до конца.`,
        `Последнее испытание башни приближается.\nПочувствуй воздух этажа {floor}.`,
        `Дошедший сюда не может повернуть назад.\nЭтаж {floor}, иди до конца.`,
      ],
      sprite: [
        `Почти пришли! Воздух этажа {floor}\nсовсем другой, сердце подпрыгивает.`,
        `Башня будто смотрит на тебя...\nс этажа {floor} даже я дрожу.`,
        `Этаж {floor}, кажется, я вижу\nсамый конец! Пойдем вместе!`,
      ],
      apprentice: [
        `Я все еще не верю, что ты добралась\nдо этажа {floor}. Почти пришли.`,
        `Последняя печать близко...\nэтаж {floor}, я тоже дрожу, но верю.`,
        `Этаж {floor}... я не думала,\nчто мы зайдем так далеко. Увидим конец вместе.`,
      ],
    },
  },
  pinnedLines: {
    30: `Отсюда заклинания то и дело сбиваются.\nГравитация этажа {floor} своенравна. Осторожно.`,
    60: `Поднимайся осторожно. С этажа {floor}\nсама башня словно начинает думать.`,
    80: `Отсюда меняется даже устройство башни.\nГоворят, этаж {floor} изначально к ней не относился.`,
    95: `Почти пришли. За этажом {floor}\nты ощутишь запечатанную магию напрямую.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Я подобрала кое-что блестящее! Это тебе, держи!` },
    { speaker: 'wisp', text: `Хе-хе, подарок. Не совсем бесплатный... но сегодня просто отдам.` },
    { speaker: 'archivist', text: `Предмет упал между полками. Он наверняка тебе пригодится.` },
    { speaker: 'gatekeeper', text: `Башня признала твое право на испытание. Прими это.` },
    { speaker: 'apprentice', text: `У меня еще один оставался... возьми его. Удачи тебе!` },
  ],
  itemLabels: {
    bonusMove: 'Усиление +3 хода',
    lineRow: 'Ингредиент удаления ряда',
    lineCol: 'Ингредиент удаления столбца',
    crossBomb: 'Ингредиент крестовой бомбы',
    colorBomb: 'Ингредиент цветной бомбы',
  },
  stage1: `Нужно вернуть магию, запечатанную\nна вершине башни. Ученица, если готова, начнем.`,
  stage1000: `Наконец ты достигла конца башни.\nМагия этого места... теперь целиком твоя.`,
};

const ar: LangStory = {
  speakerNames: {
    archivist: 'الأرشيفي العجوز',
    wisp: 'الشعلة المراوغة',
    gatekeeper: 'حارس البرج',
    sprite: 'جنية الغبار',
    apprentice: 'الساحرة المتدربة',
  },
  bands: {
    early: {
      archivist: [
        `الطابق {floor} لم يدخل رفوفي بعد.\nستكونين أول من يكتب حكايته.`,
        `أقدم الكتب تبدأ من الطوابق الدنيا،\nمثل الطابق {floor}. لكل رحلة مبتدأ.`,
        `حبر باهت تحت الغبار...\nحتى الطابق {floor} كان بداية أحدهم يوما.`,
      ],
      wisp: [
        `هيه، لا رحمة لمجرد أنه\nالطابق {floor}. انتبهي لخطاك.`,
        `هناك فخ هنا... هل أخبرك؟\nحسنا، إنه الطابق {floor}، سأغض الطرف.`,
        `ظننت أن طابقا منخفضا سيكون مملا؟\nالطابق {floor} ما زال يعرف كيف يعض.`,
      ],
      gatekeeper: [
        `اجتزت الطابق {floor}. القاعدة\nبسيطة: لا تخفضي حذرك أبدا.`,
        `قانون البرج يسري كما هو\nمن الطابق {floor}. لا استثناءات.`,
        `كثيرون توقفوا عند الطابق {floor}.\nآمل أن تكوني مختلفة.`,
      ],
      sprite: [
        `انظري إلى هذا الغبار! في الطابق {floor}\nيسكن كثير من أصدقائي.`,
        `شق صغير هنا~ حتى الطابق {floor}\nيبدو كأنه يخفي سرا.`,
        `هيهي، سلالم الطابق {floor}\nلها صوت مختلف مع كل خطوة!`,
      ],
      apprentice: [
        `كانت يداي ترتجفان أيضا\nعندما صعدت إلى الطابق {floor}. وأنت؟`,
        `أتذكر الطابق {floor} جيدا.\nلا تتوتري، خذيه ببطء.`,
        `كأننا نصعد معا.\nالطابق {floor}، ما زلنا مبتدئتين.`,
      ],
    },
    rising: {
      archivist: [
        `من الطابق {floor} تغدو الحروف غريبة،\nتحذيرات بلسان قديم.`,
        `سمعت أن سجلات التعويذات الفاشلة\nباقية في مكان ما من الطابق {floor}.`,
        `سجلات هذا العلو تالفة.\nحقيقة الطابق {floor} لم تكتمل بعد.`,
      ],
      wisp: [
        `الجاذبية ستنقلب من جديد،\nفاحذري في الطابق {floor}!`,
        `أترين المكونات تلمع؟\nمن الطابق {floor} يصير السحر أكثف.`,
        `صرير، صرير... أتسمعين السلالم\nتئن بقلق في الطابق {floor}؟`,
      ],
      gatekeeper: [
        `من الطابق {floor} ضاعفي حراستك.\nفالبرج يصير متقلبا هنا.`,
        `آثار الذين توقفوا هنا\nمحفورة على الجدران. تذكري الطابق {floor}.`,
        `هواء الطابق {floor} مختلف.\nالغافلون تبتلعهم الجاذبية.`,
      ],
      sprite: [
        `واو، الرسوم على جدران الطابق {floor}\nتبدو كأنها تتحرك!`,
        `الشمعة ترتجف بلا ريح...\nهناك شيء في الطابق {floor}، قلبي يخفق.`,
        `من الطابق {floor} تصير الكتابة غريبة.\nحتى أنا لا أقرأها، هيهي.`,
      ],
      apprentice: [
        `وصلت إلى الطابق {floor} بهذه السرعة...\nأنت أسرع مني، بصراحة أغبطك قليلا.`,
        `من هنا يزداد التوتر حقا.\nالطابق {floor}، لنحذر معا.`,
        `حذرتني معلمتي أن الطابق {floor}\nيحتاج عناية خاصة. تذكري ذلك.`,
      ],
    },
    deep: {
      archivist: [
        `سجلات هواء الطابق {floor}\nلا تكرر إلا كلمة واحدة: «ثقيل».`,
        `حكاية ساحرة ضائعة عالقة\nعلى رفوف الطابق {floor}. توخي الحذر.`,
        `سجلات ميلان البرج\nتبدأ بالظهور فعلا من الطابق {floor}.`,
      ],
      wisp: [
        `تشعرين بالأرض ترتجف؟ الطابق {floor}\nلم يستقر في جاذبيته بعد.`,
        `انظري كيف تنجذب المكونات\nبعضها إلى بعض هنا، هيه.`,
        `أترين هذه العصا القديمة؟ إنها من الطابق {floor}.\nأين ذهبت صاحبتها يا ترى؟`,
      ],
      gatekeeper: [
        `من الطابق {floor} يتغير\nالضغط. ثبتي نفسك.`,
        `قلة بلغوا هذا العلو.\nاشعري بثقل الطابق {floor}.`,
        `البرج يميل شيئا فشيئا.\nوخاصة من الطابق {floor}. ابقي يقظة.`,
      ],
      sprite: [
        `صارت المكونات قاسية جدا!\nلا بد أنه ضغط الطابق {floor}.`,
        `حتى أنا أشعر بهواء الطابق {floor}\nيثقل... يصعب التنفس.`,
        `أشم رائحة ساحرة تائهة في مكان ما...\nالطابق {floor}، أقسم إنني صادقة!`,
      ],
      apprentice: [
        `من الطابق {floor} حتى أنا\nأشعر بضيق النفس. لنسر ببطء.`,
        `رؤية المكونات تصمد هكذا\nتمنحني قوة... الطابق {floor}، سننجح.`,
        `حتى معلمتي لم تذكر الطابق {floor}.\nربما نحن أول من يصل إلى هنا.`,
      ],
    },
    high: {
      archivist: [
        `لم يقرأ أحد الكتب هنا في الأعلى.\nمعرفة الطابق {floor} لا مالك لها.`,
        `سجلات الطابق {floor} تكرر\nكلمة واحدة فقط: «الوحدة».`,
        `يقول سجل إن دوائر الختم ترسم نفسها من جديد.\nيبدو أن الطابق {floor} يتذكر شيئا.`,
      ],
      wisp: [
        `ضوء النجوم ينسكب من النافذة!\nالطابق {floor} صار فوق الغيوم.`,
        `تشعرين برقة الهواء؟ من الطابق {floor}\nحتى أنا أراقب أنفاسي، هيه.`,
        `حتى الحارس قلما يأتي إلى هنا.\nمن الطابق {floor} لن يبقى لك إلا أنا.`,
      ],
      gatekeeper: [
        `من الطابق {floor} تقل دورياتي.\nاعتبري نفسك وحيدة.`,
        `وقع الخطوات يتردد بصوت غريب.\nالطابق {floor} ظل خاليا دهورا.`,
        `من هنا، إرادتك أهم من الجاذبية.\nوهذا بالضبط امتحان الطابق {floor}.`,
      ],
      sprite: [
        `حتى الغبار على الرفوف هنا خاص!\nغبار الطابق {floor} يلمع.`,
        `النجوم تبدو أقرب من النوافذ~\nالطابق {floor} هادئ على نحو عجيب.`,
        `البرج يرتجف كأنه يتنفس...\nوخاصة من الطابق {floor}. أليس غريبا؟`,
      ],
      apprentice: [
        `لا أكاد أصدق أنك وصلت وحدك\nإلى الطابق {floor}. هذا مذهل.`,
        `ألا ينقطع نفسك؟ من الطابق {floor}\nحتى أنا أمشي أبطأ.`,
        `من هنا يبدو أن الأمر يعتمد حقا\nعلى إرادتك. الطابق {floor}، ثقي بها.`,
      ],
    },
    summit: {
      archivist: [
        `سجلات العالم تحت الغيوم\nلا تساوي شيئا هنا. الطابق {floor} للسماء.`,
        `روايات ضوء القمة باهتة.\nمن الطابق {floor} سيظهر الحقيقي.`,
        `قائمة من بلغوا هذا الحد قصيرة جدا.\nصمت الطابق {floor} شاهد على ذلك.`,
      ],
      wisp: [
        `لا تسمعين إلا الريح، صحيح؟\nفي الطابق {floor} لا شيء حقا. يا له من سكون.`,
        `المكونات تبدو خفيفة كالريش!\nلا بد أنها سحر الطابق {floor}، هيه.`,
        `النجوم أقرب من النافذة...\nالطابق {floor} هادئ بصورة مخيفة.`,
      ],
      gatekeeper: [
        `من صمدت حتى الطابق {floor}\nليست متدربة عادية.`,
        `البرج يرتجف ارتجافا خفيا. من الطابق {floor}\nمن الحكمة أن تصعدي حابسة أنفاسك.`,
        `من هنا تتقدم العزيمة على القواعد.\nاحفظي الطابق {floor} في ذاكرتك.`,
      ],
      sprite: [
        `الغيوم تحت قدميك! الطابق {floor}\nفوق السماء حقا، كم هذا مثير.`,
        `البرج يتمايل كأنه يتنفس...\nالطابق {floor} مختلف، قلبي يدق.`,
        `يكاد لا أحد يصعد إلى هذا العلو!\nالطابق {floor}، يبدو أنك مميزة.`,
      ],
      apprentice: [
        `أظنني أرى ضوء القمة...\nمن الطابق {floor} يبدو حقيقيا.`,
        `من وصلت إلى هنا ليست عادية.\nالطابق {floor}، أنا أؤمن بك أيضا.`,
        `لا نسمع إلا الأنفاس...\nالطابق {floor}، لنتابع بهدوء معا.`,
      ],
    },
    peak: {
      archivist: [
        `القمة باتت قريبة جدا. سجل\nالطابق {floor} سأكتبه أنا الآن.`,
        `سجل الختم الأخير سيكتمل\nعندما تتجاوزين الطابق {floor}.`,
        `الطابق {floor}... لم أظن\nأنك ستصلين إلى هذا الحد. النهاية تلوح.`,
      ],
      wisp: [
        `كأن البرج كله يحدق بك!\nخصوصا من الطابق {floor}، هيه.`,
        `الجاذبية في هذا العلو ليست نزوة.\nإنها تتحرك كأن لها إرادة.`,
        `الطابق {floor}، ألا تشعرين بعد\nأن الهواء صار مختلفا؟ أوشكنا.`,
      ],
      gatekeeper: [
        `بعد الطابق {floor} لا يبقى الكثير.\nحافظي على تركيزك حتى النهاية.`,
        `الاختبار الأخير للبرج يقترب.\nاشعري بهواء الطابق {floor}.`,
        `من وصل إلى هنا لا يستطيع الرجوع.\nالطابق {floor}، امضي حتى النهاية.`,
      ],
      sprite: [
        `كدنا نصل! هواء الطابق {floor}\nمختلف تماما، قلبي يقفز.`,
        `البرج يبدو كأنه ينظر إليك...\nمن الطابق {floor} حتى أنا أرتجف.`,
        `الطابق {floor}، أظنني أرى\nالنهاية! لنذهب معا!`,
      ],
      apprentice: [
        `ما زلت لا أصدق أنك وصلت\nإلى الطابق {floor}. كدنا نصل.`,
        `الختم الأخير قريب...\nالطابق {floor}، أنا أرتجف أيضا، لكنني أؤمن.`,
        `الطابق {floor}... لم أظن\nأننا سنصل إلى هذا الحد. لنر النهاية معا.`,
      ],
    },
  },
  pinnedLines: {
    30: `من هنا تبدأ التعويذات بالانحراف مرارا.\nجاذبية الطابق {floor} متقلبة. احذري.`,
    60: `اصعدي بحذر. من الطابق {floor}\nيبدو أن البرج نفسه بدأ يفكر.`,
    80: `من هنا يتغير حتى مخطط البرج نفسه.\nيقال إن الطابق {floor} لم يكن جزءا منه أصلا.`,
    95: `كدت تصلين. بعد الطابق {floor}\nستشعرين بالسحر المختوم مباشرة.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `التقطت شيئا يلمع! إنه لك، خذيه!` },
    { speaker: 'wisp', text: `هيه، هدية. ليست مجانية تماما... لكنني سأعطيك إياها اليوم.` },
    { speaker: 'archivist', text: `سقط غرض بين الرفوف. لا شك أنه سينفعك.` },
    { speaker: 'gatekeeper', text: `لقد اعترف البرج بأهليتك للاختبار. اقبلي هذا.` },
    { speaker: 'apprentice', text: `كان بقي عندي واحد... خذيه أنت. أتمنى لك الحظ!` },
  ],
  itemLabels: {
    bonusMove: 'تعزيز +3 حركات',
    lineRow: 'مكون إزالة صف',
    lineCol: 'مكون إزالة عمود',
    crossBomb: 'مكون قنبلة صليبية',
    colorBomb: 'مكون قنبلة اللون',
  },
  stage1: `علينا استعادة السحر المختوم\nفي قمة البرج. أيتها المتدربة، إن كنت جاهزة فلنبدأ.`,
  stage1000: `أخيرا بلغت نهاية البرج.\nسحر هذا المكان... صار كله لك.`,
};

const hi: LangStory = {
  speakerNames: {
    archivist: 'वृद्ध अभिलेखपाल',
    wisp: 'भटकती ज्योति',
    gatekeeper: 'मीनार का द्वारपाल',
    sprite: 'धूल परी',
    apprentice: 'जादूगरनी शिष्या',
  },
  bands: {
    early: {
      archivist: [
        `मंजिल {floor} अभी मेरी अलमारियों में नहीं आई।\nइसकी कथा सबसे पहले तुम लिखोगी।`,
        `सबसे पुरानी किताबें निचली मंजिलों से शुरू होती हैं,\nजैसे मंजिल {floor}. हर यात्रा का आरंभ होता है।`,
        `धूल के नीचे फीकी स्याही दिखती है...\nमंजिल {floor} भी कभी किसी की शुरुआत थी।`,
      ],
      wisp: [
        `हीही, सिर्फ इसलिए छूट नहीं मिलेगी\nकि यह मंजिल {floor} है। कदम संभालो।`,
        `यहां एक फंदा है... बताऊं क्या?\nचलो, मंजिल {floor} है, इस बार छोड़ देती हूं।`,
        `सोचा था निचली मंजिल उबाऊ होगी?\nमंजिल {floor} में भी थोड़ा डंक है।`,
      ],
      gatekeeper: [
        `मंजिल {floor} पार। नियम\nसरल है: पहरा कभी ढीला मत छोड़ो।`,
        `मीनार का विधान समान रूप से लागू है\nमंजिल {floor} से। कोई अपवाद नहीं।`,
        `कई लोग मंजिल {floor} पर रुक गए।\nआशा है तुम अलग सिद्ध होगी।`,
      ],
      sprite: [
        `यह धूल देखो! मंजिल {floor}\nमेरे कितने दोस्तों का घर है।`,
        `यहां एक छोटी दरार है~ मंजिल {floor} भी\nमानो कोई रहस्य छिपाए बैठी है।`,
        `हीही, मंजिल {floor} की सीढ़ियां\nहर कदम पर अलग आवाज करती हैं!`,
      ],
      apprentice: [
        `मंजिल {floor} तक चढ़ते हुए\nमेरे हाथ भी कांपे थे। तुम्हारे भी?`,
        `मंजिल {floor} मुझे अच्छी तरह याद है।\nघबराना मत, धीरे-धीरे चलो।`,
        `लगता है हम साथ चढ़ रहे हैं।\nमंजिल {floor}, हम दोनों अभी नौसिखिए हैं।`,
      ],
    },
    rising: {
      archivist: [
        `मंजिल {floor} से अक्षर अजनबी हो जाते हैं,\nकिसी प्राचीन भाषा की चेतावनियां।`,
        `सुना है असफल मंत्रों के अभिलेख\nमंजिल {floor} पर कहीं पड़े हैं।`,
        `इस ऊंचाई के अभिलेख क्षतिग्रस्त हैं।\nमंजिल {floor} का सत्य अभी अधूरा है।`,
      ],
      wisp: [
        `गुरुत्व फिर पलटने वाला है,\nमंजिल {floor} पर सावधान रहना!`,
        `देखो, सामग्री चमक रही है?\nमंजिल {floor} से जादू गाढ़ा हो जाता है।`,
        `चर्र-चर्र... सुन रही हो सीढ़ियां\nमंजिल {floor} पर बेचैनी से कराह रही हैं?`,
      ],
      gatekeeper: [
        `मंजिल {floor} से अपना पहरा दोगुना करो।\nयहां मीनार चंचल हो उठती है।`,
        `जो यहां रुक गए, उनके निशान\nदीवारों पर हैं। मंजिल {floor} याद रखना।`,
        `मंजिल {floor} की हवा अलग है।\nलापरवाहों को गुरुत्व निगल लेता है।`,
      ],
      sprite: [
        `वाह, मंजिल {floor} की दीवारों पर चित्र\nजैसे हिल रहे हों!`,
        `बिना हवा के मोमबत्ती कांप रही है...\nमंजिल {floor} पर कुछ है, दिल धकधक कर रहा है।`,
        `मंजिल {floor} से लिखावट अजीब हो जाती है।\nमैं भी नहीं पढ़ पाती, हीही।`,
      ],
      apprentice: [
        `तुम मंजिल {floor} तक पहले ही पहुंच गई...\nतुम मुझसे तेज हो, सच कहूं तो थोड़ी ईर्ष्या है।`,
        `यहां से सचमुच तनाव बढ़ता है।\nमंजिल {floor}, चलो साथ सावधान रहें।`,
        `मेरी गुरु ने कहा था कि मंजिल {floor}\nपर खास सावधानी चाहिए। याद रखना।`,
      ],
    },
    deep: {
      archivist: [
        `मंजिल {floor} की हवा के अभिलेख\nबस एक शब्द दोहराते हैं: 'भारी'.`,
        `एक खोई हुई जादूगरनी की कथा\nमंजिल {floor} की अलमारियों में अटकी है। सावधान।`,
        `मीनार के झुकने के वृत्तांत\nवास्तव में मंजिल {floor} से दिखने लगते हैं।`,
      ],
      wisp: [
        `फर्श कांपता महसूस हुआ? मंजिल {floor}\nका गुरुत्व अभी तक थमा नहीं है।`,
        `देखो यहां सामग्री कैसे\nएक-दूसरे को खींच रही है, हीही।`,
        `यह पुरानी छड़ी दिखी? यह मंजिल {floor} की है।\nइसकी मालकिन कहां चली गई?`,
      ],
      gatekeeper: [
        `मंजिल {floor} से दबाव\nबदलता है। स्वयं को संभालो।`,
        `बहुत कम लोग इस ऊंचाई तक पहुंचे हैं।\nमंजिल {floor} का भार महसूस करो।`,
        `मीनार धीरे-धीरे झुकती है।\nविशेषकर मंजिल {floor} से। सतर्क रहो।`,
      ],
      sprite: [
        `सामग्री कितनी सख्त हो गई!\nशायद मंजिल {floor} के दबाव से।`,
        `मुझे भी मंजिल {floor} की हवा\nभारी लगती है... सांस लेना कठिन है।`,
        `कहीं से खोई जादूगरनी की गंध आ रही है...\nमंजिल {floor}, सचमुच कह रही हूं!`,
      ],
      apprentice: [
        `मंजिल {floor} से मेरी भी\nसांस फूलती है। धीरे चलें।`,
        `सामग्री को टिके देखना\nमुझे बल देता है... मंजिल {floor}, हम कर लेंगे।`,
        `मेरी गुरु ने भी मंजिल {floor} का जिक्र नहीं किया।\nशायद यहां हम पहली बार आए हैं।`,
      ],
    },
    high: {
      archivist: [
        `यहां ऊपर की किताबें किसी ने नहीं पढ़ीं।\nमंजिल {floor} का ज्ञान अनाथ है।`,
        `मंजिल {floor} के अभिलेख बस\nएक शब्द दोहराते हैं: 'एकांत'.`,
        `एक अभिलेख कहता है कि मुहरें खुद को फिर बनाती हैं।\nमंजिल {floor} मानो कुछ याद रखती है।`,
      ],
      wisp: [
        `खिड़की से तारों की रोशनी बरस रही है!\nमंजिल {floor} तो बादलों से ऊपर है।`,
        `पतली हवा महसूस हुई? मंजिल {floor} से\nमैं भी अपनी सांस संभालती हूं, हीही।`,
        `द्वारपाल भी यहां कम ही आता है।\nमंजिल {floor} से तुम्हारे पास बस मैं हूं।`,
      ],
      gatekeeper: [
        `मंजिल {floor} से मेरी गश्त\nदुर्लभ हो जाती है। स्वयं को अकेला समझो।`,
        `कदमों की गूंज असामान्य रूप से तेज है।\nमंजिल {floor} लंबे समय से खाली है।`,
        `यहां से तुम्हारी इच्छा गुरुत्व से अधिक महत्त्व रखती है।\nमंजिल {floor} इसी की परीक्षा है।`,
      ],
      sprite: [
        `यहां अलमारियों की धूल भी खास है!\nमंजिल {floor} की धूल चमकती है।`,
        `तारे खिड़कियों से भी पास लगते हैं~\nमंजिल {floor} अजीब तरह से शांत है।`,
        `मीनार ऐसे कांपती है जैसे सांस ले रही हो...\nखासकर मंजिल {floor} से। अजीब है न?`,
      ],
      apprentice: [
        `विश्वास नहीं होता कि तुम अकेली\nमंजिल {floor} तक आ गई। यह अद्भुत है।`,
        `सांस तो नहीं फूल रही? मंजिल {floor} से\nमैं भी धीरे चलती हूं।`,
        `यहां से सच में सब तुम्हारी इच्छा पर\nनिर्भर लगता है। मंजिल {floor}, उस पर भरोसा करो।`,
      ],
    },
    summit: {
      archivist: [
        `बादलों के नीचे की दुनिया के अभिलेख\nयहां निरर्थक हैं। मंजिल {floor} आकाश की है।`,
        `शिखर के प्रकाश पर लिखे वृत्तांत फीके हैं।\nमंजिल {floor} से सत्य दिखाई देगा।`,
        `जो यहां तक पहुंचे, उनकी सूची बहुत छोटी है।\nमंजिल {floor} की निस्तब्धता इसका प्रमाण है।`,
      ],
      wisp: [
        `सिर्फ हवा सुनाई देती है, है न?\nमंजिल {floor} पर सचमुच कुछ नहीं। कितनी शांति।`,
        `सामग्री पंख जैसी हल्की लग रही है!\nमंजिल {floor} का जादू होगा, हीही।`,
        `तारे खिड़की से भी करीब हैं...\nमंजिल {floor} अजीब हद तक शांत है।`,
      ],
      gatekeeper: [
        `जो मंजिल {floor} तक टिक गई,\nवह साधारण शिष्या नहीं।`,
        `मीनार सूक्ष्म रूप से कांपती है। मंजिल {floor} से\nसांस रोककर चढ़ना ही उचित है।`,
        `यहां से नियमों से पहले संकल्प आता है।\nमंजिल {floor} याद रखना।`,
      ],
      sprite: [
        `बादल तुम्हारे पैरों के नीचे हैं! मंजिल {floor}\nसचमुच आकाश से ऊपर है, कितना रोमांचक।`,
        `मीनार सांस लेती हुई डोलती है...\nमंजिल {floor} अलग है, दिल धड़क रहा है।`,
        `लगभग कोई इतना ऊपर नहीं चढ़ा!\nमंजिल {floor}, तुम सचमुच खास लगती हो।`,
      ],
      apprentice: [
        `लगता है मुझे शिखर की रोशनी दिख रही है...\nमंजिल {floor} से वह सच लगती है।`,
        `इतनी दूर पहुंचना बताता है कि तुम साधारण नहीं।\nमंजिल {floor}, मैं भी तुम पर विश्वास करती हूं।`,
        `अब बस सांसों की आवाज है...\nमंजिल {floor}, चलो चुपचाप साथ आगे बढ़ें।`,
      ],
    },
    peak: {
      archivist: [
        `शिखर अब हाथ की पहुंच में है।\nमंजिल {floor} का अभिलेख अब मुझे लिखना होगा।`,
        `अंतिम मुहर का अभिलेख पूरा होगा\nजब तुम मंजिल {floor} को पार करोगी।`,
        `मंजिल {floor}... मैंने नहीं सोचा था\nकि तुम इतनी दूर आओगी। अंत दिख रहा है।`,
      ],
      wisp: [
        `लगता है पूरी मीनार तुम्हें देख रही है!\nखासकर मंजिल {floor} से, हीही।`,
        `इस ऊंचाई का गुरुत्व कोई मनमानी नहीं।\nयह ऐसे चलता है मानो इसकी इच्छा हो।`,
        `मंजिल {floor}, क्या तुम्हें पहले से\nहवा बदली हुई नहीं लगती? बस थोड़ा बाकी है।`,
      ],
      gatekeeper: [
        `मंजिल {floor} के बाद बहुत कम शेष है।\nअंत तक एकाग्रता बनाए रखो।`,
        `मीनार की अंतिम परीक्षा निकट है।\nमंजिल {floor} की हवा महसूस करो।`,
        `जो यहां तक आया, लौट नहीं सकता।\nमंजिल {floor}, अंत तक जाओ।`,
      ],
      sprite: [
        `लगभग पहुंच गए! मंजिल {floor} की हवा\nबिल्कुल अलग है, दिल उछल रहा है।`,
        `मीनार जैसे तुम्हें देख रही हो...\nमंजिल {floor} से मैं भी कांपती हूं।`,
        `मंजिल {floor}, मुझे लगता है\nअंत दिख रहा है! साथ चलें!`,
      ],
      apprentice: [
        `अब भी विश्वास नहीं होता कि तुम\nमंजिल {floor} तक पहुंचीं। बस थोड़ा बाकी है।`,
        `अंतिम मुहर पास है...\nमंजिल {floor}, मैं भी कांप रही हूं, पर विश्वास है।`,
        `मंजिल {floor}... मैंने नहीं सोचा था\nकि हम इतनी दूर आएंगे। अंत को साथ देखें।`,
      ],
    },
  },
  pinnedLines: {
    30: `यहां से मंत्र बार-बार भटकने लगते हैं।\nमंजिल {floor} का गुरुत्व चंचल है। सावधान।`,
    60: `सावधानी से ऊपर बढ़ो। मंजिल {floor} से\nमीनार स्वयं सोचती हुई लगती है।`,
    80: `यहां से मीनार की रचना भी बदल जाती है।\nकहते हैं मंजिल {floor} मूलतः इसका भाग नहीं थी।`,
    95: `लगभग पहुंच गए। मंजिल {floor} के पार\nतुम सीलबंद जादू को सीधे महसूस करोगी।`,
  },
  eventLines: [
    { speaker: 'sprite', text: `मैंने कुछ चमकदार उठाया! यह तुम्हारे लिए है, लो!` },
    { speaker: 'wisp', text: `हीही, उपहार है। बिल्कुल मुफ्त नहीं... पर आज यूं ही दे दूंगी।` },
    { speaker: 'archivist', text: `एक वस्तु अलमारियों के बीच गिर गई थी। यह तुम्हारे काम आएगी।` },
    { speaker: 'gatekeeper', text: `मीनार ने तुम्हें परीक्षा योग्य माना है। इसे स्वीकार करो।` },
    { speaker: 'apprentice', text: `मेरे पास एक बचा था... तुम ले लो। शुभकामनाएं!` },
  ],
  itemLabels: {
    bonusMove: '+3 चालें बढ़ाने वाला',
    lineRow: 'पंक्ति हटाने की सामग्री',
    lineCol: 'स्तंभ हटाने की सामग्री',
    crossBomb: 'क्रॉस बम सामग्री',
    colorBomb: 'रंग बम सामग्री',
  },
  stage1: `हमें मीनार के शिखर पर सीलबंद\nजादू वापस लाना है। शिष्या, तैयार हो तो शुरू करें।`,
  stage1000: `आखिर तुम मीनार के अंत तक पहुंच गई।\nइस जगह का जादू... अब पूरा तुम्हारा है।`,
};

const id: LangStory = {
  speakerNames: {
    archivist: 'Arsiparis Tua',
    wisp: 'Api Kecil Penggoda',
    gatekeeper: 'Penjaga Gerbang Menara',
    sprite: 'Peri Debu',
    apprentice: 'Penyihir Magang',
  },
  bands: {
    early: {
      archivist: [
        `Catatan lantai {floor} belum ada\ndi rakku. Kaulah penulis pertamanya.`,
        `Kitab tua selalu bermula dari lantai rendah,\nseperti lantai {floor}.`,
        `Di balik debu tampak tinta usang.\nLantai {floor} pun dulu awal seseorang.`,
      ],
      wisp: [
        `Hehe, lantai {floor} bukan alasan\nuntuk dikasih ampun. Jaga langkahmu.`,
        `Ada jebakan di sini... mau kuberi tahu?\nKarena lantai {floor}, kuberi kelonggaran.`,
        `Kukira lantai rendah membosankan?\nLantai {floor} ternyata cukup seru juga.`,
      ],
      gatekeeper: [
        `Lantai {floor} terlewati. Aturannya\nsederhana: jangan lengah.`,
        `Hukum menara berlaku sama\nsejak lantai {floor}. Tiada pengecualian.`,
        `Banyak yang berhenti di lantai {floor}.\nKuharap kau berbeda.`,
      ],
      sprite: [
        `Lihat debu ini! Di lantai {floor}\nbanyak sekali temanku tinggal.`,
        `Ada retak kecil~ lantai {floor} pun\nsepertinya menyembunyikan rahasia.`,
        `Hihi, tangga lantai {floor}\nbunyinya beda di tiap pijakan!`,
      ],
      apprentice: [
        `Saat naik ke lantai {floor}, tanganku\njuga gemetar. Kau juga, kan?`,
        `Lantai {floor} masih kuingat.\nJangan tegang, pelan-pelan saja.`,
        `Rasanya kita mendaki bersama. Lantai {floor},\nkita berdua masih pemula.`,
      ],
    },
    rising: {
      archivist: [
        `Sejak lantai {floor}, hurufnya asing.\nPeringatan dalam bahasa kuno.`,
        `Konon catatan mantra yang gagal\ntersisa di suatu tempat lantai {floor}.`,
        `Catatan setinggi ini banyak rusak.\nKebenaran lantai {floor} belum utuh.`,
      ],
      wisp: [
        `Gravitasi akan berbalik lagi,\nhati-hati di lantai {floor}!`,
        `Lihat bahan-bahan itu berkilau?\nMulai lantai {floor}, sihirnya makin pekat.`,
        `Kriuk-kriuk, dengar tangga lantai {floor}\nmerintih gelisah begitu?`,
      ],
      gatekeeper: [
        `Mulai lantai {floor}, gandakan kewaspadaan.\nBagian menara ini mudah berubah.`,
        `Jejak penantang yang berhenti di sini\nterukir di dinding. Ingat lantai {floor}.`,
        `Udara lantai {floor} berbeda. Yang lengah\nakan ditelan gravitasi.`,
      ],
      sprite: [
        `Wah, gambar di dinding lantai {floor}\nkelihatan seperti bergerak!`,
        `Lilin bergoyang tanpa angin...\nDi lantai {floor} ada sesuatu, deg-degan.`,
        `Mulai lantai {floor}, tulisannya aneh.\nAku pun tak bisa baca, hihi.`,
      ],
      apprentice: [
        `Kau sudah sampai lantai {floor}...\nSejujurnya, kau lebih cepat dariku.`,
        `Mulai sini rasanya sungguh menegangkan.\nLantai {floor}, ayo hati-hati bersama.`,
        `Guruku bilang lantai {floor}\nharus ekstra diwaspadai. Ingat itu.`,
      ],
    },
    deep: {
      archivist: [
        `Catatan udara lantai {floor}\nhanya mengulang kata 'berat'.`,
        `Kisah penyihir yang tersesat tersimpan\ndi rak lantai {floor}. Berhati-hatilah.`,
        `Catatan tentang menara yang miring\nmulai nyata sejak lantai {floor}.`,
      ],
      wisp: [
        `Lantai bergetar, kan? Lantai {floor}\ngravasinya masih belum waras.`,
        `Lihat bahan-bahan saling menarik?\nDi lantai {floor} memang begitu, hehe.`,
        `Lihat tongkat tua ini? Jejak lantai {floor}.\nPemiliknya pergi ke mana, ya?`,
      ],
      gatekeeper: [
        `Mulai lantai {floor}, tekanannya\nberbeda. Bertahanlah kuat-kuat.`,
        `Tak banyak yang mencapai ketinggian ini.\nRasakan beban lantai {floor}.`,
        `Menara perlahan miring. Mulai lantai {floor}\nterutama begitu. Tetap waspada.`,
      ],
      sprite: [
        `Bahan-bahannya jadi keras sekali!\nMungkin karena tekanan lantai {floor}.`,
        `Udara lantai {floor} terasa berat\nbahkan bagiku... susah bernapas.`,
        `Ada bau penyihir tersesat dari suatu tempat...\nLantai {floor}, sungguh!`,
      ],
      apprentice: [
        `Mulai lantai {floor}, aku juga\nmerasa sesak. Ayo pelan-pelan.`,
        `Melihat bahan-bahan bertahan sejauh ini\nmembuatku kuat... lantai {floor}, kita bisa.`,
        `Guruku pun tak pernah cerita lantai {floor}.\nMungkin kitalah yang pertama.`,
      ],
    },
    high: {
      archivist: [
        `Buku-buku di rak atas ini belum pernah\ndibaca siapa pun. Ilmu lantai {floor} tak bertuan.`,
        `Catatan lantai {floor} hanya mengulang\nsatu kata: 'kesunyian'.`,
        `Ada catatan lingkaran sihir menggambar ulang diri.\nLantai {floor} rupanya mengingat sesuatu.`,
      ],
      wisp: [
        `Cahaya bintang masuk lewat jendela!\nLantai {floor} sudah di atas awan.`,
        `Terasa udara menipis? Mulai lantai {floor}\naku pun hati-hati bernapas, hehe.`,
        `Penjaga menara jarang ke sini. Mulai lantai {floor},\nanggap saja cuma ada aku.`,
      ],
      gatekeeper: [
        `Mulai lantai {floor}, patroliku\njarang sampai kemari. Anggap dirimu sendiri.`,
        `Langkah kaki bergema sangat keras.\nLantai {floor} lama sekali kosong.`,
        `Mulai sini, tekadmu lebih penting\ndaripada gravitasi. Itulah ujian lantai {floor}.`,
      ],
      sprite: [
        `Debu di rak sini pun istimewa!\nDebu lantai {floor} berkilauan.`,
        `Bintang-bintang terasa lebih dekat dari jendela~\nLantai {floor} anehnya tenang.`,
        `Menara bergetar seperti bernapas...\nMulai lantai {floor} makin terasa, ajaib ya?`,
      ],
      apprentice: [
        `Sulit percaya kau datang sendirian\nsampai lantai {floor}. Hebat sekali.`,
        `Napasmu tidak sesak? Mulai lantai {floor}\naku juga berjalan lebih pelan.`,
        `Mulai sini semuanya terasa bergantung\npada tekadmu. Lantai {floor}, percayalah.`,
      ],
    },
    summit: {
      archivist: [
        `Catatan dunia di bawah awan tak berarti\ndi sini. Lantai {floor} bagian dari langit.`,
        `Catatan tentang cahaya puncak menara samar.\nSejak lantai {floor}, yang nyata akan tampak.`,
        `Daftar mereka yang sampai sejauh ini sangat\npendek. Sunyi lantai {floor} buktinya.`,
      ],
      wisp: [
        `Yang terdengar cuma angin, kan? Di lantai {floor}\nbenar-benar tak ada apa-apa, sunyi.`,
        `Bahan-bahan tampak ringan seperti bersayap!\nKarena sihir lantai {floor}, hehe?`,
        `Bintang-bintang lebih dekat dari jendela...\nLantai {floor} tenangnya sampai aneh.`,
      ],
      gatekeeper: [
        `Kau yang bertahan sampai lantai {floor}\nbukan magang biasa.`,
        `Menara bergetar halus. Mulai lantai {floor},\nnaiklah dengan napas tertahan.`,
        `Mulai sini, tekad mendahului aturan.\nIngat lantai {floor}.`,
      ],
      sprite: [
        `Awan ada di bawah kakimu! Lantai {floor}\nbenar-benar di atas langit, seru!`,
        `Menara bergoyang seperti bernapas...\nLantai {floor} terasa berbeda, deg-degan.`,
        `Hampir tak ada yang pernah naik sejauh ini!\nLantai {floor}, kau memang istimewa.`,
      ],
      apprentice: [
        `Sepertinya cahaya puncak menara terlihat...\nSejak lantai {floor}, aku sungguh merasakannya.`,
        `Kalau sudah sejauh ini, kau pasti\nbukan orang biasa. Lantai {floor}, aku percaya.`,
        `Hanya terdengar suara napas...\nLantai {floor}, ayo diam-diam bersama.`,
      ],
    },
    peak: {
      archivist: [
        `Puncak sudah di depan mata. Catatan lantai {floor}\nsekarang harus kutulis sendiri.`,
        `Catatan segel terakhir akan lengkap\nsetelah kau melewati lantai {floor}.`,
        `Lantai {floor}... aku pun tak mengira\nkau sampai sejauh ini. Akhirnya terlihat.`,
      ],
      wisp: [
        `Rasanya seluruh menara mengawasimu!\nMulai lantai {floor} apalagi, hehe.`,
        `Gravitasi setinggi ini bukan lagi berubah-ubah,\ntapi bergerak seolah punya kehendak.`,
        `Lantai {floor}, udaranya sudah terasa\nberbeda, kan? Hampir sampai.`,
      ],
      gatekeeper: [
        `Setelah lantai {floor}, tinggal sedikit.\nTetap fokus sampai akhir.`,
        `Ujian terakhir menara makin dekat.\nRasakan udara lantai {floor}.`,
        `Jika sudah sampai sini, tak ada jalan kembali.\nLantai {floor}, teruskan sampai akhir.`,
      ],
      sprite: [
        `Hampir sampai! Udara lantai {floor}\nbenar-benar beda, deg-degan.`,
        `Sepertinya menara mengawasimu...\nMulai lantai {floor}, aku juga gemetar.`,
        `Lantai {floor}, rasanya akhir\nsudah terlihat! Ayo bersama!`,
      ],
      apprentice: [
        `Aku masih tak percaya kau sampai\nlantai {floor}. Hampir selesai.`,
        `Segel terakhir sudah dekat...\nLantai {floor}, aku gemetar tapi percaya.`,
        `Lantai {floor}... tak kusangka\nkita sejauh ini. Ayo lihat akhirnya.`,
      ],
    },
  },
  pinnedLines: {
    30: `Mulai sini mantra sering meleset.\nGravitasi lantai {floor} mudah berubah, hati-hati.`,
    60: `Naiklah dengan hati-hati. Mulai lantai {floor},\nmenara terasa seperti berpikir sendiri.`,
    80: `Mulai sini rancangan menara berubah. Konon lantai {floor}\nsebenarnya bukan bagian asli menara ini.`,
    95: `Hampir sampai. Di balik lantai {floor},\nkau akan merasakan langsung sihir tersegel.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Aku menemukan sesuatu yang berkilau! Untukmu, ambil!` },
    { speaker: 'wisp', text: `Hehe, hadiah. Tidak sepenuhnya gratis... tapi hari ini kuberikan saja.` },
    { speaker: 'archivist', text: `Benda ini jatuh di antara rak. Sepertinya berguna bagimu.` },
    { speaker: 'gatekeeper', text: `Menara mengakui kelayakanmu untuk diuji. Terimalah ini.` },
    { speaker: 'apprentice', text: `Aku punya satu lagi tadi... ini untukmu. Semoga beruntung!` },
  ],
  itemLabels: {
    bonusMove: 'Penguat Gerakan +3',
    lineRow: 'Bahan Penghapus Baris',
    lineCol: 'Bahan Penghapus Kolom',
    crossBomb: 'Bahan Bom Silang',
    colorBomb: 'Bahan Bom Warna',
  },
  stage1: `Kita harus merebut kembali sihir yang tersegel\ndi puncak menara. Magang, mulai dari lantai pertama.`,
  stage1000: `Akhirnya kau mencapai ujung menara.\nSihir tempat ini... sepenuhnya milikmu.`,
};

const th: LangStory = {
  speakerNames: {
    archivist: 'บรรณารักษ์เฒ่า',
    wisp: 'ไฟวิญญาณเจ้าเล่ห์',
    gatekeeper: 'ผู้เฝ้าประตูหอคอย',
    sprite: 'ภูตฝุ่น',
    apprentice: 'จอมเวทฝึกหัด',
  },
  bands: {
    early: {
      archivist: [
        `บันทึกชั้น {floor} ยังไม่มี\nในชั้นหนังสือของข้า เจ้าจะเป็นคนแรกที่เขียนมัน`,
        `หนังสือยิ่งเก่า ยิ่งเริ่มเล่าจากชั้นต่ำๆ\nอย่างชั้น {floor} นี่แหละ`,
        `ใต้ฝุ่นมีตัวอักษรเก่าให้เห็น\nชั้น {floor} ก็เคยเป็นจุดเริ่มของใครบางคน`,
      ],
      wisp: [
        `ฮึฮึ เป็นชั้น {floor} ก็ใช่ว่า\nจะออมมือให้นะ ระวังเท้าด้วย`,
        `ตรงนี้มีกับดักอยู่อันหนึ่ง... จะบอกดีไหม\nเอาเถอะ ชั้น {floor} จะหยวนให้`,
        `คิดว่าชั้นต่ำๆ จะน่าเบื่อใช่ไหม?\nชั้น {floor} ก็สนุกไม่เบาเลยนะ`,
      ],
      gatekeeper: [
        `ผ่านชั้น {floor} แล้ว กฎนั้น\nเรียบง่าย อย่าประมาท`,
        `กฎแห่งหอคอยมีผลเท่ากัน\nตั้งแต่ชั้น {floor} ไม่มีข้อยกเว้น`,
        `มีหลายคนหยุดอยู่ที่ชั้น {floor}\nข้าหวังว่าเจ้าจะแตกต่าง`,
      ],
      sprite: [
        `ดูฝุ่นนี่สิ! ชั้น {floor}\nมีเพื่อนของข้าอยู่เต็มไปหมดเลย`,
        `มีรอยร้าวเล็กๆ ด้วย~ ชั้น {floor}\nก็คงซ่อนความลับไว้สักอย่าง`,
        `ฮิฮิ บันไดชั้น {floor}\nเหยียบทีไรก็เสียงไม่เหมือนกัน สนุกจัง`,
      ],
      apprentice: [
        `ตอนข้าขึ้นถึงชั้น {floor} มือก็\nสั่นเหมือนกัน เจ้าเองก็ใช่ไหม?`,
        `ชั้น {floor} ข้ายังจำได้ดี\nไม่ต้องเกร็ง ค่อยๆ ไปนะ`,
        `เหมือนได้ปีนไปด้วยกันเลย ชั้น {floor},\nเราสองคนยังเป็นมือใหม่กันอยู่`,
      ],
    },
    rising: {
      archivist: [
        `ตั้งแต่ชั้น {floor} ตัวอักษรก็แปลกตา\nเป็นคำเตือนในภาษาโบราณ`,
        `ได้ยินว่าบันทึกคาถาที่ล้มเหลว\nหลงเหลืออยู่ที่ไหนสักแห่งในชั้น {floor}`,
        `บันทึกบนความสูงนี้เสียหายมาก\nความจริงของชั้น {floor} ยังไม่สมบูรณ์`,
      ],
      wisp: [
        `แรงโน้มถ่วงคงจะพลิกอีกแล้ว\nระวังให้ดีที่ชั้น {floor}!`,
        `เห็นวัตถุดิบพวกนั้นเรืองแสงไหม?\nตั้งแต่ชั้น {floor} พลังเวทเข้มขึ้นนะ`,
        `เอี๊ยดอ๊าด ได้ยินบันไดชั้น {floor}\nร้องอย่างไม่สบายใจไหม?`,
      ],
      gatekeeper: [
        `ตั้งแต่ชั้น {floor} จงระวังเป็นสองเท่า\nช่วงนี้หอคอยแปรปรวนยิ่งนัก`,
        `ร่องรอยของผู้ท้าชิงที่หยุดที่นี่\nสลักอยู่บนผนัง จงจำชั้น {floor} ไว้`,
        `อากาศของชั้น {floor} ต่างออกไป\nผู้ประมาทจะถูกแรงโน้มถ่วงกลืนกิน`,
      ],
      sprite: [
        `ว้าว ภาพบนผนังชั้น {floor}\nดูเหมือนกำลังขยับเลย!`,
        `เทียนสั่นทั้งที่ไม่มีลม...\nชั้น {floor} ต้องมีอะไรแน่ ตึกตักเลย`,
        `ตั้งแต่ชั้น {floor} ตัวหนังสือก็ประหลาด\nข้าเองก็อ่านไม่ออก ฮิฮิ`,
      ],
      apprentice: [
        `มาถึงชั้น {floor} แล้วเหรอ...\nเหมือนเร็วกว่าเราเลย พูดตรงๆ ก็อิจฉานิดหน่อย`,
        `จากตรงนี้เริ่มตึงเครียดจริงๆ\nชั้น {floor} ระวังไปด้วยกันนะ`,
        `อาจารย์บอกว่าตั้งแต่ชั้น {floor}\nต้องระวังเป็นพิเศษ จำไว้นะ`,
      ],
    },
    deep: {
      archivist: [
        `ในบันทึกอากาศของชั้น {floor}\nมีแต่คำว่า 'หนัก' ซ้ำไปมา`,
        `เรื่องเล่าของจอมเวทผู้หลงทาง\nยังอยู่ในชั้นหนังสือชั้น {floor} ระวังด้วย`,
        `บันทึกว่าหอคอยเริ่มเอียง\nปรากฏชัดตั้งแต่ชั้น {floor}`,
      ],
      wisp: [
        `ใต้เท้าสั่นใช่ไหม? ชั้น {floor}\nแรงโน้มถ่วงยังไม่เข้าที่เข้าทางเลย`,
        `ดูสิ วัตถุดิบดึงดูดกันเอง\nชั้น {floor} ยิ่งเป็นแบบนั้น ฮึฮึ`,
        `เห็นไม้เท้าเก่านี่ไหม? ร่องรอยของชั้น {floor}\nเจ้าของหายไปไหนกันนะ`,
      ],
      gatekeeper: [
        `ตั้งแต่ชั้น {floor} แรงกดดัน\nจะต่างออกไป จงยืนหยัดให้มั่น`,
        `มีไม่มากที่ขึ้นมาถึงความสูงนี้\nจงสัมผัสน้ำหนักของชั้น {floor}`,
        `หอคอยค่อยๆ เอียง ตั้งแต่ชั้น {floor}\nยิ่งเป็นเช่นนั้น จงระวัง`,
      ],
      sprite: [
        `วัตถุดิบตรงนี้แข็งขึ้นมากเลย!\nคงเพราะแรงกดดันของชั้น {floor}`,
        `ข้าเองก็รู้สึกว่าอากาศชั้น {floor}\nหนักนิดๆ... หายใจลำบากจัง`,
        `มีกลิ่นจอมเวทหลงทางลอยมาจากที่ไหนสักแห่ง...\nชั้น {floor} จริงๆ นะ!`,
      ],
      apprentice: [
        `ตั้งแต่ชั้น {floor} ข้าเองก็\nเหมือนหายใจไม่ทัน ค่อยๆ ไปกันเถอะ`,
        `เห็นวัตถุดิบที่ทนมาถึงนี่แล้ว\nข้าก็มีกำลังใจ... ชั้น {floor} ทำได้แน่`,
        `อาจารย์ก็ไม่เคยเล่าเรื่องชั้น {floor}\nบางทีเราอาจเป็นกลุ่มแรกก็ได้`,
      ],
    },
    high: {
      archivist: [
        `หนังสือบนชั้นสูงกว่านี้ยังไม่มีใคร\nอ่านได้ ความรู้ของชั้น {floor} ไร้เจ้าของ`,
        `บันทึกชั้น {floor} มีแต่คำว่า\n'โดดเดี่ยว' ซ้ำอยู่เท่านั้น`,
        `มีบันทึกว่าวงเวทวาดตัวเองใหม่\nชั้น {floor} คงกำลังจดจำบางสิ่ง`,
      ],
      wisp: [
        `แสงดาวลอดเข้ามาทางหน้าต่าง!\nชั้น {floor} อยู่เหนือเมฆแล้วนะ`,
        `รู้สึกไหมว่าอากาศบาง? ตั้งแต่ชั้น {floor}\nข้าเองก็ต้องระวังลมหายใจ ฮึฮึ`,
        `แม้แต่ผู้เฝ้าหอคอยก็ไม่ค่อยขึ้นมาที่นี่\nตั้งแต่ชั้น {floor} คิดเสียว่ามีแค่ข้า`,
      ],
      gatekeeper: [
        `ตั้งแต่ชั้น {floor} ข้าก็ลาดตระเวนน้อยลง\nจงคิดว่าเจ้าอยู่ลำพัง`,
        `เสียงฝีเท้าก้องดังผิดปกติ\nชั้น {floor} ว่างเปล่ามานานแล้ว`,
        `จากนี้ เจตจำนงของเจ้าสำคัญกว่า\nแรงโน้มถ่วง นั่นคือบททดสอบชั้น {floor}`,
      ],
      sprite: [
        `ฝุ่นบนชั้นหนังสือที่นี่ก็พิเศษ!\nฝุ่นชั้น {floor} เป็นประกายเลย`,
        `ดวงดาวเหมือนอยู่ใกล้กว่าหน้าต่าง~\nชั้น {floor} เงียบแปลกๆ`,
        `หอคอยสั่นเหมือนกำลังหายใจ...\nตั้งแต่ชั้น {floor} ยิ่งชัด น่าอัศจรรย์ไหม?`,
      ],
      apprentice: [
        `ไม่น่าเชื่อว่าเจ้ามาคนเดียว\nถึงชั้น {floor} ได้ สุดยอดเลย`,
        `หายใจไม่ทันหรือเปล่า? ตั้งแต่ชั้น {floor}\nข้าเองก็เดินช้าลงเหมือนกัน`,
        `จากนี้คงเป็นเรื่องเจตจำนงของเจ้าจริงๆ\nชั้น {floor} เชื่อมันเถอะ`,
      ],
    },
    summit: {
      archivist: [
        `บันทึกโลกใต้เมฆไร้ความหมายที่นี่\nชั้น {floor} เป็นส่วนหนึ่งของท้องฟ้า`,
        `บันทึกเรื่องแสงบนยอดหอคอยเลือนราง\nตั้งแต่ชั้น {floor} ของจริงจะปรากฏ`,
        `รายชื่อผู้มาถึงที่นี่สั้นมาก\nความเงียบของชั้น {floor} คือหลักฐาน`,
      ],
      wisp: [
        `ได้ยินแค่เสียงลมใช่ไหม? ชั้น {floor}\nไม่มีอะไรจริงๆ เงียบจัง`,
        `วัตถุดิบดูเบาเหมือนมีปีก!\nเพราะเวทมนตร์ของชั้น {floor} หรือเปล่า ฮึฮึ`,
        `ดวงดาวอยู่ใกล้กว่าหน้าต่าง...\nชั้น {floor} สงบนิ่งจนประหลาด`,
      ],
      gatekeeper: [
        `ผู้ที่ยืนหยัดถึงชั้น {floor}\nไม่ใช่ศิษย์ฝึกหัดธรรมดา`,
        `หอคอยสั่นไหวอย่างละเอียด ตั้งแต่ชั้น {floor}\nต้องกลั้นลมหายใจขึ้นไป`,
        `จากนี้ ความตั้งใจมาก่อนกฎ\nจงจำชั้น {floor} ไว้`,
      ],
      sprite: [
        `เมฆอยู่ใต้เท้าแล้ว! ชั้น {floor}\nอยู่เหนือฟ้าจริงๆ ตื่นเต้นจัง`,
        `หอคอยไหวเหมือนหายใจ...\nชั้น {floor} ต่างออกไป ใจเต้นแรงเลย`,
        `แทบไม่มีใครเคยขึ้นมาถึงนี่!\nชั้น {floor} เจ้าดูพิเศษจริงๆ`,
      ],
      apprentice: [
        `เหมือนเห็นแสงยอดหอคอยแล้ว...\nตั้งแต่ชั้น {floor} รู้สึกจริงๆ`,
        `ถ้ามาถึงขนาดนี้ เจ้า\nคงไม่ธรรมดาแล้ว ชั้น {floor} ข้าจะเชื่อด้วย`,
        `ได้ยินแค่เสียงลมหายใจ...\nชั้น {floor} ไปเงียบๆ ด้วยกันนะ`,
      ],
    },
    peak: {
      archivist: [
        `ยอดอยู่ตรงหน้าแล้ว บันทึกของชั้น {floor}\nต่อจากนี้ข้าคงต้องเขียนเอง`,
        `บันทึกเรื่องผนึกสุดท้าย\nจะสมบูรณ์เมื่อผ่านชั้น {floor}`,
        `ชั้น {floor}... ข้าเองก็ไม่คิดว่า\nเจ้าจะมาถึงไกลเพียงนี้ เห็นจุดจบแล้ว`,
      ],
      wisp: [
        `เหมือนทั้งหอคอยกำลังจ้องเจ้าอยู่!\nตั้งแต่ชั้น {floor} ยิ่งชัด ฮึฮึ`,
        `แรงโน้มถ่วงที่สูงขนาดนี้ไม่ใช่แค่แปรปรวน\nแต่มันขยับเหมือนมีเจตจำนง ระวังนะ`,
        `ชั้น {floor} อากาศเริ่มต่างไปแล้ว\nรู้สึกไหม? ใกล้ถึงแล้ว`,
      ],
      gatekeeper: [
        `เมื่อผ่านชั้น {floor} ก็เหลือไม่มาก\nจงตั้งสมาธิจนถึงท้ายที่สุด`,
        `บททดสอบสุดท้ายของหอคอยใกล้เข้ามา\nจงสัมผัสอากาศของชั้น {floor}`,
        `หากมาถึงที่นี่แล้ว ย้อนกลับไม่ได้\nชั้น {floor} ไปให้ถึงที่สุด`,
      ],
      sprite: [
        `เกือบถึงแล้ว! อากาศชั้น {floor}\nต่างไปหมดเลย ใจเต้นแรงจัง`,
        `เหมือนหอคอยกำลังมองเจ้า...\nตั้งแต่ชั้น {floor} ข้าเองก็สั่น`,
        `ชั้น {floor} เหมือนเห็น\nปลายทางแล้ว! ไปด้วยกันนะ!`,
      ],
      apprentice: [
        `ยังไม่อยากเชื่อว่าเจ้ามาถึง\nชั้น {floor} แล้ว เกือบถึงแล้วนะ`,
        `ผนึกสุดท้ายอยู่ใกล้แล้ว...\nชั้น {floor} ข้าก็สั่น แต่เชื่อมั่น`,
        `ชั้น {floor}... ไม่คิดเลยว่า\nเราจะมาถึงนี่ ไปดูตอนจบด้วยกัน`,
      ],
    },
  },
  pinnedLines: {
    30: `จากนี้คาถาจะคลาดเคลื่อนบ่อย\nแรงโน้มถ่วงของชั้น {floor} แปรปรวน จงระวัง`,
    60: `จงปีนขึ้นไปอย่างระมัดระวัง ตั้งแต่ชั้น {floor}\nหอคอยเหมือนกำลังคิดเอง`,
    80: `จากนี้แม้แต่ผังของหอคอยก็เปลี่ยนไป ว่ากันว่าชั้น {floor}\nเดิมทีไม่ใช่ส่วนหนึ่งของหอคอยนี้`,
    95: `เกือบถึงแล้ว เหนือชั้น {floor} ไป\nเจ้าจะสัมผัสเวทมนตร์ที่ถูกผนึกได้โดยตรง`,
  },
  eventLines: [
    { speaker: 'sprite', text: `เก็บของวิบวับได้ละ! ให้เจ้านะ รับไปสิ!` },
    { speaker: 'wisp', text: `ฮึฮึ ของขวัญน่ะ ไม่ได้ฟรีหรอกนะ... แต่วันนี้ให้เฉยๆ ก็ได้` },
    { speaker: 'archivist', text: `ของชิ้นนี้ตกอยู่ในชั้นหนังสือ คงมีประโยชน์ต่อเจ้า` },
    { speaker: 'gatekeeper', text: `หอคอยยอมรับว่าเจ้ามีคุณสมบัติรับการทดสอบ จงรับสิ่งนี้ไป` },
    { speaker: 'apprentice', text: `ข้ายังมีอีกอันหนึ่ง... เจ้าเอาไปเถอะ ขอให้โชคดีนะ!` },
  ],
  itemLabels: {
    bonusMove: 'บูสเตอร์เดิน +3',
    lineRow: 'วัตถุดิบลบแถว',
    lineCol: 'วัตถุดิบลบคอลัมน์',
    crossBomb: 'วัตถุดิบระเบิดกากบาท',
    colorBomb: 'วัตถุดิบระเบิดสี',
  },
  stage1: `เราต้องทวงเวทมนตร์ที่ถูกผนึก\nบนยอดหอคอยกลับมา ศิษย์ฝึกหัด เริ่มจากชั้นแรกกันเถอะ`,
  stage1000: `ในที่สุดเจ้าก็มาถึงปลายหอคอย\nพลังเวทของที่แห่งนี้... เป็นของเจ้าโดยสมบูรณ์`,
};

const vi: LangStory = {
  speakerNames: {
    archivist: 'Thủ thư già',
    wisp: 'Đốm lửa tinh quái',
    gatekeeper: 'Người gác cổng tháp',
    sprite: 'Tiên bụi',
    apprentice: 'Pháp sư tập sự',
  },
  bands: {
    early: {
      archivist: [
        `Ghi chép về tầng {floor} còn chưa có\ntrên kệ của ta. Ngươi sẽ là người viết đầu tiên.`,
        `Sách càng cổ càng bắt đầu từ những tầng thấp,\nnhư tầng {floor} vậy.`,
        `Dưới lớp bụi hiện ra nét chữ cũ.\nTầng {floor} cũng từng là khởi đầu của ai đó.`,
      ],
      wisp: [
        `Hì hì, đừng tưởng tầng {floor}\nthì được nương tay. Cẩn thận bước chân.`,
        `Ở đây có một cái bẫy... nói cho ngươi không nhỉ?\nThôi, tầng {floor} nên ta bỏ qua.`,
        `Tưởng tầng thấp thì chán à?\nTầng {floor} cũng thú vị ra trò đấy.`,
      ],
      gatekeeper: [
        `Đã qua tầng {floor}. Quy tắc\nrất đơn giản: chớ lơ là.`,
        `Luật của tháp áp dụng như nhau\ntừ tầng {floor}. Không ngoại lệ.`,
        `Nhiều kẻ đã dừng ở tầng {floor}.\nTa mong ngươi khác họ.`,
      ],
      sprite: [
        `Nhìn bụi này xem! Tầng {floor}\ncó rất nhiều bạn của ta sống ở đây.`,
        `Có một vết nứt nhỏ này~ tầng {floor}\nchắc cũng giấu một bí mật.`,
        `Hi hi, cầu thang tầng {floor}\nmỗi bước lại phát ra một âm khác nhau!`,
      ],
      apprentice: [
        `Khi lên tới tầng {floor}, tay ta\ncũng run. Ngươi cũng vậy nhỉ?`,
        `Tầng {floor} thì ta còn nhớ.\nĐừng căng thẳng, cứ chậm rãi thôi.`,
        `Cảm giác như ta đang leo cùng ngươi. Tầng {floor},\ncả hai ta vẫn còn là người mới.`,
      ],
    },
    rising: {
      archivist: [
        `Từ tầng {floor}, chữ viết trở nên xa lạ.\nĐó là lời cảnh báo bằng cổ ngữ.`,
        `Nghe nói ghi chép về những bùa chú thất bại\ncòn sót lại đâu đó ở tầng {floor}.`,
        `Ghi chép ở độ cao này hư hại nhiều.\nSự thật của tầng {floor} vẫn chưa trọn vẹn.`,
      ],
      wisp: [
        `Trọng lực lại sắp đảo chiều rồi,\nnhớ cẩn thận ở tầng {floor}!`,
        `Thấy nguyên liệu phát sáng không?\nTừ tầng {floor}, ma lực đặc hơn đấy.`,
        `Cọt kẹt, nghe cầu thang tầng {floor}\nrên lên bất an không?`,
      ],
      gatekeeper: [
        `Từ tầng {floor}, hãy cảnh giác gấp đôi.\nĐây là đoạn tháp thất thường.`,
        `Dấu tích của những kẻ dừng lại ở đây\nkhắc trên tường. Hãy nhớ tầng {floor}.`,
        `Không khí tầng {floor} khác hẳn.\nKẻ lơ là sẽ bị trọng lực nuốt chửng.`,
      ],
      sprite: [
        `Oa, tranh trên tường tầng {floor}\ntrông như đang chuyển động!`,
        `Nến lung lay dù chẳng có gió...\nTầng {floor} có gì đó, tim đập thình thịch.`,
        `Từ tầng {floor}, chữ nghĩa kỳ quặc lắm.\nTa cũng chẳng đọc được, hi hi.`,
      ],
      apprentice: [
        `Ngươi đã tới tầng {floor} rồi...\nHình như nhanh hơn ta, nói thật là hơi ghen tị.`,
        `Từ đây căng thẳng thật đấy.\nTầng {floor}, cùng cẩn thận nhé.`,
        `Thầy ta dặn từ tầng {floor}\nphải đặc biệt coi chừng. Nhớ đấy.`,
      ],
    },
    deep: {
      archivist: [
        `Trong ghi chép khí quyển tầng {floor},\nchỉ lặp đi lặp lại chữ 'nặng'.`,
        `Câu chuyện về một pháp sư lạc đường\ncòn nằm trên kệ tầng {floor}. Cẩn thận.`,
        `Ghi chép về việc tháp nghiêng\nbắt đầu hiện rõ từ tầng {floor}.`,
      ],
      wisp: [
        `Dưới chân rung lên nhỉ? Tầng {floor}\ntrọng lực vẫn chưa bình thường đâu.`,
        `Nhìn nguyên liệu kéo hút lẫn nhau kìa,\nriêng tầng {floor} hay vậy lắm, hì hì.`,
        `Thấy cây trượng cũ này không? Dấu vết tầng {floor}.\nChủ nó đi đâu rồi nhỉ?`,
      ],
      gatekeeper: [
        `Từ tầng {floor}, áp lực\nsẽ khác đi. Hãy đứng cho vững.`,
        `Không nhiều kẻ tới được độ cao này.\nHãy cảm nhận sức nặng của tầng {floor}.`,
        `Tháp đang nghiêng từng chút một. Từ tầng {floor}\nđặc biệt rõ. Hãy cảnh giác.`,
      ],
      sprite: [
        `Nguyên liệu ở đây cứng hẳn lên!\nChắc do áp lực của tầng {floor}.`,
        `Ngay cả ta cũng thấy không khí tầng {floor}\nhơi nặng... khó thở quá.`,
        `Có mùi pháp sư lạc đường đâu đó...\nTầng {floor}, thật đấy!`,
      ],
      apprentice: [
        `Từ tầng {floor}, ta cũng\nthấy hụt hơi. Đi chậm thôi.`,
        `Nhìn nguyên liệu trụ được tới đây\nlàm ta có sức hơn... tầng {floor}, ta làm được.`,
        `Thầy ta cũng chưa từng kể về tầng {floor}.\nCó lẽ chúng ta là người đầu tiên.`,
      ],
    },
    high: {
      archivist: [
        `Những sách trên kệ cao này chưa ai\nđọc được. Tri thức tầng {floor} không có chủ.`,
        `Ghi chép tầng {floor} chỉ lặp lại\nmột chữ: 'cô độc'.`,
        `Có ghi rằng ma trận tự vẽ lại chính mình.\nCó vẻ tầng {floor} đang nhớ điều gì đó.`,
      ],
      wisp: [
        `Ánh sao tràn qua cửa sổ!\nTầng {floor} đã ở trên mây rồi.`,
        `Cảm thấy không khí loãng không? Từ tầng {floor}\nta cũng phải giữ hơi thở, hì hì.`,
        `Ngay cả người gác tháp cũng ít tới đây.\nTừ tầng {floor}, cứ nghĩ chỉ còn ta bên ngươi.`,
      ],
      gatekeeper: [
        `Từ tầng {floor}, ta tuần tra\nthưa dần. Hãy xem như ngươi đơn độc.`,
        `Tiếng bước chân vang lớn lạ thường.\nTầng {floor} đã trống vắng từ lâu.`,
        `Từ đây, ý chí của ngươi quan trọng hơn\ntrọng lực. Đó là phép thử của tầng {floor}.`,
      ],
      sprite: [
        `Ngay cả bụi trên kệ cũng đặc biệt!\nBụi tầng {floor} lấp lánh đó.`,
        `Các vì sao như gần hơn cả cửa sổ~\nTầng {floor} yên tĩnh kỳ lạ.`,
        `Tháp rung như đang thở...\nTừ tầng {floor} càng rõ, lạ ghê nhỉ?`,
      ],
      apprentice: [
        `Không tin nổi ngươi đã một mình\nđến tầng {floor}. Giỏi thật.`,
        `Có thấy hụt hơi không? Từ tầng {floor}\nta cũng đi chậm lại.`,
        `Từ đây thật sự giống như phụ thuộc\nvào ý chí của ngươi. Tầng {floor}, hãy tin nó.`,
      ],
    },
    summit: {
      archivist: [
        `Ghi chép về thế giới dưới mây\nở đây không còn nghĩa. Tầng {floor} thuộc về bầu trời.`,
        `Ghi chép về ánh sáng đỉnh tháp rất mờ.\nTừ tầng {floor}, điều thật sẽ hiện ra.`,
        `Danh sách những ai tới được đây rất ngắn.\nSự tĩnh lặng tầng {floor} là bằng chứng.`,
      ],
      wisp: [
        `Chỉ nghe tiếng gió thôi nhỉ? Tầng {floor}\nthật sự chẳng có gì, yên lặng quá.`,
        `Nguyên liệu trông nhẹ như mọc cánh!\nDo ma lực tầng {floor} chăng, hì hì.`,
        `Các vì sao gần hơn cả cửa sổ...\nTầng {floor} yên ắng đến lạ.`,
      ],
      gatekeeper: [
        `Kẻ trụ được tới tầng {floor}\nkhông phải tập sự tầm thường.`,
        `Tháp khẽ run. Từ tầng {floor},\nhãy nín thở mà leo lên.`,
        `Từ đây, quyết tâm đi trước quy tắc.\nHãy ghi nhớ tầng {floor}.`,
      ],
      sprite: [
        `Mây ở dưới chân rồi! Tầng {floor}\nthật sự trên trời, thích quá!`,
        `Tháp lắc lư như đang thở...\nTầng {floor} khác hẳn, tim đập rộn ràng.`,
        `Hầu như chẳng ai leo tới đây!\nTầng {floor}, ngươi đặc biệt thật đấy.`,
      ],
      apprentice: [
        `Hình như ta thấy ánh sáng đỉnh tháp...\nTừ tầng {floor}, cảm giác ấy thật rõ.`,
        `Nhìn ngươi tới được đây, chắc ngươi\nkhông bình thường đâu. Tầng {floor}, ta cũng tin.`,
        `Chỉ còn nghe tiếng thở...\nTầng {floor}, cùng đi thật khẽ nhé.`,
      ],
    },
    peak: {
      archivist: [
        `Đỉnh đã ở ngay trước mắt. Ghi chép tầng {floor}\ngiờ phải do chính ta viết.`,
        `Ghi chép về phong ấn cuối cùng\nsẽ hoàn tất khi vượt qua tầng {floor}.`,
        `Tầng {floor}... chính ta cũng không ngờ\nngươi tới được đây. Đã thấy đoạn kết rồi.`,
      ],
      wisp: [
        `Cứ như cả tòa tháp đang nhìn ngươi!\nTừ tầng {floor} càng đúng thế, hì hì.`,
        `Trọng lực ở độ cao này không còn thất thường,\nnó chuyển động như có ý chí riêng. Cẩn thận.`,
        `Tầng {floor}, không khí đã khác rồi\nngươi cảm thấy chứ? Gần tới nơi rồi.`,
      ],
      gatekeeper: [
        `Qua tầng {floor} là không còn bao xa.\nHãy tập trung tới phút cuối.`,
        `Thử thách cuối cùng của tháp đang gần.\nHãy cảm nhận không khí tầng {floor}.`,
        `Đã tới đây thì không thể quay lại.\nTầng {floor}, đi tới tận cùng.`,
      ],
      sprite: [
        `Gần tới rồi! Không khí tầng {floor}\nkhác hẳn, tim đập thình thịch.`,
        `Hình như tháp đang nhìn ngươi...\nTừ tầng {floor}, ta cũng run theo.`,
        `Tầng {floor}, ta thấy như\nđã nhìn được đoạn cuối! Cùng đi nào!`,
      ],
      apprentice: [
        `Ta vẫn không tin ngươi đã tới\nTầng {floor}. Gần xong rồi.`,
        `Phong ấn cuối cùng đang ở gần...\nTầng {floor}, ta run nhưng vẫn tin.`,
        `Tầng {floor}... không ngờ chúng ta\nđi xa đến vậy. Cùng xem kết thúc nhé.`,
      ],
    },
  },
  pinnedLines: {
    30: `Từ đây bùa chú sẽ thường xuyên lệch hướng.\nTrọng lực tầng {floor} thất thường, hãy cẩn thận.`,
    60: `Hãy leo lên thật cẩn thận. Từ tầng {floor},\ntháp như đang tự suy nghĩ.`,
    80: `Từ đây, bản thiết kế của tháp cũng đổi khác. Có lời rằng tầng {floor}\nvốn không phải một phần của tòa tháp này.`,
    95: `Gần tới rồi. Bên kia tầng {floor},\nngươi sẽ trực tiếp cảm nhận ma thuật bị phong ấn.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Ta nhặt được thứ lấp lánh! Cho ngươi đó, nhận đi!` },
    { speaker: 'wisp', text: `Hì hì, quà đấy. Không hẳn miễn phí đâu... nhưng hôm nay ta cho không.` },
    { speaker: 'archivist', text: `Một món đồ rơi giữa các kệ sách. Nó sẽ hữu dụng với ngươi.` },
    { speaker: 'gatekeeper', text: `Tòa tháp đã công nhận ngươi đủ tư cách chịu thử thách. Hãy nhận lấy.` },
    { speaker: 'apprentice', text: `Ta còn một cái nữa... ngươi lấy đi. Chúc may mắn!` },
  ],
  itemLabels: {
    bonusMove: 'Tăng +3 lượt',
    lineRow: 'Nguyên liệu xóa hàng',
    lineCol: 'Nguyên liệu xóa cột',
    crossBomb: 'Nguyên liệu bom chữ thập',
    colorBomb: 'Nguyên liệu bom màu',
  },
  stage1: `Ta phải lấy lại ma thuật bị phong ấn\ntrên đỉnh tháp. Tập sự, nếu sẵn sàng thì bắt đầu tầng đầu tiên.`,
  stage1000: `Cuối cùng ngươi đã chạm tới tận cùng tòa tháp.\nMa lực nơi này... hoàn toàn thuộc về ngươi.`,
};

const tr: LangStory = {
  speakerNames: {
    archivist: 'Eski Arşivci',
    wisp: 'Aldatıcı Işık',
    gatekeeper: 'Kule Muhafızı',
    sprite: 'Toz Perisi',
    apprentice: 'Çırak Büyücü',
  },
  bands: {
    early: {
      archivist: [
        `{floor}. kat henüz raflarımda yok.\nOnun öyküsünü ilk sen yazıyorsun.`,
        `En eski kitaplar {floor}. kat gibi\naşağı katlardan başlar; herkes bir yerden başlar.`,
        `Tozun altında solmuş mürekkep...\n{floor}. kat da bir zamanlar birinin başlangıcıydı.`,
      ],
      wisp: [
        `Heh, {floor}. kat diye merhamet bekleme.\nAdımını kollasan iyi olur.`,
        `Burada bir tuzak var... söylesem mi?\nNeyse, {floor}. kat diye görmezden geleyim.`,
        `Alt kat sıkıcı olur sandın, değil mi?\n{floor}. katın da dişleri var.`,
      ],
      gatekeeper: [
        `{floor}. kat geçildi. Kural basittir:\nasla gardını indirme.`,
        `Kulenin yasası {floor}. kattan itibaren\naynı sertlikle işler. İstisna yoktur.`,
        `{floor}. katta duran çok oldu.\nSenin farklı olmanı umarım.`,
      ],
      sprite: [
        `Şu toza bak! {floor}. katta\nne çok arkadaşım yaşıyor.`,
        `Burada küçük bir çatlak var~ {floor}. kat bile\nbir sır saklıyor gibi.`,
        `Hehe, {floor}. katın merdivenleri\nher adımda başka ses çıkarıyor!`,
      ],
      apprentice: [
        `{floor}. kata tırmanırken benim de\nellerim titremişti. Seninki de mi?`,
        `{floor}. katı yeterince iyi hatırlıyorum.\nGerilme, yavaş yavaş çıkalım.`,
        `Sanki birlikte tırmanıyoruz. {floor}. kat...\nikimiz de hâlâ acemiyiz.`,
      ],
    },
    rising: {
      archivist: [
        `{floor}. kattan sonra harfler tuhaflaşır:\neski bir dilde uyarılar bunlar.`,
        `Başarısız büyülerin kayıtlarının\n{floor}. katta bir yerde kaldığı söylenir.`,
        `Bu yükseklikte kayıtlar yaralıdır.\n{floor}. katın hakikati hâlâ eksik.`,
      ],
      wisp: [
        `Yerçekimi yine ters dönecek galiba,\n{floor}. katta dikkatli ol!`,
        `Malzemelerin parladığını görüyor musun?\n{floor}. kattan sonra büyü iyice koyulaşır.`,
        `Gıcır gıcır... {floor}. katın merdivenleri\nhuzursuzca inliyor, duyuyor musun?`,
      ],
      gatekeeper: [
        `{floor}. kattan sonra nöbetini ikiye katla.\nKule burada kaprislenir.`,
        `Burada kalanların izleri duvarlara kazınmış.\n{floor}. katı aklında tut.`,
        `{floor}. katın havası başkadır.\nDalgın olanı yerçekimi yutar.`,
      ],
      sprite: [
        `Vay, {floor}. kattaki duvar resimleri\nsanki kıpırdıyor gibi!`,
        `Rüzgâr yokken mum titriyor...\n{floor}. katta bir şey var, içim pır pır.`,
        `{floor}. kattan sonra yazılar tuhaflaşıyor.\nBen bile okuyamıyorum, hehe.`,
      ],
      apprentice: [
        `Şimdiden {floor}. kata geldin...\nbenden hızlısın, doğrusu biraz kıskandım.`,
        `Buradan sonra insan geriliyor.\n{floor}. katta birlikte dikkatli olalım.`,
        `Hocam {floor}. kat için özellikle\nsakın dikkatini dağıtma demişti. Unutma.`,
      ],
    },
    deep: {
      archivist: [
        `{floor}. katın hava kayıtlarında\nsadece "ağır" sözcüğü tekrar edilmiş.`,
        `Kayıp bir büyücünün hikâyesi\n{floor}. katın raflarında oyalanır. Dikkatli ol.`,
        `Kulenin eğilmeye başladığına dair kayıtlar\n{floor}. kattan itibaren gerçekten görünür.`,
      ],
      wisp: [
        `Zeminin titrediğini hissediyor musun?\n{floor}. kat yerçekimini hâlâ toparlayamadı.`,
        `Malzemeler birbirine nasıl çekiliyor, bak.\n{floor}. katta hep böyle, heh.`,
        `Şu eski asayı görüyor musun? {floor}. kattan kalma.\nSahibi nereye kayboldu acaba?`,
      ],
      gatekeeper: [
        `{floor}. kattan sonra basınç değişir.\nKendini sağlam tut.`,
        `Bu yüksekliğe çok az kişi ulaştı.\n{floor}. katın ağırlığını hisset.`,
        `Kule azar azar eğiliyor.\nÖzellikle {floor}. kattan sonra tetikte kal.`,
      ],
      sprite: [
        `Malzemeler şimdi çok sert geliyor!\n{floor}. katın basıncı yüzündendir.`,
        `Ben bile {floor}. katın havasını ağır buluyorum...\nnefes almak zor.`,
        `Bir yerlerde kayıp bir büyücünün kokusu var...\n{floor}. katta, gerçekten söylüyorum!`,
      ],
      apprentice: [
        `{floor}. kattan sonra ben bile\nnefes nefese kalıyorum. Yavaş gidelim.`,
        `Malzemelerin buraya kadar tutunması\nbana güç veriyor... {floor}. kat, yapabiliriz.`,
        `Hocam bile {floor}. kattan hiç söz etmedi.\nBelki de buraya ilk gelen biziz.`,
      ],
    },
    high: {
      archivist: [
        `Buradaki kitapları kimse okumamış.\n{floor}. katın bilgisi sahipsiz kalmış.`,
        `{floor}. katın kayıtları tek bir sözü yineler:\n"yalnızlık".`,
        `Bir kayıt, mühürlerin kendini yeniden çizdiğini söyler.\n{floor}. kat bir şey hatırlıyor olmalı.`,
      ],
      wisp: [
        `Yıldız ışığı pencereden taşıyor!\n{floor}. kat çoktan bulutların üstünde.`,
        `Havanın inceldiğini hissediyor musun? {floor}. kattan sonra\nben bile nefesime dikkat ederim, heh.`,
        `Kule muhafızı bile buraya nadiren gelir.\n{floor}. kattan sonra yalnız benimlesin.`,
      ],
      gatekeeper: [
        `{floor}. kattan sonra devriyelerim seyrekleşir.\nKendini yalnız say.`,
        `Ayak sesleri olağandışı yüksek yankılanıyor.\n{floor}. kat çağlardır boş durdu.`,
        `Buradan sonra iraden yerçekiminden önemlidir.\n{floor}. kat tam da bunu sınar.`,
      ],
      sprite: [
        `Buradaki rafların tozu bile özel!\n{floor}. katın tozu parıldıyor.`,
        `Yıldızlar pencerelerden bile yakın sanki~\n{floor}. kat garip biçimde sessiz.`,
        `Kule nefes alır gibi titriyor...\n{floor}. kattan sonra daha da belli, tuhaf değil mi?`,
      ],
      apprentice: [
        `{floor}. kata tek başına gelmen\nhâlâ aklıma sığmıyor. Harikasın.`,
        `Nefesin daralıyor mu? {floor}. katta\nben de hâlâ yavaş yürüyorum.`,
        `Buradan sonrası gerçekten iradene bağlı gibi.\n{floor}. kat, ona güven.`,
      ],
    },
    summit: {
      archivist: [
        `Bulutların altındaki dünyanın kayıtları burada\nanlamını yitirir. {floor}. kat göğe aittir.`,
        `Kulenin tepesindeki ışığa dair kayıtlar bulanık.\nHakikat {floor}. kattan sonra görünecek.`,
        `Buraya ulaşanların listesi çok kısadır.\n{floor}. katın sessizliği bunun kanıtı.`,
      ],
      wisp: [
        `Sadece rüzgârı duyuyorsun, değil mi?\n{floor}. katta gerçekten hiçbir şey yok, fazla sessiz.`,
        `Malzemeler tüy gibi hafif görünüyor!\n{floor}. katın büyüsündendir, heh.`,
        `Yıldızlar pencereden daha yakın...\n{floor}. kat ürkütecek kadar sakin.`,
      ],
      gatekeeper: [
        `{floor}. kata kadar dayanmak\nsıradan bir çırak işi değildir.`,
        `Kule ince ince titriyor. {floor}. katta\nnefesini tut ve tırmanmaya devam et.`,
        `Buradan sonra kurallardan önce kararlılık gelir.\n{floor}. katı zihnine kazı.`,
      ],
      sprite: [
        `Bulutlar ayaklarımızın altında! {floor}. kat\ngerçekten gökyüzünde, şahane!`,
        `Kule sanki kalp gibi çarpıyor...\n{floor}. kat başka, içim kıpır kıpır.`,
        `Buraya kadar neredeyse kimse tırmanmamış!\n{floor}. kat, sen gerçekten özelsin.`,
      ],
      apprentice: [
        `Sanırım kulenin tepesindeki ışığı görüyorum...\n{floor}. katta bu his gerçek gibi.`,
        `Buraya kadar geldiğine göre sıradan değilsin.\n{floor}. katta ben de sana inanacağım.`,
        `Sadece nefes sesimiz var...\n{floor}. katta sessizce birlikte gidelim.`,
      ],
    },
    peak: {
      archivist: [
        `Zirve gözümüzün önünde. {floor}. katın\nkaydını artık biz yazmalıyız.`,
        `Son mührün kaydı, {floor}. kat geçilince\ntamamlanacak.`,
        `{floor}. kat... buraya kadar geldiğine\nben bile inanmakta zorlanıyorum. Son görünüyor.`,
      ],
      wisp: [
        `Kulenin kendisi seni izliyor sanki!\n{floor}. katta daha da belirgin, heh.`,
        `Bu yükseklikte yerçekimi düzen değil,\nkendi iradesi var gibi kıpırdar. {floor}. katta dikkat.`,
        `{floor}. katın havası artık bambaşka.\nHissediyor musun? Neredeyse vardık.`,
      ],
      gatekeeper: [
        `{floor}. katı geçersen fazla kalmaz.\nSon ana kadar odaklan.`,
        `Kulenin son sınavı yaklaşıyor.\n{floor}. katın havasını hisset.`,
        `Buraya kadar geldikten sonra dönüş yok.\n{floor}. kat, sona kadar git.`,
      ],
      sprite: [
        `Neredeyse geldik! {floor}. katın havası\nbambaşka, içim pır pır.`,
        `Kule seni izliyor gibi...\n{floor}. katta ben bile titriyorum.`,
        `{floor}. katta sonu görür gibiyim!\nHadi, birlikte gidelim!`,
      ],
      apprentice: [
        `{floor}. kata kadar geldiğine\nhâlâ inanamıyorum. Neredeyse bitti.`,
        `Son mühür yakında...\n{floor}. katta titriyorum ama inanıyorum.`,
        `{floor}. kat... bu kadar ileri geleceğimizi\nkim bilirdi? Gel, sonu görelim.`,
      ],
    },
  },
  pinnedLines: {
    30: `Buradan sonra büyüler sık sık yön değiştirir.\n{floor}. katın yerçekimi tuhaftır, dikkatli ol.`,
    60: `Tırmanırken çok dikkatli ol. {floor}. kattan sonra\nkule sanki kendi kendine düşünür.`,
    80: `Buradan sonra kulenin tasarımı bile değişir. {floor}. katın\nartık bu kulenin bir parçası olmadığı bile söylenir.`,
    95: `Neredeyse vardık. {floor}. katın ötesinde\nson mührün büyüsünü doğrudan hissedeceksin.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Parıldayan bir şey buldum! Sana vereyim, al bakalım!` },
    { speaker: 'wisp', text: `Heh, hediye sayılır. Bedava değil aslında... ama bugünlük sana.` },
    { speaker: 'archivist', text: `Rafların arasına düşmüş bir eşya. Sana yararı dokunacaktır.` },
    { speaker: 'gatekeeper', text: `Kule, sınavı geçme niteliğini kabul etti. Bu ödülü al.` },
    { speaker: 'apprentice', text: `Bende bir tane kalmıştı... sen al. Bol şans!` },
  ],
  itemLabels: {
    bonusMove: 'Hamle +3 güçlendirmesi',
    lineRow: 'Satır temizleme malzemesi',
    lineCol: 'Sütun temizleme malzemesi',
    crossBomb: 'Çapraz bomba malzemesi',
    colorBomb: 'Renk bombası malzemesi',
  },
  stage1: `Kulenin tepesindeki mühür büyüsünü geri almalıyız.\nHazırsan birinci kattan başlayalım.`,
  stage1000: `Sonunda kulenin ucuna ulaştın.\nBuradaki büyü... artık tamamen sana ait.`,
};

const pl: LangStory = {
  speakerNames: {
    archivist: 'Stary Archiwista',
    wisp: 'Błędny Ognik',
    gatekeeper: 'Strażnik Wieży',
    sprite: 'Duszek Kurzu',
    apprentice: 'Uczeń Maga',
  },
  bands: {
    early: {
      archivist: [
        `{floor}. piętra nie ma jeszcze na moich półkach.\nTo ty pierwszy zapiszesz jego opowieść.`,
        `Najstarsze księgi zaczynają się od niskich pięter,\ntakich jak {floor}. Każdy skądś zaczyna.`,
        `Wyblakły atrament pod kurzem...\n{floor}. piętro też było kiedyś czyimś początkiem.`,
      ],
      wisp: [
        `He, nie licz na litość tylko dlatego,\nże to {floor}. piętro. Patrz pod nogi.`,
        `Jest tu pułapka... ostrzec cię?\nEch, na {floor}. piętrze odpuszczę.`,
        `Myślisz, że niskie piętro będzie nudne?\n{floor}. piętro też potrafi ukąsić.`,
      ],
      gatekeeper: [
        `{floor}. piętro zaliczone. Zasada jest\nprosta: nigdy nie opuszczaj gardy.`,
        `Prawo wieży działa tak samo\nod {floor}. piętra wzwyż. Bez wyjątków.`,
        `Wielu zatrzymało się na {floor}. piętrze.\nMam nadzieję, że będziesz inny.`,
      ],
      sprite: [
        `Spójrz na ten kurz! Na {floor}. piętrze\nmieszka tylu moich przyjaciół.`,
        `Mała rysa tutaj~ nawet {floor}. piętro\nchyba chowa jakiś sekret.`,
        `Hehe, schody na {floor}. piętrze\nbrzmią inaczej przy każdym kroku!`,
      ],
      apprentice: [
        `Mnie też trzęsły się ręce,\ngdy wspinałem się na {floor}. piętro. Tobie też?`,
        `Całkiem dobrze pamiętam {floor}. piętro.\nNie denerwuj się, idź powoli.`,
        `Czuję, jakbyśmy wspinali się razem.\n{floor}. piętro... oboje wciąż jesteśmy początkujący.`,
      ],
    },
    rising: {
      archivist: [
        `Od {floor}. piętra litery stają się dziwne:\nto ostrzeżenia w starym języku.`,
        `Podobno zapisy nieudanych zaklęć\nleżą gdzieś na {floor}. piętrze.`,
        `Kroniki z tej wysokości są uszkodzone.\nPrawda o {floor}. piętrze wciąż jest niepełna.`,
      ],
      wisp: [
        `Grawitacja zaraz znowu się odwróci,\nuważaj na {floor}. piętrze!`,
        `Widzisz, jak składniki jaśnieją?\nOd {floor}. piętra magia gęstnieje.`,
        `Skrzyp, skrzyp... słyszysz, jak schody\nna {floor}. piętrze jęczą niespokojnie?`,
      ],
      gatekeeper: [
        `Od {floor}. piętra podwój czujność.\nWieża robi się tu kapryśna.`,
        `Ślady tych, którzy tu przystanęli,\nznaczą ściany. Zapamiętaj {floor}. piętro.`,
        `Powietrze na {floor}. piętrze jest inne.\nNieostrożnych połyka grawitacja.`,
      ],
      sprite: [
        `Ojej, obrazy na ścianach {floor}. piętra\nwyglądają, jakby się ruszały!`,
        `Świeca drży, choć nie ma wiatru...\ncoś jest na {floor}. piętrze, aż mnie ciarki biorą.`,
        `Od {floor}. piętra pismo robi się dziwne.\nNawet ja go nie czytam, hehe.`,
      ],
      apprentice: [
        `Już {floor}. piętro... jesteś\nszybszy ode mnie, szczerze trochę zazdroszczę.`,
        `Od tej chwili robi się nerwowo.\nNa {floor}. piętrze uważajmy razem.`,
        `Mój nauczyciel ostrzegał, że {floor}. piętro\nwymaga szczególnej ostrożności. Pamiętaj.`,
      ],
    },
    deep: {
      archivist: [
        `W zapisach pogody {floor}. piętra\npowtarza się tylko słowo "ciężko".`,
        `Opowieść o zaginionym magu trwa\nna półkach {floor}. piętra. Bądź ostrożny.`,
        `Zapisy o przechylaniu się wieży\nnaprawdę zaczynają się od {floor}. piętra.`,
      ],
      wisp: [
        `Czujesz, jak podłoga drży? {floor}. piętro\nwciąż nie uporządkowało swojej grawitacji.`,
        `Spójrz, jak składniki ciągną ku sobie.\nNa {floor}. piętrze to normalne, he.`,
        `Widzisz tę starą laskę? Jest z {floor}. piętra.\nCiekawe, gdzie podział się jej właściciel.`,
      ],
      gatekeeper: [
        `Od {floor}. piętra zmienia się ciśnienie.\nPrzygotuj się.`,
        `Niewielu dotarło tak wysoko.\nPoczuj ciężar {floor}. piętra.`,
        `Wieża przechyla się krok po kroku.\nZwłaszcza od {floor}. piętra. Zachowaj czujność.`,
      ],
      sprite: [
        `Składniki zrobiły się takie twarde!\nTo pewnie przez ciśnienie {floor}. piętra.`,
        `Nawet ja czuję, jak powietrze na {floor}. piętrze\nrobi się ciężkie... trudno oddychać.`,
        `Czuję gdzieś zapach zaginionego maga...\nna {floor}. piętrze, naprawdę!`,
      ],
      apprentice: [
        `Od {floor}. piętra nawet ja\nłapię zadyszkę. Idźmy powoli.`,
        `Widok składników, które tak długo się trzymały,\ndodaje mi sił... {floor}. piętro, damy radę.`,
        `Nawet mój nauczyciel nie wspominał o {floor}. piętrze.\nMoże jesteśmy tu pierwsi.`,
      ],
    },
    high: {
      archivist: [
        `Nikt nigdy nie czytał ksiąg tak wysoko.\nWiedza {floor}. piętra nie ma właściciela.`,
        `Zapisy {floor}. piętra powtarzają tylko\njedno słowo: "samotność".`,
        `Jeden zapis mówi, że sigile same się przerysowują.\n{floor}. piętro chyba coś pamięta.`,
      ],
      wisp: [
        `Światło gwiazd wlewa się przez okno!\n{floor}. piętro jest już ponad chmurami.`,
        `Czujesz, jakie rzadkie powietrze? Od {floor}. piętra\nnawet ja pilnuję oddechu, he.`,
        `Nawet strażnik wieży rzadko tu zagląda.\nOd {floor}. piętra zostaję tylko ja.`,
      ],
      gatekeeper: [
        `Od {floor}. piętra moje patrole rzedną.\nUznaj, że jesteś sam.`,
        `Kroki odbijają się niezwykle głośno.\n{floor}. piętro od wieków stało puste.`,
        `Od tej wysokości wola znaczy więcej niż grawitacja.\n{floor}. piętro sprawdza właśnie to.`,
      ],
      sprite: [
        `Nawet kurz na tych półkach jest wyjątkowy!\nKurz z {floor}. piętra błyszczy.`,
        `Gwiazdy wydają się bliższe niż okna~\n{floor}. piętro jest dziwnie ciche.`,
        `Wieża drży, jakby oddychała...\nod {floor}. piętra szczególnie, dziwne, prawda?`,
      ],
      apprentice: [
        `Wciąż nie wierzę, że samotnie\ndotarłeś na {floor}. piętro. Niesamowite.`,
        `Brakuje ci tchu? Na {floor}. piętrze\nja też wciąż idę powoli.`,
        `Od tej chwili naprawdę liczy się twoja wola.\n{floor}. piętro, zaufaj jej.`,
      ],
    },
    summit: {
      archivist: [
        `Zapisy świata pod chmurami\ntracą tu znaczenie. {floor}. piętro należy do nieba.`,
        `Notatki o świetle na szczycie wieży są mętne.\nOd {floor}. piętra ukaże się prawda.`,
        `Lista tych, którzy dotarli aż tutaj, jest krótka.\nCisza {floor}. piętra jest dowodem.`,
      ],
      wisp: [
        `Słyszysz już tylko wiatr, prawda?\nNa {floor}. piętrze naprawdę nic nie ma, aż za cicho.`,
        `Składniki wyglądają lekko jak piórka!\nTo magia {floor}. piętra, he.`,
        `Gwiazdy są bliżej niż okna...\n{floor}. piętro jest spokojne aż strach.`,
      ],
      gatekeeper: [
        `Wytrwać aż do {floor}. piętra\nnie zdoła zwykły uczeń.`,
        `Wieża delikatnie drży. Na {floor}. piętrze\nwstrzymaj oddech i wspinaj się dalej.`,
        `Od tej chwili przed zasadami stoi determinacja.\nZapamiętaj {floor}. piętro.`,
      ],
      sprite: [
        `Chmury są pod stopami! {floor}. piętro\nnaprawdę jest w niebie, wspaniale!`,
        `Wieża bije jak serce...\n{floor}. piętro jest inne, aż mnie nosi.`,
        `Prawie nikt nie wspiął się tak wysoko!\n{floor}. piętro, naprawdę jesteś kimś szczególnym.`,
      ],
      apprentice: [
        `Chyba widzę światło na szczycie wieży...\nNa {floor}. piętrze to naprawdę czuć.`,
        `Skoro dotarłeś aż tutaj, nie jesteś zwyczajny.\nNa {floor}. piętrze ja też ci wierzę.`,
        `Słychać tylko nasze oddechy...\nNa {floor}. piętrze chodźmy razem po cichu.`,
      ],
    },
    peak: {
      archivist: [
        `Szczyt jest tuż przed nami. Zapis {floor}. piętra\nmusimy teraz stworzyć sami.`,
        `Kronika ostatniej pieczęci\ndopełni się po przejściu {floor}. piętra.`,
        `{floor}. piętro... nawet mnie trudno uwierzyć,\nże dotarłeś aż tutaj. Widać koniec.`,
      ],
      wisp: [
        `Jakby sama wieża cię obserwowała!\nNa {floor}. piętrze jeszcze wyraźniej, he.`,
        `Na tej wysokości grawitacja nie jest już regułą,\nrusza się jak własna wola. Uważaj na {floor}. piętrze.`,
        `Powietrze na {floor}. piętrze jest już całkiem inne.\nCzujesz? Prawie dotarliśmy.`,
      ],
      gatekeeper: [
        `Jeśli miniesz {floor}. piętro, zostanie niewiele.\nSkup się do samego końca.`,
        `Ostatnia próba wieży jest blisko.\nPoczuj powietrze {floor}. piętra.`,
        `Skoro dotarłeś aż tutaj, odwrotu nie ma.\n{floor}. piętro, idź do końca.`,
      ],
      sprite: [
        `Prawie jesteśmy! Powietrze {floor}. piętra\njest całkiem inne, aż serce skacze.`,
        `Wieża chyba cię obserwuje...\nNa {floor}. piętrze nawet ja drżę.`,
        `Na {floor}. piętrze chyba widzę koniec!\nChodź, idziemy razem!`,
      ],
      apprentice: [
        `Wciąż nie wierzę, że dotarłeś\naż na {floor}. piętro. Prawie koniec.`,
        `Ostatnia pieczęć jest blisko...\nNa {floor}. piętrze drżę, ale wierzę.`,
        `{floor}. piętro... kto by pomyślał,\nże zajdziemy tak daleko? Zobaczmy koniec.`,
      ],
    },
  },
  pinnedLines: {
    30: `Od tej chwili zaklęcia często zmieniają kierunek.\nGrawitacja {floor}. piętra jest kapryśna, uważaj.`,
    60: `Wspinaj się naprawdę ostrożnie. Od {floor}. piętra\nwieża zdaje się myśleć samodzielnie.`,
    80: `Od tej chwili zmienia się nawet projekt wieży. Mówią, że {floor}. piętro\nnie jest już częścią tej samej wieży.`,
    95: `Prawie jesteśmy. Za {floor}. piętrem\npoczujesz bezpośrednio magię ostatniej pieczęci.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Podniosłem coś błyszczącego! Dam ci, trzymaj!` },
    { speaker: 'wisp', text: `He, to prezent. Nie całkiem darmowy... ale dziś dostaniesz za nic.` },
    { speaker: 'archivist', text: `Przedmiot wypadły między półki. Przyda ci się.` },
    { speaker: 'gatekeeper', text: `Wieża uznała twoje prawo do próby. Przyjmij tę nagrodę.` },
    { speaker: 'apprentice', text: `Miałem jeszcze jeden... weź go. Powodzenia!` },
  ],
  itemLabels: {
    bonusMove: 'Wzmocnienie ruchów +3',
    lineRow: 'Składnik czyszczenia rzędu',
    lineCol: 'Składnik czyszczenia kolumny',
    crossBomb: 'Składnik bomby krzyżowej',
    colorBomb: 'Składnik bomby kolorów',
  },
  stage1: `Musimy odzyskać magię pieczęci na szczycie wieży.\nJeśli uczeń jest gotów, zacznijmy od pierwszego piętra.`,
  stage1000: `Wreszcie dotarłeś do końca wieży.\nMagia tego miejsca... należy już całkowicie do ciebie.`,
};

const nl: LangStory = {
  speakerNames: {
    archivist: 'Oude Archivaris',
    wisp: 'Dwaallicht',
    gatekeeper: 'Torenwachter',
    sprite: 'Stofgeest',
    apprentice: 'Leerling-magiër',
  },
  bands: {
    early: {
      archivist: [
        `Verdieping {floor} staat nog niet in mijn rekken.\nJij bent de eerste die haar verhaal opschrijft.`,
        `De oudste boeken beginnen op lage verdiepingen,\nzoals verdieping {floor}; iedereen begint ergens.`,
        `Vervaagde inkt onder het stof...\nverdieping {floor} was ooit ook iemands begin.`,
      ],
      wisp: [
        `Heh, geen genade omdat dit\nverdieping {floor} is. Let op je stap.`,
        `Hier zit een val... zal ik het zeggen?\nAch, voor verdieping {floor} laat ik het gaan.`,
        `Dacht je dat een lage verdieping saai was?\nVerdieping {floor} kan nog steeds bijten.`,
      ],
      gatekeeper: [
        `Verdieping {floor}, gepasseerd. De regel is\neenvoudig: laat nooit je waakzaamheid zakken.`,
        `De wet van de toren geldt vanaf verdieping {floor}\nmet dezelfde kracht. Geen uitzonderingen.`,
        `Velen bleven steken op verdieping {floor}.\nIk hoop dat jij anders bent.`,
      ],
      sprite: [
        `Kijk dat stof eens! Op verdieping {floor}\nwonen zoveel vrienden van mij.`,
        `Een klein scheurtje hier~ zelfs verdieping {floor}\nlijkt een geheim te verbergen.`,
        `Haha, de trappen van verdieping {floor}\nklinken bij elke stap anders!`,
      ],
      apprentice: [
        `Mijn handen trilden ook toen ik\nnaar verdieping {floor} klom. Die van jou ook?`,
        `Ik herinner me verdieping {floor} nog goed.\nNiet zenuwachtig zijn, doe rustig aan.`,
        `Het voelt alsof we samen klimmen.\nVerdieping {floor}... we zijn allebei nog beginners.`,
      ],
    },
    rising: {
      archivist: [
        `Vanaf verdieping {floor} worden de letters vreemd:\nwaarschuwingen in een oude taal.`,
        `Er zouden verslagen van mislukte spreuken\nergens op verdieping {floor} liggen.`,
        `De kronieken op deze hoogte zijn beschadigd.\nDe waarheid van verdieping {floor} is nog onvolledig.`,
      ],
      wisp: [
        `De zwaartekracht gaat zo weer kantelen,\npas op op verdieping {floor}!`,
        `Zie je de ingrediënten gloeien?\nVanaf verdieping {floor} wordt de magie dikker.`,
        `Kraak, kraak... hoor je de trappen\nonrustig kreunen op verdieping {floor}?`,
      ],
      gatekeeper: [
        `Verdubbel je wacht vanaf verdieping {floor}.\nDe toren wordt hier grillig.`,
        `Sporen van wie hier stopten staan op de muren.\nOnthoud verdieping {floor}.`,
        `De lucht is anders op verdieping {floor}.\nDe achtelozen worden door zwaartekracht opgeslokt.`,
      ],
      sprite: [
        `Wauw, de tekeningen op de muren\nvan verdieping {floor} lijken te bewegen!`,
        `De kaars flikkert zonder wind...\ner is iets op verdieping {floor}, ik krijg kriebels.`,
        `Vanaf verdieping {floor} wordt het schrift vreemd.\nZelfs ik kan het niet lezen, haha.`,
      ],
      apprentice: [
        `Nu al verdieping {floor}... je bent\nsneller dan ik, eerlijk gezegd ben ik jaloers.`,
        `Vanaf hier wordt het spannend.\nLaten we op verdieping {floor} samen voorzichtig zijn.`,
        `Mijn meester waarschuwde dat verdieping {floor}\nextra zorg vraagt. Vergeet dat niet.`,
      ],
    },
    deep: {
      archivist: [
        `In de weerboeken van verdieping {floor}\nstaat alleen maar het woord "zwaar".`,
        `Een verhaal over een verdwaalde magiër blijft\nop de planken van verdieping {floor} hangen. Wees voorzichtig.`,
        `Verslagen dat de toren helt\nverschijnen pas echt vanaf verdieping {floor}.`,
      ],
      wisp: [
        `Voel je de vloer trillen? Verdieping {floor}\nheeft haar zwaartekracht nog niet op orde.`,
        `Kijk hoe de ingrediënten naar elkaar trekken.\nOp verdieping {floor} gaat dat nu eenmaal zo, heh.`,
        `Zie je deze oude staf? Die komt van verdieping {floor}.\nWaar zou de eigenaar zijn gebleven?`,
      ],
      gatekeeper: [
        `Vanaf verdieping {floor} verandert de druk.\nZet je schrap.`,
        `Weinigen bereikten deze hoogte.\nVoel het gewicht van verdieping {floor}.`,
        `De toren helt beetje bij beetje.\nVooral vanaf verdieping {floor}. Blijf waakzaam.`,
      ],
      sprite: [
        `De ingrediënten voelen nu zo hard!\nDat komt vast door de druk op verdieping {floor}.`,
        `Zelfs ik voel de lucht op verdieping {floor}\nzwaar worden... ademen is lastig.`,
        `Ik ruik ergens een verdwaalde magiër...\nop verdieping {floor}, echt waar!`,
      ],
      apprentice: [
        `Vanaf verdieping {floor} raak zelfs ik\nbuiten adem. Laten we langzaam gaan.`,
        `Dat de ingrediënten het tot hier hielden,\ngeeft me kracht... verdieping {floor}, we kunnen dit.`,
        `Zelfs mijn meester noemde verdieping {floor} nooit.\nMisschien zijn wij de eersten hier.`,
      ],
    },
    high: {
      archivist: [
        `Niemand heeft de boeken hier ooit gelezen.\nDe kennis van verdieping {floor} heeft geen eigenaar.`,
        `De verslagen van verdieping {floor} herhalen\nmaar één woord: "eenzaamheid".`,
        `Een verslag zegt dat de zegels zichzelf hertekenen.\nVerdieping {floor} lijkt zich iets te herinneren.`,
      ],
      wisp: [
        `Sterrenlicht stroomt door het raam!\nVerdieping {floor} ligt al boven de wolken.`,
        `Voel je de ijle lucht? Vanaf verdieping {floor}\nlet zelfs ik op mijn adem, heh.`,
        `Zelfs de torenwachter komt hier zelden.\nVanaf verdieping {floor} heb je alleen mij nog.`,
      ],
      gatekeeper: [
        `Vanaf verdieping {floor} worden mijn rondes schaars.\nReken erop dat je alleen bent.`,
        `Voetstappen galmen ongewoon luid.\nVerdieping {floor} staat al eeuwen leeg.`,
        `Vanaf hier telt je wil meer dan zwaartekracht.\nVerdieping {floor} beproeft precies dat.`,
      ],
      sprite: [
        `Zelfs het stof op deze planken is bijzonder!\nHet stof van verdieping {floor} glinstert.`,
        `De sterren lijken dichterbij dan de ramen~\nverdieping {floor} is vreemd stil.`,
        `De toren trilt alsof hij ademt...\nvooral vanaf verdieping {floor}, raar toch?`,
      ],
      apprentice: [
        `Ik kan nog steeds niet geloven dat je\nalleen verdieping {floor} bereikte. Geweldig.`,
        `Krijg je weinig lucht? Op verdieping {floor}\nloop ik ook nog langzaam.`,
        `Vanaf hier lijkt het echt van je wil af te hangen.\nVerdieping {floor}, vertrouw erop.`,
      ],
    },
    summit: {
      archivist: [
        `Verslagen van de wereld onder de wolken\nverliezen hier betekenis. Verdieping {floor} hoort bij de hemel.`,
        `De notities over het licht op de torentop zijn vaag.\nVanaf verdieping {floor} zal de waarheid zichtbaar worden.`,
        `De lijst van wie hier kwam is heel kort.\nDe stilte van verdieping {floor} is het bewijs.`,
      ],
      wisp: [
        `Je hoort alleen de wind, toch?\nOp verdieping {floor} is echt niets, veel te stil.`,
        `De ingrediënten lijken licht als veren!\nDat is de magie van verdieping {floor}, heh.`,
        `De sterren zijn dichterbij dan de ramen...\nverdieping {floor} is angstig stil.`,
      ],
      gatekeeper: [
        `Tot verdieping {floor} volhouden\nis geen werk voor een gewone leerling.`,
        `De toren trilt heel licht. Houd op verdieping {floor}\nje adem in en klim verder.`,
        `Vanaf hier komt vastberadenheid vóór regels.\nGrif verdieping {floor} in je geheugen.`,
      ],
      sprite: [
        `De wolken liggen onder onze voeten! Verdieping {floor}\nis echt in de hemel, heerlijk!`,
        `De toren bonst alsof hij een hart heeft...\nverdieping {floor} is anders, ik tintel helemaal.`,
        `Bijna niemand heeft zo hoog geklommen!\nVerdieping {floor}, jij bent echt bijzonder.`,
      ],
      apprentice: [
        `Ik denk dat ik het licht op de top zie...\nop verdieping {floor} voelt het echt.`,
        `Als je tot hier kwam, ben je niet gewoon.\nOp verdieping {floor} geloof ik ook in je.`,
        `Alleen onze adem is te horen...\nlaten we op verdieping {floor} stil samen gaan.`,
      ],
    },
    peak: {
      archivist: [
        `De top ligt vlak voor ons. Het verslag van verdieping {floor}\nmoeten wij nu zelf schrijven.`,
        `Het verslag van het laatste zegel\nwordt voltooid zodra verdieping {floor} voorbij is.`,
        `Verdieping {floor}... zelfs ik kan nauwelijks geloven\ndat je zo ver kwam. Het einde is zichtbaar.`,
      ],
      wisp: [
        `Het lijkt alsof de toren zelf naar je kijkt!\nOp verdieping {floor} nog sterker, heh.`,
        `Op deze hoogte is zwaartekracht geen regel meer,\nze beweegt alsof ze wil heeft. Pas op op verdieping {floor}.`,
        `De lucht op verdieping {floor} is nu echt anders.\nVoel je het? We zijn er bijna.`,
      ],
      gatekeeper: [
        `Als je verdieping {floor} passeert, blijft er weinig over.\nBlijf tot het laatste moment gericht.`,
        `De laatste proef van de toren komt dichtbij.\nVoel de lucht van verdieping {floor}.`,
        `Na alles tot hier is er geen weg terug.\nVerdieping {floor}, ga tot het einde.`,
      ],
      sprite: [
        `We zijn er bijna! De lucht van verdieping {floor}\nis helemaal anders, ik krijg kriebels.`,
        `Het lijkt alsof de toren je aankijkt...\nop verdieping {floor} tril zelfs ik mee.`,
        `Op verdieping {floor} denk ik het einde te zien!\nKom, we gaan samen!`,
      ],
      apprentice: [
        `Ik kan nog steeds niet geloven dat je\nverdieping {floor} haalde. Bijna klaar.`,
        `Het laatste zegel is dichtbij...\nop verdieping {floor} tril ik, maar ik geloof erin.`,
        `Verdieping {floor}... wie had gedacht dat we\nzo ver zouden komen? Laten we het einde zien.`,
      ],
    },
  },
  pinnedLines: {
    30: `Vanaf hier veranderen spreuken vaak van richting.\nDe zwaartekracht van verdieping {floor} is grillig, wees voorzichtig.`,
    60: `Klim heel voorzichtig verder. Vanaf verdieping {floor}\nlijkt de toren zelf te denken.`,
    80: `Vanaf hier verandert zelfs het ontwerp van de toren. Men zegt dat verdieping {floor}\nniet langer deel is van dezezelfde toren.`,
    95: `We zijn er bijna. Voorbij verdieping {floor}\nzul je de magie van het laatste zegel rechtstreeks voelen.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Ik heb iets glinsterends opgeraapt! Hier, neem maar!` },
    { speaker: 'wisp', text: `Heh, een cadeautje. Niet echt gratis... maar vandaag wel.` },
    { speaker: 'archivist', text: `Een voorwerp dat tussen de planken viel. Het zal je van nut zijn.` },
    { speaker: 'gatekeeper', text: `De toren erkent je recht op de proef. Neem deze beloning aan.` },
    { speaker: 'apprentice', text: `Ik had er nog eentje over... neem jij hem. Succes!` },
  ],
  itemLabels: {
    bonusMove: 'Zetten +3-versterking',
    lineRow: 'Rijwis-ingrediënt',
    lineCol: 'Kolomwis-ingrediënt',
    crossBomb: 'Kruisbom-ingrediënt',
    colorBomb: 'Kleurbom-ingrediënt',
  },
  stage1: `We moeten de zegelmagie op de top van de toren terughalen.\nAls de leerling klaar is, beginnen we op de eerste verdieping.`,
  stage1000: `Eindelijk heb je het uiteinde van de toren bereikt.\nDe magie hier... behoort nu helemaal aan jou.`,
};

const sv: LangStory = {
  speakerNames: {
    archivist: 'Gamle arkivarien',
    wisp: 'Irrbloss',
    gatekeeper: 'Tornväktaren',
    sprite: 'Dammfen',
    apprentice: 'Magikerlärlingen',
  },
  bands: {
    early: {
      archivist: [
        `Våning {floor} finns ännu inte i mina hyllor.\nDu blir den första som skriver dess berättelse.`,
        `De äldsta böckerna börjar på låga våningar,\nsom våning {floor}; alla börjar någonstans.`,
        `Blekbläck under dammet...\nvåning {floor} var en gång också någons början.`,
      ],
      wisp: [
        `Hehe, ingen nåd bara för att det är\nvåning {floor}. Se var du sätter foten.`,
        `Det finns en fälla här... ska jag varna dig?\nNåja, våning {floor}; jag låter den passera.`,
        `Trodde du att en låg våning skulle vara tråkig?\nVåning {floor} har fortfarande lite bett.`,
      ],
      gatekeeper: [
        `Våning {floor}, passerad. Regeln är enkel:\nsänk aldrig garden.`,
        `Tornets lag gäller lika strängt\nfrån våning {floor}. Inga undantag.`,
        `Många stannade på våning {floor}.\nJag hoppas att du är annorlunda.`,
      ],
      sprite: [
        `Titta på allt damm! På våning {floor}\nbor så många av mina vänner.`,
        `En liten spricka här~ till och med våning {floor}\nverkar gömma på en hemlighet.`,
        `Haha, trapporna på våning {floor}\nlåter olika för varje steg!`,
      ],
      apprentice: [
        `Mina händer skakade också när jag\nklättrade till våning {floor}. Dina med?`,
        `Jag minns våning {floor} ganska väl.\nBli inte nervös, ta det långsamt.`,
        `Det känns som om vi klättrar tillsammans.\nVåning {floor}... vi är båda ännu nybörjare.`,
      ],
    },
    rising: {
      archivist: [
        `Från våning {floor} blir bokstäverna märkliga:\nvarningar på ett gammalt språk.`,
        `Det sägs att anteckningar om misslyckade formler\nligger någonstans på våning {floor}.`,
        `Krönikorna här uppe är skadade.\nSanningen om våning {floor} är ännu ofullständig.`,
      ],
      wisp: [
        `Tyngdkraften tänker vända igen,\nså var försiktig på våning {floor}!`,
        `Ser du ingredienserna lysa?\nMagin tjocknar från våning {floor}.`,
        `Knarr, knarr... hör du trapporna\nstöna oroligt på våning {floor}?`,
      ],
      gatekeeper: [
        `Från våning {floor} ska din vaksamhet fördubblas.\nTornet blir nyckfullt här.`,
        `Spår av dem som stannade här\nmärker väggarna. Minns våning {floor}.`,
        `Luften är annorlunda på våning {floor}.\nDen vårdslöse slukas av tyngdkraften.`,
      ],
      sprite: [
        `Oj, bilderna på väggarna på våning {floor}\nser ut som om de rör sig!`,
        `Ljuset fladdrar fast ingen vind blåser...\ndet finns något på våning {floor}, jag blir pirrig.`,
        `Skriften blir konstig från våning {floor}.\nInte ens jag kan läsa den, haha.`,
      ],
      apprentice: [
        `Redan framme vid våning {floor}...\ndu är snabbare än jag, ärligt talat blir jag lite avundsjuk.`,
        `Härifrån blir det verkligen spänt.\nVåning {floor}, låt oss vara försiktiga tillsammans.`,
        `Min lärare varnade mig att våning {floor}\nkräver extra omsorg. Kom ihåg det.`,
      ],
    },
    deep: {
      archivist: [
        `Väderanteckningarna för våning {floor}\nupprepar bara ordet "tungt".`,
        `En berättelse om en förlorad magiker dröjer\npå hyllorna vid våning {floor}. Var varsam.`,
        `Anteckningar om att tornet lutar\nbörjar faktiskt dyka upp från våning {floor}.`,
      ],
      wisp: [
        `Känner du golvet darra? Våning {floor}\nhar ännu inte bestämt sin tyngdkraft.`,
        `Se hur ingredienserna dras\nmot varandra här, hehe.`,
        `Ser du den gamla staven? Den kommer från\nvåning {floor}; vart tog ägaren vägen?`,
      ],
      gatekeeper: [
        `Från våning {floor} förändras trycket.\nStå stadigt.`,
        `Få har nått den här höjden.\nKänn tyngden av våning {floor}.`,
        `Tornet lutar lite för varje steg.\nSärskilt från våning {floor}. Var på din vakt.`,
      ],
      sprite: [
        `Ingredienserna känns så hårda nu!\nDet måste vara trycket på våning {floor}.`,
        `Till och med jag känner luften bli tung\npå våning {floor}... svårt att andas.`,
        `Jag känner doften av en förlorad magiker någonstans...\npå våning {floor}, jag lovar att det är sant!`,
      ],
      apprentice: [
        `Från våning {floor} blir till och med jag\nandfådd. Låt oss gå långsamt.`,
        `Att se hur ingredienserna höll ut hit\nger mig kraft... våning {floor}, vi klarar det.`,
        `Inte ens min lärare nämnde våning {floor}.\nKanske är vi de första här.`,
      ],
    },
    high: {
      archivist: [
        `Ingen har någonsin läst böckerna här uppe.\nKunskapen på våning {floor} har ingen ägare.`,
        `Anteckningarna från våning {floor} upprepar\nbara ett ord: "ensamhet".`,
        `En krönika säger att sigillen ritar om sig själva.\nVåning {floor} tycks minnas något.`,
      ],
      wisp: [
        `Stjärnljus strömmar in genom fönstret!\nVåning {floor} ligger redan ovan molnen.`,
        `Känner du hur tunn luften är? Från våning {floor}\naktar till och med jag min andning, hehe.`,
        `Inte ens tornväktaren kommer ofta hit.\nFrån våning {floor} är det bara jag kvar.`,
      ],
      gatekeeper: [
        `Mina ronder blir sällsynta från våning {floor}.\nRäkna med att vara ensam.`,
        `Fotsteg ekar ovanligt högt.\nVåning {floor} har stått tom i evigheter.`,
        `Härifrån betyder viljan mer än tyngdkraften.\nVåning {floor} prövar just det.`,
      ],
      sprite: [
        `Till och med dammet på hyllorna här är särskilt!\nDammet från våning {floor} glittrar.`,
        `Stjärnorna känns närmare än fönstren~\nvåning {floor} är märkligt stilla.`,
        `Tornet skälver som om det andades...\nsärskilt från våning {floor}, visst är det konstigt?`,
      ],
      apprentice: [
        `Jag kan fortfarande inte tro att du nådde\nvåning {floor} ensam. Otroligt.`,
        `Får du ont om luft? På våning {floor}\ngår jag också fortfarande långsamt.`,
        `Härifrån verkar det verkligen hänga på din vilja.\nVåning {floor}, lita på den.`,
      ],
    },
    summit: {
      archivist: [
        `Anteckningar om världen under molnen\nförlorar sin mening här. Våning {floor} hör himlen till.`,
        `Noteringarna om ljuset vid tornets topp är grumliga.\nFrån våning {floor} visar sig det sanna.`,
        `Listan över dem som nått hit är mycket kort.\nTystnaden på våning {floor} är beviset.`,
      ],
      wisp: [
        `Du hör bara vinden nu, eller hur?\nPå våning {floor} finns verkligen ingenting, alldeles för tyst.`,
        `Ingredienserna ser lätta ut som fjädrar!\nDet är magin på våning {floor}, hehe.`,
        `Stjärnorna är närmare än fönstren...\nvåning {floor} är kusligt stilla.`,
      ],
      gatekeeper: [
        `Att hålla ut ända till våning {floor}\när inte en vanlig lärlings bedrift.`,
        `Tornet darrar svagt. På våning {floor}\nhåller du andan och klättrar vidare.`,
        `Härifrån kommer beslutsamhet före regler.\nMinns våning {floor}.`,
      ],
      sprite: [
        `Molnen ligger under våra fötter! Våning {floor}\när verkligen i himlen, underbart!`,
        `Tornet dunkar som om det hade ett hjärta...\nvåning {floor} är annorlunda, jag pirrar överallt.`,
        `Nästan ingen har klättrat så här högt!\nVåning {floor}, du är verkligen något särskilt.`,
      ],
      apprentice: [
        `Jag tror att jag ser ljuset vid toppen...\npå våning {floor} känns det verkligen så.`,
        `Om du har kommit ända hit är du inte vanlig.\nPå våning {floor} tror jag också på dig.`,
        `Bara våra andetag hörs...\nlåt oss gå tyst tillsammans på våning {floor}.`,
      ],
    },
    peak: {
      archivist: [
        `Toppen är alldeles framför oss. Krönikan om våning {floor}\nmåste vi nu skriva själva.`,
        `Krönikan om det sista sigillet\nfullbordas när våning {floor} är passerad.`,
        `Våning {floor}... till och med jag har svårt att tro\natt du kommit så långt. Slutet syns.`,
      ],
      wisp: [
        `Det känns som om själva tornet betraktar dig!\nPå våning {floor} ännu tydligare, hehe.`,
        `På den här höjden är tyngdkraften ingen regel längre,\nden rör sig som en egen vilja. Akta dig på våning {floor}.`,
        `Luften på våning {floor} är redan helt annorlunda.\nKänner du det? Vi är nästan framme.`,
      ],
      gatekeeper: [
        `Om du passerar våning {floor} återstår inte mycket.\nHåll fokus ända till slutet.`,
        `Tornets sista prövning närmar sig.\nKänn luften från våning {floor}.`,
        `Har du kommit ända hit finns ingen återvändo.\nVåning {floor}, gå till slutet.`,
      ],
      sprite: [
        `Vi är nästan framme! Luften på våning {floor}\när helt annorlunda, det spritter i mig.`,
        `Det verkar som om tornet tittar på dig...\npå våning {floor} skälver till och med jag.`,
        `På våning {floor} tror jag att jag ser slutet!\nKom, vi går tillsammans!`,
      ],
      apprentice: [
        `Jag kan fortfarande inte tro att du nådde\nända till våning {floor}. Nästan framme.`,
        `Det sista sigillet är nära...\npå våning {floor} darrar jag, men jag tror på dig.`,
        `Våning {floor}... vem hade trott\natt vi skulle komma så långt? Låt oss se slutet.`,
      ],
    },
  },
  pinnedLines: {
    30: `Härifrån byter besvärjelser ofta riktning.\nTyngdkraften på våning {floor} är nyckfull, så var försiktig.`,
    60: `Klättra vidare med stor försiktighet. Från våning {floor}\nverkar tornet tänka själv.`,
    80: `Härifrån förändras till och med tornets ritning. Det sägs att våning {floor}\ninte längre hör till samma torn.`,
    95: `Vi är nästan framme. Bortom våning {floor}\nkommer du känna det sista sigillets magi direkt.`,
  },
  eventLines: [
    { speaker: 'sprite', text: `Jag hittade något glittrande! Här, du får det!` },
    { speaker: 'wisp', text: `Hehe, en present. Inte helt gratis... men i dag får du den ändå.` },
    { speaker: 'archivist', text: `Ett föremål föll mellan hyllorna. Det bör komma till nytta.` },
    { speaker: 'gatekeeper', text: `Tornet erkänner din rätt till prövningen. Ta emot denna belöning.` },
    { speaker: 'apprentice', text: `Jag hade en till kvar... ta den du. Lycka till!` },
  ],
  itemLabels: {
    bonusMove: 'Drag +3-förstärkning',
    lineRow: 'Radrensande ingrediens',
    lineCol: 'Kolumnrensande ingrediens',
    crossBomb: 'Korsbombsingrediens',
    colorBomb: 'Färgbombsingrediens',
  },
  stage1: `Vi måste återta sigillmagin på tornets topp.\nNär lärlingen är redo börjar vi på första våningen.`,
  stage1000: `Äntligen har du nått tornets slut.\nMagin här... tillhör nu helt och hållet dig.`,
};

const STORIES: Partial<Record<string, LangStory>> = {
  ko,
  en,
  ja,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  es,
  'es-419': es419,
  pt,
  'pt-BR': ptBR,
  fr,
  de,
  it,
  ru,
  ar,
  hi,
  id,
  th,
  vi,
  tr,
  pl,
  nl,
  sv,
};

function getStory(): LangStory {
  return STORIES[getLanguage()] ?? STORIES.en ?? ko;
}

function simpleHash(n: number): number {
  let h = n * 2654435761;
  h = h ^ (h >>> 13);
  return Math.abs(h);
}

const EVENT_CHANCE = 0.15;
const EVENT_ITEMS: EventItem[] = ['bonusMove', 'lineRow', 'lineCol', 'crossBomb', 'colorBomb'];

// Fires with small, flat probability on stage start (any stage, not just
// floor-intro stages) — independent of the floor-banded story lines above.
export function rollRandomEvent(): RandomEvent | null {
  if (Math.random() >= EVENT_CHANCE) return null;
  const story = getStory();
  const line = story.eventLines[Math.floor(Math.random() * story.eventLines.length)];
  const item = EVENT_ITEMS[Math.floor(Math.random() * EVENT_ITEMS.length)];
  return {
    speaker: story.speakerNames[line.speaker],
    text: line.text,
    item,
    itemLabel: story.itemLabels[item],
  };
}

export function getStageIntro(stage: number): StoryLine | null {
  const story = getStory();

  if (stage === 1) {
    return { speaker: story.speakerNames.archivist, text: story.stage1 };
  }
  if (stage === 1000) {
    return { speaker: story.speakerNames.archivist, text: story.stage1000 };
  }
  if (stage % 10 !== 1) return null;

  const floor = getFloor(stage);
  const seed = simpleHash(floor);

  const pinned = story.pinnedLines[floor];
  if (pinned) {
    return { speaker: story.speakerNames.gatekeeper, text: pinned.replace(/\{floor\}/g, String(floor)) };
  }

  const speakerId = SPEAKER_IDS[seed % SPEAKER_IDS.length];
  const band = BAND_RANGES.find((b) => floor >= b.min && floor <= b.max);
  const pool = (band ? story.bands[band.key][speakerId] : undefined) ?? story.bands.rising[speakerId];
  const template = pool[Math.floor(seed / SPEAKER_IDS.length) % pool.length];

  const text = template.replace(/\{floor\}/g, String(floor));
  return { speaker: story.speakerNames[speakerId], text };
}
