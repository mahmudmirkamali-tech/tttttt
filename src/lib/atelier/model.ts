export type MetalId = "brass" | "copper" | "silver" | "obsidian";
export type Tier = "شاخص" | "کمیاب" | "همراه";
export type Intensity = "soft" | "sharp" | "blast";
export type Channel = "instagram" | "telegram" | "x" | "site";
export type MinLevel = Intensity;

export type TraitValue = { id: string; name: string; weight: number };
export type Layer = { id: string; title: string; values: TraitValue[] };

export type Piece = {
  id: string;
  index: number;
  name: string;
  form: string;
  formName: string;
  metal: MetalId;
  metalName: string;
  ground: string;
  groundName: string;
  air: string;
  airName: string;
  tier: Tier;
  oneIn: number;
  story: string;
};

export type Loop = {
  id: string;
  title: string;
  detail: string;
  steps: string[];
  asset: string;
  kpi: string;
  min: MinLevel;
  armed: boolean;
};

export type Post = {
  id: string;
  channel: Channel;
  day: string;
  kind: string;
  title: string;
  body: string;
  status: "ready" | "posted";
};

export type Check = {
  id: string;
  track: "app" | "art" | "growth";
  title: string;
  detail: string;
  auto: boolean;
  done: boolean;
};

export type Profile = {
  instagram: string;
  telegram: string;
  xHandle: string;
  appName: string;
  appTagline: string;
  collectionName: string;
  chain: string;
  supply: number;
  followers: number;
  partnerFollowers: number;
  storyShare: number;
  inviteAccept: number;
};

export type StudioData = {
  profile: Profile;
  layers: Layer[];
  pieces: Piece[];
  seed: number;
  rolledStamp: string;
  intensity: Intensity;
  loops: Loop[];
  posts: Post[];
  checks: Check[];
  listingFa: string;
  listingEn: string;
  bio: string;
  privacy: string;
  signature: string;
  blindMint: boolean;
  appPublished: boolean;
  note: string;
  log: string[];
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
const RANK: Record<Intensity, number> = { soft: 0, sharp: 1, blast: 2 };
const METALS = ["brass", "copper", "silver", "obsidian"] as const;

export function faNum(value: number | string) {
  return String(value).replace(/\d/g, (d) => FA[Number(d)] ?? d);
}

export function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function defaultProfile(): Profile {
  return {
    instagram: "mypage",
    telegram: "mychannel",
    xHandle: "mypage",
    appName: "هم‌قدم",
    appTagline: "ریتم آرام روز، کنار هنر خودت",
    collectionName: "شب‌چراغ",
    chain: "اتریوم",
    supply: 888,
    followers: 800,
    partnerFollowers: 1500,
    storyShare: 12,
    inviteAccept: 25,
  };
}

export function defaultLayers(): Layer[] {
  return [
    {
      id: "ground",
      title: "زمینه",
      values: [
        { id: "night", name: "شب مرکب", weight: 40 },
        { id: "clay", name: "سفال", weight: 25 },
        { id: "ash", name: "خاکستر", weight: 22 },
        { id: "void", name: "خلاء", weight: 8 },
        { id: "goldground", name: "زمینه شاه", weight: 5 },
      ],
    },
    {
      id: "form",
      title: "نقش",
      values: [
        { id: "lantern", name: "فانوس", weight: 22 },
        { id: "arch", name: "طاق", weight: 18 },
        { id: "seal", name: "مهر", weight: 16 },
        { id: "moon", name: "ماه", weight: 16 },
        { id: "ring", name: "حلقه", weight: 14 },
        { id: "ember", name: "اخگر", weight: 10 },
        { id: "tablet", name: "لوح", weight: 4 },
      ],
    },
    {
      id: "metal",
      title: "ماده",
      values: [
        { id: "brass", name: "برنج", weight: 46 },
        { id: "copper", name: "مس", weight: 28 },
        { id: "silver", name: "نقره", weight: 16 },
        { id: "obsidian", name: "ابسیدین", weight: 10 },
      ],
    },
    {
      id: "air",
      title: "حال",
      values: [
        { id: "still", name: "ساکن", weight: 50 },
        { id: "haze", name: "مه", weight: 28 },
        { id: "spark", name: "جرقه", weight: 16 },
        { id: "rareglow", name: "هاله کمیاب", weight: 6 },
      ],
    },
  ];
}

export function layerStamp(layers: Layer[]) {
  return layers.map((layer) => layer.values.map((v) => v.weight).join(",")).join("|");
}

export function sign(
  profile: Profile,
  extra: { note: string; blind: boolean; published: boolean },
) {
  return [
    profile.instagram,
    profile.telegram,
    profile.xHandle,
    profile.appName,
    profile.appTagline,
    profile.collectionName,
    profile.chain,
    profile.supply,
    extra.note,
    extra.blind ? "1" : "0",
    extra.published ? "1" : "0",
  ].join("\u0001");
}

type Names = {
  ig: string;
  tg: string;
  x: string;
  app: string;
  tag: string;
  col: string;
  chain: string;
  supply: number;
};

function names(profile: Profile): Names {
  return {
    ig: profile.instagram.replace(/^@/, "").trim() || "page",
    tg: profile.telegram.replace(/^@/, "").trim() || "channel",
    x: profile.xHandle.replace(/^@/, "").trim() || "page",
    app: profile.appName.trim() || "اپ",
    tag: profile.appTagline.trim() || "ابزار شخصی",
    col: profile.collectionName.trim() || "مجموعه",
    chain: profile.chain.trim() || "اتریوم",
    supply: clamp(profile.supply, 8, 10000),
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T extends { weight: number }>(rng: () => number, values: T[]) {
  const sum = values.reduce((s, v) => s + Math.max(1, v.weight), 0);
  let r = rng() * sum;
  for (const value of values) {
    r -= Math.max(1, value.weight);
    if (r <= 0) return value;
  }
  return values[values.length - 1]!;
}

function findLayer(layers: Layer[], id: string) {
  return layers.find((layer) => layer.id === id);
}

function chance(layer: Layer, id: string) {
  const sum = layer.values.reduce((s, v) => s + Math.max(1, v.weight), 0);
  const weight = layer.values.find((v) => v.id === id)?.weight ?? 1;
  return Math.max(1, weight) / sum;
}

function oneInN(layers: Layer[], form: string, metal: string, ground: string, air: string) {
  const g = findLayer(layers, "ground");
  const f = findLayer(layers, "form");
  const m = findLayer(layers, "metal");
  const a = findLayer(layers, "air");
  if (!g || !f || !m || !a) return 1;
  const p = chance(f, form) * chance(m, metal) * chance(g, ground) * chance(a, air);
  return Math.max(1, Math.round(1 / Math.max(p, 0.000001)));
}

function tierOf(oneIn: number, formId: string, groundId: string, airId: string): Tier {
  if (oneIn >= 70 || airId === "rareglow" || groundId === "goldground" || formId === "tablet") {
    return "شاخص";
  }
  if (oneIn >= 22) return "کمیاب";
  return "همراه";
}

function asMetal(id: string): MetalId {
  return (METALS as readonly string[]).includes(id) ? (id as MetalId) : "brass";
}

export function rollPieces(layers: Layer[], seed: number, profile: Profile): Piece[] {
  const form = findLayer(layers, "form");
  const metal = findLayer(layers, "metal");
  const ground = findLayer(layers, "ground");
  const air = findLayer(layers, "air");
  if (!form || !metal || !ground || !air) return [];
  const n = names(profile);
  const rng = mulberry32(seed || 1);
  const seen = new Set<string>();
  const pieces: Piece[] = [];
  let guard = 0;
  while (pieces.length < 8 && guard < 100) {
    guard += 1;
    const f = pick(rng, form.values);
    const m = pick(rng, metal.values);
    const g = pick(rng, ground.values);
    const a = pick(rng, air.values);
    const key = `${f.id}|${m.id}|${g.id}|${a.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const oneIn = oneInN(layers, f.id, m.id, g.id, a.id);
    const tier = tierOf(oneIn, f.id, g.id, a.id);
    const index = pieces.length + 1;
    const name = `${f.name} ${m.name}`;
    pieces.push({
      id: `piece-${index}`,
      index,
      name,
      form: f.id,
      formName: f.name,
      metal: asMetal(m.id),
      metalName: m.name,
      ground: g.id,
      groundName: g.name,
      air: a.id,
      airName: a.name,
      tier,
      oneIn,
      story: `«${name}» برای ${n.col} ساخته شده، نه کپی یک مجموعهٔ معروف. زمینه ${g.name} است و حالش ${a.name}. در عرضهٔ ${faNum(n.supply)} نسخه، این ترکیب تقریباً یکی از ${faNum(oneIn)} است. هولدرش زودتر وارد ${n.app} می‌شود؛ وعدهٔ قیمت در کار نیست.`,
    });
  }
  return pieces;
}

export function expectedCounts(layers: Layer[], supply: number) {
  const total = clamp(supply, 8, 10000);
  return layers.map((layer) => {
    const sum = layer.values.reduce((s, v) => s + Math.max(1, v.weight), 0);
    return {
      id: layer.id,
      title: layer.title,
      rows: layer.values.map((value) => ({
        ...value,
        pct: Math.round((100 * Math.max(1, value.weight)) / sum),
        count: Math.max(1, Math.round((total * Math.max(1, value.weight)) / sum)),
      })),
    };
  });
}

function rankOk(intensity: Intensity, min: MinLevel) {
  return RANK[intensity] >= RANK[min];
}

export function buildLoops(profile: Profile, intensity: Intensity, prev?: Loop[]): Loop[] {
  const n = names(profile);
  const fresh: Omit<Loop, "armed">[] = [
    {
      id: "waitlist",
      title: "فهرست انتظار اپ",
      min: "soft",
      detail: "آدم‌ها برای خود اپ می‌آیند، نه برای عدد ساختگی.",
      kpi: "تعداد ورود واقعی به لندینگ",
      steps: [
        "یک فرم ساده با اسم و راه تلگرام. بیشتر از این نپرس.",
        "رتبه را فقط با دعوت‌هایی حساب کن که واقعاً وارد شدند.",
        "هر هفته یک جمله از اپ را با اسم خود آدم‌ها منتشر کن.",
      ],
      asset: `${n.app} هنوز بیرون نیست.\n${n.tag}\nاگر جا می‌خواهی، در تلگرام ${n.tg} بنویس «انتظار».\nرتبه مال کسی است که دوستش واقعاً بیاید، نه کسی که شلوغ‌تر دروغ بگوید.\n@${n.ig}`,
    },
    {
      id: "challenge",
      title: "چالش بازساخت",
      min: "soft",
      detail: "هوادار یکی از نقش‌ها را با وسیلهٔ دم‌دست عکس می‌گیرد.",
      kpi: "آثار واقعی منتشرشده در هایلایت",
      steps: [
        "فقط یک نقش را موضوع هفته کن، مثلاً فانوس.",
        "عکس را با اجازه در هایلایت بگذار و صاحبش را منشن کن.",
        "جایزه وایت‌لیست است، نه پول و نه وعدهٔ رشد قیمت.",
      ],
      asset: `چالش این هفتهٔ ${n.col}: نقش را با یک شیء واقعی بساز و برای @${n.ig} بفرست.\nبهترین‌ها، با اسم خودشان، در هایلایت می‌مانند.\nجایزه: جای وایت‌لیست. خریدوفروش با خودمان نداریم.`,
    },
    {
      id: "invite",
      title: "دعوت سه‌تایی",
      min: "sharp",
      detail: "هر نفر سه کد دارد. جایزه جایگاه است، نه کمیسیون مالی.",
      kpi: "دعوت‌هایی که به یک انسان جدید رسیده‌اند",
      steps: [
        "برای هر نفر دقیقاً سه کد بساز، نه لینک بی‌انتها.",
        "کد را در استوری بگذارد و دوستش را با اجازه تگ کند.",
        "اگر کد جعلی یا حساب تکراری دیدی، همان را بسوزان.",
      ],
      asset: `${n.col} فقط ${faNum(n.supply)} نسخه است.\nسه دعوت مال توست. در استوری بگذار و دوستت را تگ کن.\nجایزه: جای وایت‌لیست ${n.app}، نه پول.\nاسپم دیدی، کد را خط می‌زنیم.\n@${n.ig}`,
    },
    {
      id: "story",
      title: "زنجیرهٔ استوری",
      min: "sharp",
      detail: "کنجکاوی واقعی: نقش پیدا است، ماده روز بازشدن معلوم می‌شود.",
      kpi: "ریپست‌هایی که صاحب پیج را واقعاً منشن کرده‌اند",
      steps: [
        "فریم اول فقط تصویر، بدون توضیح اضافه.",
        "فریم دوم یک سؤال مشخص، نه کلیک‌بیت دروغ.",
        "فریم سوم قانون امتیاز. شمارنده را وسط کار عوض نکن.",
      ],
      asset: `فریم ۱ — فقط تصویر اثر.\nفریم ۲ — «مادهٔ این نقش از ${n.col} چیست؟»\nفریم ۳ — ریپست با منشن @${n.ig} یک امتیاز فهرست است.\nاگر مینت کور است، جواب را روز بازشدن بگو. زودتر لو نده.`,
    },
    {
      id: "collab",
      title: "همکاری سه پیج",
      min: "sharp",
      detail: "پیشنهاد به آدم‌هایی که واقعاً می‌شناسی، نه دایرکت انبوه.",
      kpi: "جواب مثبت، نه تعداد پیام فرستاده‌شده",
      steps: [
        "حداکثر ده پیج هم‌اندازه را دست‌چین کن. مخاطبشان باید به کار بیاید.",
        "یک پیام کوتاه بفرست و اگر نه گفتند تمام.",
        "تبادل استوری دوطرفه. عدد فالوور را نخر و ردوبدل نکن.",
      ],
      asset: `سلام. پیج @${n.ig} را دارم و اپ «${n.app}» هنوز عمومی نشده.\nمجموعهٔ خودم، ${n.col}، را با عرضهٔ ${faNum(n.supply)} می‌سازم. کپی مجموعهٔ کسی نیست.\nاگر مخاطبت جور است، یک تبادل استوری تمیز: تو اثر من، من حرف تو.\nاگر نه، همین پیام را نادیده بگیر.`,
    },
    {
      id: "quest",
      title: "ماموریت کانال",
      min: "blast",
      detail: "پنج کار واقعی داخل تلگرام، به‌جای ممبر خریده.",
      kpi: "ماموریت‌های کامل‌شده با اسم",
      steps: [
        "معرفی یک‌خطی، دلیل خواستن اپ، وصف یک نقش.",
        "آوردن یک نفر با اجازه، و یک رأی به تصمیم محصول.",
        "هر پنج تا که شد، اسمش را در فهرست وایت‌لیست بنویس.",
      ],
      asset: `ماموریت ${n.col} در t.me/${n.tg}\n۱ معرفی خودت در یک خط\n۲ بگو ${n.app} را برای چه می‌خواهی\n۳ یک نقش را وصف کن\n۴ یک نفر را با اجازه بیاور، نه از گروه غریبه\n۵ به یک تصمیم محصول رأی بده\nهر پنج تا = وایت‌لیست. خرید ممبر حساب نمی‌شود.`,
    },
    {
      id: "war",
      title: "اتاق ۴۸ساعته",
      min: "blast",
      detail: "همهٔ کانال‌ها در یک پنجرهٔ واقعی، با آدم نه با ربات.",
      kpi: "اجرای ساعت‌ها، و گزارش آخر شب",
      steps: [
        "ساعت‌ها را از قبل بنویس و وسط کار جا‌به‌جا نکن.",
        "هر کانال یک نفر مسئول دارد، حتی اگر آن نفر خودت باشی.",
        "آخر شب عدد واقعی دعوت را بگو، حتی اگر کم بود.",
      ],
      asset: warLines(profile)
        .map((line) => `${line.t} ${line.where} — ${line.what}`)
        .join("\n"),
    },
  ];
  return fresh.map((loop) => {
    const old = prev?.find((item) => item.id === loop.id);
    return { ...loop, armed: old ? old.armed : rankOk(intensity, loop.min) };
  });
}

export function warLines(profile: Profile) {
  const n = names(profile);
  return [
    { t: "۰۹:۰۰", where: "تلگرام", what: `پین پنجرهٔ ${n.col} و قانون سه دعوت` },
    { t: "۱۱:۰۰", where: "استوری", what: "سه فریم شمارش، بدون شمارندهٔ قلابی" },
    { t: "۱۳:۰۰", where: "فید", what: "اثر شاخص با یک خط داستان" },
    { t: "۱۶:۰۰", where: "تلگرام", what: "ماموریت دوساعته: نقش را در یک جمله وصف کن" },
    { t: "۱۸:۰۰", where: "ایکس", what: `رشتهٔ ساخت ${n.col} و وضعیت ${n.app}` },
    { t: "۲۰:۰۰", where: "استوری", what: "بازنشر عکس‌های واقعی چالش، با اجازه" },
    { t: "۲۲:۰۰", where: "هر سه", what: "گزارش شفاف: چند دعوت واقعی آمد" },
  ];
}

export function project(profile: Profile, loops: Loop[], intensity: Intensity) {
  const followers = clamp(profile.followers, 0, 5000000);
  const partners = clamp(profile.partnerFollowers, 0, 5000000);
  const share = clamp(profile.storyShare, 1, 40) / 100;
  const accept = clamp(profile.inviteAccept, 5, 60) / 100;
  const armed = loops.filter((loop) => loop.armed);
  const collabOn = armed.some((loop) => loop.id === "collab");
  const touch = Math.min(1.8, 1 + armed.length * 0.08);
  const floor = Math.round(followers * share);
  const ceil = Math.round((followers + (collabOn ? partners : 0)) * share * touch);
  const wave2 = Math.round(ceil * 3 * accept * 0.35);
  const waitlist = ceil + wave2;
  const mintInterest = Math.round(waitlist * 0.3);
  const boost = intensity === "blast" ? "اتاق ۴۸ساعته روشن است" : intensity === "sharp" ? "تمرکز روی دعوت و همکاری" : "فقط فهرست و چالش";
  return { floor, ceil, wave2, waitlist, mintInterest, armed: armed.length, boost };
}

function traitLine(piece: Piece | undefined, blind: boolean) {
  if (!piece) return "هنوز اثری چیده نشده.";
  if (blind) return `فقط نقش «${piece.formName}» پیدا است. ماده و حال روز بازشدن معلوم می‌شود.`;
  return `${piece.formName} · ${piece.metalName} · ${piece.groundName} · ${piece.airName} · رده ${piece.tier}`;
}

export function buildPosts(input: {
  profile: Profile;
  pieces: Piece[];
  loops: Loop[];
  blindMint: boolean;
  appPublished: boolean;
  note: string;
}): Post[] {
  const n = names(input.profile);
  const hero = input.pieces[0];
  const rare = input.pieces.find((piece) => piece.tier === "شاخص") ?? input.pieces[input.pieces.length - 1];
  const noteLine = input.note.trim() ? `\nزاویهٔ این هفته: ${input.note.trim()}` : "";
  const status = input.appPublished ? "منتشر شده" : "هنوز منتشر نشده";
  const armed = input.loops.filter((loop) => loop.armed).map((loop) => loop.title);
  const armedLine = armed.length ? `\nحلقه‌های روشن: ${armed.join("، ")}.` : "";
  const hash = `#${n.col.replace(/\s+/g, "_")}`;
  return [
    {
      id: "ig-tease",
      channel: "instagram",
      day: "روز ۱",
      kind: "فید",
      title: "تیزر خاموش",
      status: "ready",
      body: `چیزی روی میز است و هنوز همه‌اش را نگفته‌ایم.\n${n.col} · ${faNum(n.supply)} نسخهٔ اصلی.\nاپ ${n.app} ${status}.\n@${n.ig}${noteLine}\n${hash}`,
    },
    {
      id: "tg-pin",
      channel: "telegram",
      day: "روز ۱",
      kind: "پین",
      title: "پیام سنجاق کانال",
      status: "ready",
      body: `به کانال ${n.col} خوش آمدی.\nسه کار این‌جا جلو می‌رود:\n۱ ساخته شدن مجموعه، با لایه و کمیابیِ پیدا\n۲ اپ ${n.app} — ${n.tag} — ${status}\n۳ دعوت واقعی. اسپم و عدد جعلی این‌جا جایی ندارد.\nt.me/${n.tg}`,
    },
    {
      id: "ig-story",
      channel: "instagram",
      day: "روز ۲",
      kind: "استوری",
      title: "سه فریم کنجکاوی",
      status: "ready",
      body: `فریم ۱ — فقط تصویر${hero ? ` «${hero.name}»` : ""}.\nفریم ۲ — «این نقش مال ${n.col} است. ماده چیست؟»\nفریم ۳ — استیکر سؤال و @${n.ig}\nریپست با منشن = یک امتیاز. ریپست الکی برای خودمان نمی‌سازیم.\n${traitLine(hero, input.blindMint)}`,
    },
    {
      id: "x-app",
      channel: "x",
      day: "روز ۳",
      kind: "رشته",
      title: "رشتهٔ معرفی اپ",
      status: "ready",
      body: `۱/ اپ ${n.app} را هنوز عمومی نکرده‌ام.\n${n.tag}\n\n۲/ کنارش ${n.col} را می‌سازم: ${faNum(n.supply)} اثر اصلی. کپی مجموعهٔ معروف نیست.\n\n۳/ هولدر زودتر وارد اپ می‌شود. وعدهٔ قیمت نمی‌دهم.\n\n۴/ جذب با دعوت و ماموریت است. ربات نه.\n\n۵/ @${n.x}`,
    },
    {
      id: "ig-piece",
      channel: "instagram",
      day: "روز ۴",
      kind: "فید",
      title: "معرفی یک اثر",
      status: "ready",
      body: hero
        ? `${hero.name}\n${hero.story}\n${traitLine(hero, input.blindMint)}\n${hash}`
        : `هنوز اثری چیده نشده. از بخش ساخت، چیدمان را بزن.`,
    },
    {
      id: "tg-app",
      channel: "telegram",
      day: "روز ۵",
      kind: "پشت صحنه",
      title: "اپ چرا هنوز بیرون نیست",
      status: "ready",
      body: `${n.app} ${status} چون اول باید سه چیز راست باشد: توضیح یک‌خطی، مجموعه، و یک فهرست از آدم واقعی.\n${n.tag}\nاگر در فهرستی، روز انتشار این‌جا زودتر می‌گویم.\nقول سود نمی‌دهم. قول می‌دهم بیو را وقتی واقعاً منتشر شد عوض کنم.`,
    },
    {
      id: "ig-rare",
      channel: "instagram",
      day: "روز ۷",
      kind: "فید",
      title: "اثر شاخص",
      status: "ready",
      body: rare
        ? `اثر شاخص این چیدمان: ${rare.name}.\nیکی از ${faNum(rare.oneIn)}، داخل عرضهٔ ${faNum(n.supply)}.\n${traitLine(rare, input.blindMint)}\nکمیابی را وزن لایه‌ها ساخته، نه یک برچسب الکی.\n${hash}`
        : "اثر شاخص هنوز نیست.",
    },
    {
      id: "tg-quest",
      channel: "telegram",
      day: "روز ۸",
      kind: "ماموریت",
      title: "پنج کار کانال",
      status: "ready",
      body: `ماموریت برای وایت‌لیست ${n.col}:\n۱ معرفی یک‌خطی\n۲ دلیل خواستن ${n.app}\n۳ وصف یک نقش\n۴ آوردن یک نفر با اجازه\n۵ یک رأی محصول\nخرید ممبر و حساب دوم خط می‌خورد.`,
    },
    {
      id: "x-art",
      channel: "x",
      day: "روز ۹",
      kind: "رشته",
      title: "رشتهٔ ساخت مجموعه",
      status: "ready",
      body: `۱/ ${n.col} چهار لایه دارد: زمینه، نقش، ماده، حال.\n\n۲/ وزن هر لایه معلوم است. برای همین می‌شود گفت هر ترکیب تقریباً یکی از چندتاست.\n\n۳/ هشت پیش‌نمایش این‌جا است. بقیهٔ ${faNum(n.supply)} با همین قانون چیده می‌شود.\n\n۴/ مقصد پیشنهادی شبکه: ${n.chain}. خودِ مینت را در مارکت‌پلیس خودت می‌زنی.\n\n۵/ @${n.x}`,
    },
    {
      id: "site-land",
      channel: "site",
      day: "روز ۱۰",
      kind: "لندینگ",
      title: "متن صفحهٔ انتظار",
      status: "ready",
      body: `${n.app}\n${n.tag}\n\n${n.col}: ${faNum(n.supply)} نسخهٔ اصلی روی ${n.chain}.\nهولدر زودتر وارد اپ می‌شود.\n\nفهرست انتظار این‌جا است. دعوت سه‌تایی رتبه می‌سازد.\nعدد جعلی منتشر نمی‌کنیم.\n\nاینستاگرام @${n.ig}\nتلگرام t.me/${n.tg}`,
    },
    {
      id: "ig-wait",
      channel: "instagram",
      day: "روز ۱۲",
      kind: "فید",
      title: "دعوت به فهرست",
      status: "ready",
      body: `اگر ${n.app} را می‌خواهی، قبل از انتشار بیا در فهرست.\n${n.col} جدا است و جدا هم می‌ماند: هنر، بهانهٔ دروغین برای شلوغ کردن اپ نیست.${armedLine}\n@${n.ig}\n${hash}`,
    },
    {
      id: "tg-war",
      channel: "telegram",
      day: "روز ۱۴",
      kind: "اتاق جنگ",
      title: "دستور همان ۴۸ ساعت",
      status: "ready",
      body: `پنجرهٔ ${n.col} و خبر ${n.app}.\n${warLines(input.profile)
        .map((line) => `${line.t} — ${line.where}: ${line.what}`)
        .join("\n")}\nآخر شب عدد را همان‌طور که هست بگو.${armedLine}`,
    },
  ];
}

function listings(profile: Profile, appPublished: boolean) {
  const n = names(profile);
  const status = appPublished ? "منتشرشده" : "پیش از انتشار";
  const listingFa = `${n.app}\n${n.tag}\n\nوضعیت: ${status}\n\nبرای کسی که پیج اینستاگرام و کانال تلگرام و یک مجموعهٔ هنری را با هم جلو می‌برد.\n\nچه می‌کند\n— ریتم روز را کوتاه و پیدا نگه می‌دارد\n— مجموعهٔ ${n.col} را کنار ابزار شخصی‌ات می‌گذارد\n— هولدر مجموعه زودتر وارد می‌شود\n\nاین متن را در استور یا صفحهٔ انتظار بگذار. آتلیه خودش اپ را در استور ثبت نمی‌کند.`;
  const listingEn = `${n.app} — ${n.tag}\nStatus: ${appPublished ? "published" : "not published yet"}.\nA quiet personal app beside the original collection ${n.col} (${faNum(n.supply)} editions). Holders enter first. No price promise.`;
  const bio = `${n.app} · ${appPublished ? "منتشر شد" : "هنوز منتشر نشده"}\n${n.col} · ${faNum(n.supply)} نسخهٔ اصلی\nدعوت واقعی، نه عدد جعلی\nt.me/${n.tg}`;
  const privacy = `${n.app} اسم پیج و متن‌ها را روی همین دستگاه نگه می‌دارد. از این‌جا چیزی به اینستاگرام، تلگرام یا شبکه فرستاده نمی‌شود. اثرها را خودت در مارکت‌پلیس بارگذاری می‌کنی. مجموعهٔ کسی کپی نمی‌شود.`;
  return { listingFa, listingEn, bio, privacy };
}

export function buildChecks(input: {
  profile: Profile;
  pieces: Piece[];
  loops: Loop[];
}): Check[] {
  const n = names(input.profile);
  const armed = input.loops.filter((loop) => loop.armed).length;
  return [
    { id: "check-listing", track: "app", auto: true, done: false, title: "متن استور نوشته شد", detail: `${n.app} — ${n.tag}` },
    { id: "check-bio", track: "app", auto: true, done: false, title: "بیو آماده است", detail: "در نشر کپی کن و در پروفایل بگذار." },
    { id: "check-privacy", track: "app", auto: true, done: false, title: "یک پاراگراف حریم", detail: "کنار لندینگ بگذار، پیش از این‌که اسم کسی را بگیری." },
    { id: "check-publish-app", track: "app", auto: false, done: false, title: "خودت اپ را منتشر کن", detail: "آتلیه دکمهٔ استور ندارد. وقتی واقعاً رفت بالا، کلید «منتشر شد» را بزن." },
    { id: "check-preview", track: "art", auto: true, done: false, title: "هشت پیش‌نمایش چیده شد", detail: input.pieces.map((p) => p.name).slice(0, 3).join("، ") || "هنوز خالی است" },
    { id: "check-rarity", track: "art", auto: true, done: false, title: "جدول کمیابی از روی وزن‌ها", detail: `عرضهٔ هدف ${faNum(n.supply)}. شاخص را وزن کم ساخته.` },
    { id: "check-meta", track: "art", auto: true, done: false, title: "متادیتا آمادهٔ کپی است", detail: `شبکهٔ مقصد نوشته‌شده: ${n.chain}. تراکنش از این‌جا زده نمی‌شود.` },
    { id: "check-market", track: "art", auto: false, done: false, title: "بارگذاری در مارکت‌پلیس", detail: "فایل متادیتا را خودت آن‌جا بگذار. صفحهٔ مینت جعلی نساز." },
    { id: "check-loops", track: "growth", auto: true, done: false, title: "حلقه‌های جذب نوشته شد", detail: `${faNum(armed)} حلقه روشن است. متن هر کدام قابل کپی است.` },
    { id: "check-war", track: "growth", auto: true, done: false, title: "اتاق ۴۸ساعته زمان‌بندی شد", detail: "ساعت‌ها را همان روز اجرا کن، با دست خودت." },
    { id: "check-posts", track: "growth", auto: true, done: false, title: "بستهٔ اینستا، تلگرام و ایکس", detail: "کپی کن، منتشر کن، بعد در آتلیه علامت بزن." },
    { id: "check-live", track: "growth", auto: false, done: false, title: "فهرست را با آدم واقعی باز کن", detail: "اول ده نفر که می‌شناسی. نه گروه خرید ممبر، نه دایرکت انبوه." },
  ];
}

function mergePosts(fresh: Post[], prev: Post[]) {
  return fresh.map((post) => {
    const old = prev.find((item) => item.id === post.id);
    return old ? { ...post, status: old.status } : post;
  });
}

function mergeChecks(fresh: Check[], prev: Check[]) {
  return fresh.map((check) => {
    const old = prev.find((item) => item.id === check.id);
    return { ...check, done: check.auto ? true : (old?.done ?? false) };
  });
}

export function assemble(data: StudioData, mode: "keep-arms" | "reset-arms") {
  const loops = buildLoops(
    data.profile,
    data.intensity,
    mode === "keep-arms" ? data.loops : undefined,
  );
  const posts = mergePosts(
    buildPosts({
      profile: data.profile,
      pieces: data.pieces,
      loops,
      blindMint: data.blindMint,
      appPublished: data.appPublished,
      note: data.note,
    }),
    data.posts,
  );
  const checks = mergeChecks(
    buildChecks({ profile: data.profile, pieces: data.pieces, loops }),
    data.checks,
  );
  const copy = listings(data.profile, data.appPublished);
  return {
    loops,
    posts,
    checks,
    ...copy,
    signature: sign(data.profile, {
      note: data.note,
      blind: data.blindMint,
      published: data.appPublished,
    }),
  };
}

export function metadataJson(pieces: Piece[], profile: Profile) {
  const n = names(profile);
  return JSON.stringify(
    pieces.map((piece) => ({
      name: `${n.col} #${piece.index}`,
      description: piece.story,
      attributes: [
        { trait_type: "نام", value: piece.name },
        { trait_type: "نقش", value: piece.formName },
        { trait_type: "ماده", value: piece.metalName },
        { trait_type: "زمینه", value: piece.groundName },
        { trait_type: "حال", value: piece.airName },
        { trait_type: "رده", value: piece.tier },
      ],
    })),
    null,
    2,
  );
}

export function initialStudio(): StudioData {
  const profile = defaultProfile();
  const layers = defaultLayers();
  const seed = 7;
  const pieces = rollPieces(layers, seed, profile);
  const draft: StudioData = {
    profile,
    layers,
    pieces,
    seed,
    rolledStamp: layerStamp(layers),
    intensity: "blast",
    loops: [],
    posts: [],
    checks: [],
    listingFa: "",
    listingEn: "",
    bio: "",
    privacy: "",
    signature: "",
    blindMint: true,
    appPublished: false,
    note: "",
    log: [
      "پلن نمونه چیده شد: هشت اثر، موتور جذب انفجاری تمیز، و متن اینستا و تلگرام.",
      "کلاه سیاه این‌جا ابزار ندارد. نام پیج و اپ را بگذار و از دستیار بخواه دوباره بچیند.",
    ],
  };
  return { ...draft, ...assemble(draft, "reset-arms") };
}

export const BLOCKED_REPLY =
  "این مسیر را نمی‌چینم: ربات، فالوور یا حجم جعلی، اسپم، معامله با خودت، صفحهٔ مینت قلابی، یا کپی آثار معروف. پیج را می‌بندد و مجموعه را بی‌اعتبار می‌کند. به‌جایش حالت انفجاری تمیز را مسلح کردم.";

export function assistantIntent(text: string): "blocked" | "reroll" | "blast" | "compile" {
  const t = text.trim();
  if (
    /ربات|فیک|جعلی|اسپم|کلاه\s*سیاه|واش|wash|فیشینگ|سیبیل|چند\s*حساب|چند\s*اکانت|پامپ|خرید\s*بازدید|خرید\s*فالو|منشن\s*بمب|کپی\s*(پانک|ایپ|بورد|کریپتو)|بامپ/i.test(
      t,
    )
  ) {
    return "blocked";
  }
  if (/بچین|مجموعه|اثر|لایه|کمیاب|متادیتا|nft|ان.?اف.?تی|هنر/i.test(t)) return "reroll";
  if (/انفجار|ویروس|جذب|دعوت|وایت|اتاق/i.test(t)) return "blast";
  return "compile";
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  x: "ایکس",
  site: "لندینگ",
};

export const TRACK_LABEL = {
  app: "اپ",
  art: "مجموعه",
  growth: "جذب",
} as const;

export const INTENSITY_LABEL: Record<Intensity, string> = {
  soft: "آرام",
  sharp: "تند",
  blast: "انفجاری",
};
