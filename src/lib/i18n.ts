// Home-screen languages. The choice lives in a cookie; English is the default so demos open in English.

export const LOCALES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "tr", name: "Türkçe" },
  { code: "ar", name: "العربية", rtl: true },
  { code: "hi", name: "हिन्दी" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "简体中文" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lk_locale";

export function isLocale(x: string | undefined | null): x is Locale {
  return !!x && LOCALES.some((l) => l.code === x);
}
export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALES.some((l) => l.code === locale && "rtl" in l) ? "rtl" : "ltr";
}
/** "Uploading {pct}%" + { pct: 40 } → "Uploading 40%" */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

const en = {
  langLabel: "Language",
  nav: { myLaunches: "My launches", pricing: "Pricing", account: "Account" },
  hero: {
    line1: "Make it once.",
    line2: "Launch it everywhere.",
    sub: "One phone video of you making your product. Claude turns it into everything you need to sell it — in about five minutes.",
  },
  drop: {
    title: "Drop your making-of video",
    sub: "or a handful of product photos · phone footage is perfect",
    choose: "Choose a file",
    build: "Build my launch kit",
    preparing: "Preparing…",
    uploading: "Uploading {pct}%",
    starting: "Starting…",
    change: "change",
    photoOne: "1 photo",
    photoMany: "{n} photos",
    productName: "Product name",
    productNamePh: "Speckled stoneware mug",
    materials: "Materials",
    materialsPh: "Stoneware clay, food-safe glaze",
    price: "Price you have in mind",
    pricePh: "$42.00",
    shipsFrom: "Ships from",
    shipsFromPh: "Portland, OR",
    optional: "All optional. Materials are hard to tell from video alone, so add them if you know.", unsupported: "Only video or photo files work here.", titleTouch: "Pick your making-of video",
    oneVideo: "One video per launch — pick your best take.",
    outOfLaunches: "You're out of launches this month. Upgrade to keep going.",
    generic: "We couldn't start your launch kit. Wait a moment and try again.",
  },
  outputs: {
    heading: "What comes out, every time",
    saved: "About {h} hours of work, done in 5 minutes",
    listing: ["Etsy listing", "Title, 13 tags, description, price"],
    photos: ["5 photos", "Picked from your footage"],
    shorts: ["3 shorts", "TikTok, Reels, Shorts — three different hooks"],
    markets: ["4 markets", "UK, DE, AU, CA — translated and priced"],
    publish: ["Published", "Shopify, TikTok, Pinterest"],
  },
  plans: {
    free: "Free", maker: "Maker", studio: "Studio", perMonth: "/ mo",
    launches: "{n} launches a month", unlimited: "Unlimited launches",
    watermark: "watermark", studioExtras: "auto-publish, markets, analytics",
  },
  footer: { extra: "Extra launches $2 each. Cancel anytime.", editable: "Everything is editable before you publish." },
};

export type Messages = typeof en;
export type OutputKey = keyof Omit<Messages["outputs"], "heading" | "saved">;

const es: Messages = {
  langLabel: "Idioma",
  nav: { myLaunches: "Mis lanzamientos", pricing: "Precios", account: "Cuenta" },
  hero: { line1: "Hazlo una vez.", line2: "Lánzalo en todas partes.", sub: "Un video con el teléfono mientras haces tu producto. Claude lo convierte en todo lo que necesitas para venderlo, en unos cinco minutos." },
  drop: {
    title: "Suelta aquí el video de tu proceso", sub: "o unas cuantas fotos del producto · lo grabado con el teléfono es perfecto",
    choose: "Elegir un archivo", build: "Crear mi kit de lanzamiento", preparing: "Preparando…", uploading: "Subiendo {pct}%", starting: "Empezando…",
    change: "cambiar", photoOne: "1 foto", photoMany: "{n} fotos",
    productName: "Nombre del producto", productNamePh: "Taza de gres moteada", materials: "Materiales", materialsPh: "Arcilla de gres, esmalte apto para alimentos",
    price: "Precio que tienes en mente", pricePh: "$42.00", shipsFrom: "Se envía desde", shipsFromPh: "Portland, OR",
    optional: "Todo es opcional. Los materiales cuesta verlos solo en video, así que añádelos si los sabes.", unsupported: "Aquí solo funcionan archivos de video o foto.", titleTouch: "Elige el video de tu proceso", oneVideo: "Un video por lanzamiento: elige tu mejor toma.",
    outOfLaunches: "Ya usaste tus lanzamientos de este mes. Mejora tu plan para seguir.", generic: "No pudimos empezar tu kit. Espera un momento y vuelve a intentarlo.",
  },
  outputs: {
    heading: "Lo que recibes, siempre", saved: "Unas {h} horas de trabajo, hechas en 5 minutos",
    listing: ["Anuncio de Etsy", "Título, 13 etiquetas, descripción, precio"], photos: ["5 fotos", "Elegidas de tu video"],
    shorts: ["3 videos cortos", "TikTok, Reels, Shorts: tres ganchos distintos"], markets: ["4 mercados", "UK, DE, AU, CA: traducido y con precio"],
    publish: ["Publicado", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Gratis", maker: "Maker", studio: "Studio", perMonth: "/ mes", launches: "{n} lanzamientos al mes", unlimited: "Lanzamientos ilimitados", watermark: "marca de agua", studioExtras: "publicación automática, mercados, analíticas" },
  footer: { extra: "Lanzamientos extra a $2 cada uno. Cancela cuando quieras.", editable: "Puedes editar todo antes de publicar." },
};

const pt: Messages = {
  langLabel: "Idioma",
  nav: { myLaunches: "Meus lançamentos", pricing: "Preços", account: "Conta" },
  hero: { line1: "Faça uma vez.", line2: "Lance em todo lugar.", sub: "Um vídeo de celular mostrando você fazendo seu produto. O Claude transforma isso em tudo o que você precisa para vender, em uns cinco minutos." },
  drop: {
    title: "Solte aqui o vídeo do processo", sub: "ou algumas fotos do produto · vídeo de celular é perfeito",
    choose: "Escolher arquivo", build: "Criar meu kit de lançamento", preparing: "Preparando…", uploading: "Enviando {pct}%", starting: "Começando…",
    change: "trocar", photoOne: "1 foto", photoMany: "{n} fotos",
    productName: "Nome do produto", productNamePh: "Caneca de grés salpicada", materials: "Materiais", materialsPh: "Argila de grés, esmalte atóxico",
    price: "Preço que você tem em mente", pricePh: "$42.00", shipsFrom: "Envia de", shipsFromPh: "Portland, OR",
    optional: "Tudo opcional. Materiais são difíceis de ver só pelo vídeo, então informe se souber.", unsupported: "Só funcionam arquivos de vídeo ou foto.", titleTouch: "Escolha o vídeo do processo", oneVideo: "Um vídeo por lançamento: escolha sua melhor gravação.",
    outOfLaunches: "Seus lançamentos deste mês acabaram. Faça upgrade para continuar.", generic: "Não conseguimos começar seu kit. Espere um pouco e tente de novo.",
  },
  outputs: {
    heading: "O que sai, toda vez", saved: "Cerca de {h} horas de trabalho, feitas em 5 minutos",
    listing: ["Anúncio na Etsy", "Título, 13 tags, descrição, preço"], photos: ["5 fotos", "Escolhidas do seu vídeo"],
    shorts: ["3 vídeos curtos", "TikTok, Reels, Shorts: três ganchos diferentes"], markets: ["4 mercados", "UK, DE, AU, CA: traduzido e com preço"],
    publish: ["Publicado", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Grátis", maker: "Maker", studio: "Studio", perMonth: "/ mês", launches: "{n} lançamentos por mês", unlimited: "Lançamentos ilimitados", watermark: "marca d’água", studioExtras: "publicação automática, mercados, análises" },
  footer: { extra: "Lançamentos extras por $2 cada. Cancele quando quiser.", editable: "Tudo pode ser editado antes de publicar." },
};

const fr: Messages = {
  langLabel: "Langue",
  nav: { myLaunches: "Mes lancements", pricing: "Tarifs", account: "Compte" },
  hero: { line1: "Créez-le une fois.", line2: "Lancez-le partout.", sub: "Une vidéo au téléphone de vous en train de fabriquer votre produit. Claude en tire tout ce qu’il faut pour le vendre, en cinq minutes environ." },
  drop: {
    title: "Déposez votre vidéo de fabrication", sub: "ou quelques photos du produit · une vidéo au téléphone suffit",
    choose: "Choisir un fichier", build: "Créer mon kit de lancement", preparing: "Préparation…", uploading: "Envoi {pct} %", starting: "Démarrage…",
    change: "changer", photoOne: "1 photo", photoMany: "{n} photos",
    productName: "Nom du produit", productNamePh: "Mug en grès moucheté", materials: "Matériaux", materialsPh: "Argile de grès, émail alimentaire",
    price: "Prix envisagé", pricePh: "42,00 $", shipsFrom: "Expédié depuis", shipsFromPh: "Portland, OR",
    optional: "Tout est facultatif. Les matières se devinent mal en vidéo : indiquez-les si vous les connaissez.", unsupported: "Seuls les fichiers vidéo ou photo sont acceptés.", titleTouch: "Choisissez votre vidéo de fabrication", oneVideo: "Une vidéo par lancement : choisissez votre meilleure prise.",
    outOfLaunches: "Vous n’avez plus de lancements ce mois-ci. Passez à l’offre supérieure pour continuer.", generic: "Impossible de lancer votre kit. Patientez un instant et réessayez.",
  },
  outputs: {
    heading: "Ce que vous obtenez, à chaque fois", saved: "Environ {h} heures de travail, faites en 5 minutes",
    listing: ["Annonce Etsy", "Titre, 13 tags, description, prix"], photos: ["5 photos", "Choisies dans votre vidéo"],
    shorts: ["3 vidéos courtes", "TikTok, Reels, Shorts : trois accroches différentes"], markets: ["4 marchés", "UK, DE, AU, CA : traduit et au bon prix"],
    publish: ["Publié", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Gratuit", maker: "Maker", studio: "Studio", perMonth: "/ mois", launches: "{n} lancements par mois", unlimited: "Lancements illimités", watermark: "filigrane", studioExtras: "publication auto, marchés, statistiques" },
  footer: { extra: "Lancements supplémentaires à 2 $ chacun. Résiliable à tout moment.", editable: "Tout reste modifiable avant publication." },
};

const de: Messages = {
  langLabel: "Sprache",
  nav: { myLaunches: "Meine Launches", pricing: "Preise", account: "Konto" },
  hero: { line1: "Einmal machen.", line2: "Überall launchen.", sub: "Ein Handyvideo davon, wie du dein Produkt herstellst. Claude macht daraus alles, was du zum Verkaufen brauchst – in etwa fünf Minuten." },
  drop: {
    title: "Leg dein Making-of-Video hier ab", sub: "oder ein paar Produktfotos · Handyaufnahmen sind perfekt",
    choose: "Datei auswählen", build: "Mein Launch-Kit erstellen", preparing: "Wird vorbereitet…", uploading: "Wird hochgeladen {pct} %", starting: "Startet…",
    change: "ändern", photoOne: "1 Foto", photoMany: "{n} Fotos",
    productName: "Produktname", productNamePh: "Gesprenkelter Steinzeugbecher", materials: "Materialien", materialsPh: "Steinzeugton, lebensmittelechte Glasur",
    price: "Preisvorstellung", pricePh: "42,00 $", shipsFrom: "Versand aus", shipsFromPh: "Portland, OR",
    optional: "Alles optional. Materialien sieht man im Video schlecht, trag sie ein, wenn du sie kennst.", unsupported: "Hier gehen nur Video- oder Fotodateien.", titleTouch: "Wähle dein Making-of-Video", oneVideo: "Ein Video pro Launch – wähle deine beste Aufnahme.",
    outOfLaunches: "Deine Launches für diesen Monat sind aufgebraucht. Mach ein Upgrade, um weiterzumachen.", generic: "Dein Kit konnte nicht starten. Warte kurz und versuch es noch einmal.",
  },
  outputs: {
    heading: "Das bekommst du, jedes Mal", saved: "Etwa {h} Stunden Arbeit, erledigt in 5 Minuten",
    listing: ["Etsy-Angebot", "Titel, 13 Tags, Beschreibung, Preis"], photos: ["5 Fotos", "Aus deinem Video ausgewählt"],
    shorts: ["3 Kurzvideos", "TikTok, Reels, Shorts – drei verschiedene Hooks"], markets: ["4 Märkte", "UK, DE, AU, CA – übersetzt und mit Preis"],
    publish: ["Veröffentlicht", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Kostenlos", maker: "Maker", studio: "Studio", perMonth: "/ Monat", launches: "{n} Launches pro Monat", unlimited: "Unbegrenzte Launches", watermark: "Wasserzeichen", studioExtras: "Auto-Veröffentlichung, Märkte, Analysen" },
  footer: { extra: "Zusätzliche Launches je 2 $. Jederzeit kündbar.", editable: "Vor dem Veröffentlichen ist alles bearbeitbar." },
};

const it: Messages = {
  langLabel: "Lingua",
  nav: { myLaunches: "I miei lanci", pricing: "Prezzi", account: "Account" },
  hero: { line1: "Fallo una volta.", line2: "Lancialo ovunque.", sub: "Un video col telefono mentre crei il tuo prodotto. Claude lo trasforma in tutto ciò che ti serve per venderlo, in circa cinque minuti." },
  drop: {
    title: "Trascina qui il video della lavorazione", sub: "o qualche foto del prodotto · va benissimo girato col telefono",
    choose: "Scegli un file", build: "Crea il mio kit di lancio", preparing: "Preparazione…", uploading: "Caricamento {pct}%", starting: "Avvio…",
    change: "cambia", photoOne: "1 foto", photoMany: "{n} foto",
    productName: "Nome del prodotto", productNamePh: "Tazza in gres puntinato", materials: "Materiali", materialsPh: "Argilla gres, smalto per alimenti",
    price: "Prezzo che hai in mente", pricePh: "42,00 $", shipsFrom: "Spedito da", shipsFromPh: "Portland, OR",
    optional: "Tutto facoltativo. I materiali si capiscono poco dal video: aggiungili se li conosci.", unsupported: "Qui funzionano solo file video o foto.", titleTouch: "Scegli il video della lavorazione", oneVideo: "Un video per lancio: scegli la ripresa migliore.",
    outOfLaunches: "Hai finito i lanci di questo mese. Passa a un piano superiore per continuare.", generic: "Non siamo riusciti ad avviare il tuo kit. Aspetta un momento e riprova.",
  },
  outputs: {
    heading: "Cosa ottieni, ogni volta", saved: "Circa {h} ore di lavoro, fatte in 5 minuti",
    listing: ["Inserzione Etsy", "Titolo, 13 tag, descrizione, prezzo"], photos: ["5 foto", "Scelte dal tuo video"],
    shorts: ["3 video brevi", "TikTok, Reels, Shorts: tre attacchi diversi"], markets: ["4 mercati", "UK, DE, AU, CA: tradotto e con prezzo"],
    publish: ["Pubblicato", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Gratis", maker: "Maker", studio: "Studio", perMonth: "/ mese", launches: "{n} lanci al mese", unlimited: "Lanci illimitati", watermark: "filigrana", studioExtras: "pubblicazione automatica, mercati, statistiche" },
  footer: { extra: "Lanci extra a 2 $ l’uno. Disdici quando vuoi.", editable: "Puoi modificare tutto prima di pubblicare." },
};

const nl: Messages = {
  langLabel: "Taal",
  nav: { myLaunches: "Mijn lanceringen", pricing: "Prijzen", account: "Account" },
  hero: { line1: "Maak het één keer.", line2: "Lanceer het overal.", sub: "Eén telefoonvideo van jou terwijl je je product maakt. Claude maakt daar alles van wat je nodig hebt om het te verkopen, in ongeveer vijf minuten." },
  drop: {
    title: "Sleep je making-of-video hierheen", sub: "of een paar productfoto’s · telefoonbeelden zijn perfect",
    choose: "Kies een bestand", build: "Maak mijn lanceerkit", preparing: "Voorbereiden…", uploading: "Uploaden {pct}%", starting: "Starten…",
    change: "wijzigen", photoOne: "1 foto", photoMany: "{n} foto’s",
    productName: "Productnaam", productNamePh: "Gespikkelde mok van steengoed", materials: "Materialen", materialsPh: "Steengoedklei, voedselveilig glazuur",
    price: "Prijs die je in gedachten hebt", pricePh: "$42.00", shipsFrom: "Verzonden vanuit", shipsFromPh: "Portland, OR",
    optional: "Alles is optioneel. Materialen zie je slecht op video, dus vul ze in als je ze weet.", unsupported: "Alleen video- of fotobestanden werken hier.", titleTouch: "Kies je making-of-video", oneVideo: "Eén video per lancering: kies je beste opname.",
    outOfLaunches: "Je lanceringen voor deze maand zijn op. Upgrade om door te gaan.", generic: "Je kit kon niet starten. Wacht even en probeer het opnieuw.",
  },
  outputs: {
    heading: "Dit krijg je, elke keer", saved: "Ongeveer {h} uur werk, klaar in 5 minuten",
    listing: ["Etsy-advertentie", "Titel, 13 tags, beschrijving, prijs"], photos: ["5 foto’s", "Gekozen uit je video"],
    shorts: ["3 korte video’s", "TikTok, Reels, Shorts: drie verschillende hooks"], markets: ["4 markten", "UK, DE, AU, CA: vertaald en geprijsd"],
    publish: ["Gepubliceerd", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Gratis", maker: "Maker", studio: "Studio", perMonth: "/ mnd", launches: "{n} lanceringen per maand", unlimited: "Onbeperkt lanceren", watermark: "watermerk", studioExtras: "automatisch publiceren, markten, statistieken" },
  footer: { extra: "Extra lanceringen $2 per stuk. Altijd opzegbaar.", editable: "Alles is aan te passen voordat je publiceert." },
};

const tr: Messages = {
  langLabel: "Dil",
  nav: { myLaunches: "Lansmanlarım", pricing: "Fiyatlar", account: "Hesap" },
  hero: { line1: "Bir kez yap.", line2: "Her yerde satışa çıkar.", sub: "Ürününü yaparken telefonla çektiğin tek bir video. Claude onu satmak için gereken her şeye dönüştürür, yaklaşık beş dakikada." },
  drop: {
    title: "Yapım videonu buraya bırak", sub: "ya da birkaç ürün fotoğrafı · telefon çekimi gayet yeterli",
    choose: "Dosya seç", build: "Lansman kitimi oluştur", preparing: "Hazırlanıyor…", uploading: "Yükleniyor %{pct}", starting: "Başlıyor…",
    change: "değiştir", photoOne: "1 fotoğraf", photoMany: "{n} fotoğraf",
    productName: "Ürün adı", productNamePh: "Benekli taş seramik kupa", materials: "Malzemeler", materialsPh: "Taş seramik kili, gıdaya uygun sır",
    price: "Aklındaki fiyat", pricePh: "$42.00", shipsFrom: "Gönderim yeri", shipsFromPh: "Portland, OR",
    optional: "Hepsi isteğe bağlı. Malzemeyi videodan anlamak zor, biliyorsan yaz.", unsupported: "Burada yalnızca video veya fotoğraf dosyaları çalışır.", titleTouch: "Yapım videonu seç", oneVideo: "Her lansmana bir video — en iyi çekimini seç.",
    outOfLaunches: "Bu ayki lansman hakkın bitti. Devam etmek için planını yükselt.", generic: "Kitin başlatılamadı. Biraz bekleyip tekrar dene.",
  },
  outputs: {
    heading: "Her seferinde elde ettiklerin", saved: "Yaklaşık {h} saatlik iş, 5 dakikada",
    listing: ["Etsy ilanı", "Başlık, 13 etiket, açıklama, fiyat"], photos: ["5 fotoğraf", "Videondan seçildi"],
    shorts: ["3 kısa video", "TikTok, Reels, Shorts — üç farklı giriş"], markets: ["4 pazar", "UK, DE, AU, CA — çevrildi ve fiyatlandı"],
    publish: ["Yayında", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Ücretsiz", maker: "Maker", studio: "Studio", perMonth: "/ ay", launches: "Ayda {n} lansman", unlimited: "Sınırsız lansman", watermark: "filigranlı", studioExtras: "otomatik yayın, pazarlar, analiz" },
  footer: { extra: "Ek lansmanlar tanesi $2. İstediğin zaman iptal et.", editable: "Yayınlamadan önce her şey düzenlenebilir." },
};

const ar: Messages = {
  langLabel: "اللغة",
  nav: { myLaunches: "إطلاقاتي", pricing: "الأسعار", account: "الحساب" },
  hero: { line1: "اصنعه مرة واحدة.", line2: "وأطلقه في كل مكان.", sub: "فيديو واحد بالهاتف وأنت تصنع منتجك. يحوّله Claude إلى كل ما تحتاجه لبيعه، في نحو خمس دقائق." },
  drop: {
    title: "أفلت هنا فيديو صناعة منتجك", sub: "أو بضع صور للمنتج · تصوير الهاتف ممتاز",
    choose: "اختر ملفًا", build: "أنشئ حزمة الإطلاق", preparing: "جارٍ التحضير…", uploading: "جارٍ الرفع {pct}%", starting: "جارٍ البدء…",
    change: "تغيير", photoOne: "صورة واحدة", photoMany: "الصور: {n}",
    productName: "اسم المنتج", productNamePh: "كوب من الفخار المرقّط", materials: "المواد", materialsPh: "طين فخاري، طلاء آمن للطعام",
    price: "السعر الذي تفكر فيه", pricePh: "$42.00", shipsFrom: "يُشحن من", shipsFromPh: "Portland, OR",
    optional: "كل الحقول اختيارية. يصعب معرفة الخامات من الفيديو وحده، فأضفها إن كنت تعرفها.", unsupported: "تُقبل هنا ملفات الفيديو أو الصور فقط.", titleTouch: "اختر فيديو صناعة منتجك", oneVideo: "فيديو واحد لكل إطلاق، اختر أفضل لقطة.",
    outOfLaunches: "استنفدت إطلاقات هذا الشهر. رقِّ خطتك للمتابعة.", generic: "تعذّر بدء مجموعتك. انتظر قليلًا ثم حاول مرة أخرى.",
  },
  outputs: {
    heading: "ما تحصل عليه في كل مرة", saved: "نحو {h} ساعات من العمل في 5 دقائق",
    listing: ["قائمة Etsy", "عنوان، 13 وسمًا، وصف، سعر"], photos: ["5 صور", "مختارة من الفيديو"],
    shorts: ["3 فيديوهات قصيرة", "TikTok وReels وShorts، ثلاث بدايات مختلفة"], markets: ["4 أسواق", "UK وDE وAU وCA، مترجمة ومسعّرة"],
    publish: ["منشور", "Shopify وTikTok وPinterest"],
  },
  plans: { free: "مجاني", maker: "Maker", studio: "Studio", perMonth: "/ شهر", launches: "الإطلاقات شهريًا: {n}", unlimited: "إطلاقات غير محدودة", watermark: "علامة مائية", studioExtras: "نشر تلقائي، أسواق، تحليلات" },
  footer: { extra: "الإطلاق الإضافي بـ 2$. ألغِ متى شئت.", editable: "يمكنك تعديل كل شيء قبل النشر." },
};

const hi: Messages = {
  langLabel: "भाषा",
  nav: { myLaunches: "मेरे लॉन्च", pricing: "कीमतें", account: "खाता" },
  hero: { line1: "एक बार बनाइए।", line2: "हर जगह लॉन्च कीजिए।", sub: "अपना प्रोडक्ट बनाते हुए फ़ोन से बना एक वीडियो। Claude उसे बेचने के लिए ज़रूरी हर चीज़ में बदल देता है, लगभग पाँच मिनट में।" },
  drop: {
    title: "अपना मेकिंग वीडियो यहाँ छोड़ें", sub: "या प्रोडक्ट की कुछ तस्वीरें · फ़ोन की फ़ुटेज बिल्कुल ठीक है",
    choose: "फ़ाइल चुनें", build: "मेरा लॉन्च किट बनाइए", preparing: "तैयारी हो रही है…", uploading: "अपलोड हो रहा है {pct}%", starting: "शुरू हो रहा है…",
    change: "बदलें", photoOne: "1 फ़ोटो", photoMany: "{n} फ़ोटो",
    productName: "प्रोडक्ट का नाम", productNamePh: "चित्तीदार स्टोनवेयर मग", materials: "सामग्री", materialsPh: "स्टोनवेयर मिट्टी, फ़ूड-सेफ़ ग्लेज़",
    price: "आपके मन की कीमत", pricePh: "$42.00", shipsFrom: "कहाँ से भेजा जाएगा", shipsFromPh: "Portland, OR",
    optional: "सब कुछ वैकल्पिक है। सिर्फ़ वीडियो से सामग्री पता करना मुश्किल है, पता हो तो लिख दें।", unsupported: "यहाँ सिर्फ़ वीडियो या फ़ोटो फ़ाइलें चलती हैं।", titleTouch: "अपना मेकिंग वीडियो चुनें", oneVideo: "हर लॉन्च में एक ही वीडियो — अपना सबसे अच्छा टेक चुनें।",
    outOfLaunches: "इस महीने के आपके लॉन्च खत्म हो गए हैं। जारी रखने के लिए अपग्रेड करें।", generic: "आपकी किट शुरू नहीं हो सकी। थोड़ा रुककर फिर से कोशिश करें।",
  },
  outputs: {
    heading: "हर बार आपको मिलता है", saved: "लगभग {h} घंटे का काम, 5 मिनट में",
    listing: ["Etsy लिस्टिंग", "टाइटल, 13 टैग, विवरण, कीमत"], photos: ["5 फ़ोटो", "आपकी फ़ुटेज से चुनी गईं"],
    shorts: ["3 शॉर्ट्स", "TikTok, Reels, Shorts — तीन अलग हुक"], markets: ["4 बाज़ार", "UK, DE, AU, CA — अनुवाद और कीमत के साथ"],
    publish: ["प्रकाशित", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "मुफ़्त", maker: "Maker", studio: "Studio", perMonth: "/ महीना", launches: "महीने में {n} लॉन्च", unlimited: "असीमित लॉन्च", watermark: "वॉटरमार्क", studioExtras: "ऑटो-पब्लिश, बाज़ार, एनालिटिक्स" },
  footer: { extra: "अतिरिक्त लॉन्च $2 प्रति लॉन्च। कभी भी रद्द करें।", editable: "प्रकाशित करने से पहले सब कुछ बदला जा सकता है।" },
};

const id: Messages = {
  langLabel: "Bahasa",
  nav: { myLaunches: "Peluncuran saya", pricing: "Harga", account: "Akun" },
  hero: { line1: "Buat sekali.", line2: "Luncurkan di mana saja.", sub: "Satu video ponsel saat kamu membuat produkmu. Claude mengubahnya menjadi semua yang kamu perlukan untuk menjualnya, dalam sekitar lima menit." },
  drop: {
    title: "Letakkan video proses pembuatanmu", sub: "atau beberapa foto produk · rekaman ponsel sudah cukup",
    choose: "Pilih file", build: "Buat kit peluncuranku", preparing: "Menyiapkan…", uploading: "Mengunggah {pct}%", starting: "Memulai…",
    change: "ganti", photoOne: "1 foto", photoMany: "{n} foto",
    productName: "Nama produk", productNamePh: "Mug stoneware berbintik", materials: "Bahan", materialsPh: "Tanah liat stoneware, glasir aman untuk makanan",
    price: "Harga yang kamu bayangkan", pricePh: "$42.00", shipsFrom: "Dikirim dari", shipsFromPh: "Portland, OR",
    optional: "Semua opsional. Bahan sulit diketahui dari video saja, jadi isi kalau kamu tahu.", unsupported: "Hanya file video atau foto yang bisa dipakai.", titleTouch: "Pilih video proses pembuatanmu", oneVideo: "Satu video per peluncuran — pilih rekaman terbaikmu.",
    outOfLaunches: "Jatah peluncuranmu bulan ini sudah habis. Tingkatkan paket untuk lanjut.", generic: "Kit kamu belum bisa dimulai. Tunggu sebentar lalu coba lagi.",
  },
  outputs: {
    heading: "Yang kamu dapat, setiap kali", saved: "Sekitar {h} jam kerja, selesai dalam 5 menit",
    listing: ["Listing Etsy", "Judul, 13 tag, deskripsi, harga"], photos: ["5 foto", "Dipilih dari videomu"],
    shorts: ["3 video pendek", "TikTok, Reels, Shorts — tiga pembuka berbeda"], markets: ["4 pasar", "UK, DE, AU, CA — diterjemahkan dan diberi harga"],
    publish: ["Terbit", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "Gratis", maker: "Maker", studio: "Studio", perMonth: "/ bln", launches: "{n} peluncuran per bulan", unlimited: "Peluncuran tanpa batas", watermark: "tanda air", studioExtras: "terbit otomatis, pasar, analitik" },
  footer: { extra: "Peluncuran tambahan $2 per kali. Batalkan kapan saja.", editable: "Semua bisa diubah sebelum diterbitkan." },
};

const ja: Messages = {
  langLabel: "言語",
  nav: { myLaunches: "マイローンチ", pricing: "料金", account: "アカウント" },
  hero: { line1: "一度つくれば、", line2: "どこでも売り出せる。", sub: "商品をつくる様子をスマホで撮った動画ひとつ。Claudeがそれを、販売に必要なものすべてに変えます。所要時間は約5分です。" },
  drop: {
    title: "制作動画をここにドロップ", sub: "または商品写真を数枚 · スマホの映像で十分です",
    choose: "ファイルを選ぶ", build: "ローンチキットをつくる", preparing: "準備中…", uploading: "アップロード中 {pct}%", starting: "開始しています…",
    change: "変更", photoOne: "写真1枚", photoMany: "写真{n}枚",
    productName: "商品名", productNamePh: "斑点模様の陶器マグ", materials: "素材", materialsPh: "炻器の粘土、食品対応の釉薬",
    price: "希望価格", pricePh: "$42.00", shipsFrom: "発送元", shipsFromPh: "Portland, OR",
    optional: "すべて任意です。素材は動画だけでは分かりにくいので、分かれば書いてください。", unsupported: "使えるのは動画か写真のファイルだけです。", titleTouch: "制作動画を選んでください", oneVideo: "動画は1回のローンチにつき1本です。いちばん良いテイクを選んでください。",
    outOfLaunches: "今月のローンチ回数を使い切りました。続けるにはプランをアップグレードしてください。", generic: "キットを開始できませんでした。少し待ってからもう一度お試しください。",
  },
  outputs: {
    heading: "毎回つくられるもの", saved: "約{h}時間分の作業を5分で",
    listing: ["Etsyの出品ページ", "タイトル、タグ13個、説明文、価格"], photos: ["写真5枚", "動画から選んだもの"],
    shorts: ["ショート動画3本", "TikTok、リール、ショート。それぞれ違うつかみ"], markets: ["4つの市場", "UK、DE、AU、CA向けに翻訳と価格設定"],
    publish: ["公開", "Shopify、TikTok、Pinterest"],
  },
  plans: { free: "無料", maker: "Maker", studio: "Studio", perMonth: "/ 月", launches: "月{n}回のローンチ", unlimited: "ローンチ無制限", watermark: "透かし入り", studioExtras: "自動公開、海外市場、分析" },
  footer: { extra: "追加ローンチは1回$2。いつでも解約できます。", editable: "公開前にすべて編集できます。" },
};

const ko: Messages = {
  langLabel: "언어",
  nav: { myLaunches: "내 런치", pricing: "요금", account: "계정" },
  hero: { line1: "한 번 만들고,", line2: "어디서나 판매하세요.", sub: "제품을 만드는 모습을 폰으로 찍은 영상 하나면 돼요. Claude가 판매에 필요한 모든 걸 약 5분 만에 만들어 드려요." },
  drop: {
    title: "제작 과정 영상을 여기에 놓으세요", sub: "또는 제품 사진 몇 장 · 폰으로 찍은 영상이면 충분해요",
    choose: "파일 선택", build: "런치 키트 만들기", preparing: "준비 중…", uploading: "업로드 중 {pct}%", starting: "시작하는 중…",
    change: "변경", photoOne: "사진 1장", photoMany: "사진 {n}장",
    productName: "제품 이름", productNamePh: "점무늬 석기 머그", materials: "재료", materialsPh: "석기 점토, 식품용 유약",
    price: "생각해 둔 가격", pricePh: "$42.00", shipsFrom: "배송 출발지", shipsFromPh: "Portland, OR",
    optional: "모두 선택 사항이에요. 재료는 영상만으로 알기 어려우니 아시면 적어 주세요.", unsupported: "영상이나 사진 파일만 올릴 수 있어요.", titleTouch: "제작 과정 영상을 골라 주세요", oneVideo: "한 번에 영상은 하나만 올릴 수 있어요. 가장 잘 나온 영상을 골라 주세요.",
    outOfLaunches: "이번 달 런치 횟수를 다 썼어요. 계속하려면 요금제를 올려 주세요.", generic: "런치 키트를 시작하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
  },
  outputs: {
    heading: "매번 이만큼 나와요", saved: "약 {h}시간 걸릴 일을 5분 만에",
    listing: ["Etsy 판매 글", "제목, 태그 13개, 설명, 가격"], photos: ["사진 5장", "영상에서 골라냄"],
    shorts: ["숏폼 3개", "틱톡, 릴스, 쇼츠. 서로 다른 첫 장면"], markets: ["4개국", "UK, DE, AU, CA 번역과 가격"],
    publish: ["발행", "Shopify, TikTok, Pinterest"],
  },
  plans: { free: "무료", maker: "Maker", studio: "Studio", perMonth: "/ 월", launches: "한 달 {n}번", unlimited: "무제한", watermark: "워터마크", studioExtras: "자동 발행, 해외 판매, 분석" },
  footer: { extra: "추가 런치는 1회 $2. 언제든 해지할 수 있어요.", editable: "발행 전에 모두 고칠 수 있어요." },
};

const zh: Messages = {
  langLabel: "语言",
  nav: { myLaunches: "我的发布", pricing: "价格", account: "账户" },
  hero: { line1: "做一次，", line2: "卖遍各处。", sub: "用手机拍一段你制作产品的视频。Claude 会把它变成销售所需的一切，大约只要五分钟。" },
  drop: {
    title: "把制作过程视频拖到这里", sub: "或几张产品照片 · 手机拍的就很好",
    choose: "选择文件", build: "生成我的发布套件", preparing: "准备中…", uploading: "正在上传 {pct}%", starting: "正在开始…",
    change: "更换", photoOne: "1 张照片", photoMany: "{n} 张照片",
    productName: "产品名称", productNamePh: "斑点粗陶马克杯", materials: "材料", materialsPh: "粗陶黏土，食品级釉料",
    price: "心理价位", pricePh: "$42.00", shipsFrom: "发货地", shipsFromPh: "Portland, OR",
    optional: "全部选填。材料光看视频很难判断，知道的话请填上。", unsupported: "这里只支持视频或照片文件。", titleTouch: "选择制作过程视频", oneVideo: "每次发布只能用一段视频，请选最好的一段。",
    outOfLaunches: "本月发布次数已用完。升级套餐即可继续。", generic: "没能开始制作。请稍等片刻再试一次。",
  },
  outputs: {
    heading: "每次都会得到", saved: "约 {h} 小时的工作，5 分钟完成",
    listing: ["Etsy 商品页", "标题、13 个标签、描述、价格"], photos: ["5 张照片", "从你的视频中挑选"],
    shorts: ["3 条短视频", "TikTok、Reels、Shorts，三种不同开头"], markets: ["4 个市场", "UK、DE、AU、CA：已翻译并定价"],
    publish: ["已发布", "Shopify、TikTok、Pinterest"],
  },
  plans: { free: "免费", maker: "Maker", studio: "Studio", perMonth: "/ 月", launches: "每月 {n} 次发布", unlimited: "无限次发布", watermark: "带水印", studioExtras: "自动发布、多市场、数据分析" },
  footer: { extra: "额外发布每次 $2，随时可取消。", editable: "发布前一切都可以修改。" },
};

export const MESSAGES: Record<Locale, Messages> = { en, es, pt, fr, de, it, nl, tr, ar, hi, id, ja, ko, zh };
