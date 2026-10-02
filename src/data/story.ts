import { getLanguage } from '../i18n';

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

const STORIES: Partial<Record<string, LangStory>> = { ko, en };

function getStory(): LangStory {
  return STORIES[getLanguage()] ?? STORIES.en ?? ko;
}

function simpleHash(n: number): number {
  let h = n * 2654435761;
  h = h ^ (h >>> 13);
  return Math.abs(h);
}

export function getFloor(stage: number): number {
  return Math.ceil(stage / 10);
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
