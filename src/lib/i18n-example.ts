import type { Locale } from "@/lib/i18n";

// Copy for /example. The generated listing, hooks and market titles stay in their own languages.

const en = {
  title: "Put in one video. Get all of this.",
  sub: "This 10-second knitting video went in with no photos and no notes. Here is what Launch Kit makes from it.",
  cta: "Try it with your video",
  seeExample: "See what one video makes", sampleTag: "Sample",
  sampleNote: "A sample we made ahead of time. Your video gets a kit of its own.",
  inLabel: "What goes in",
  inMeta: "10 s video · no photos, no notes",
  outLabel: "What comes out",
  titleLabel: "Title · {n}/140",
  tagsLabel: "Tags · {n}/13",
  descLabel: "Description · {n} words",
  askLabel: "Not in the video, so left for you",
  yarn: "Yarn", size: "Size", care: "Care",
  comparables: "Similar hand-knit cable scarves on Etsy: {range}, most around {mid}",
  rates: "Converted at Oct 22, 2026 rates · shipping not included",
  drafts: "Saved as drafts. Nothing goes live until you say so.",
  draft: "Draft",
  photos: { hero: "In hand", cables: "Cable detail", closeup: "Close-up", progress: "In progress", yarn: "The yarn" },
};

export type ExampleMessages = typeof en;

const es: ExampleMessages = {
  title: "Sube un video. Recibe todo esto.",
  sub: "Este video de tejido de 10 segundos entró sin fotos ni notas. Esto es lo que Launch Kit crea con él.",
  cta: "Pruébalo con tu video",
  seeExample: "Mira lo que sale de un video", sampleTag: "Ejemplo",
  sampleNote: "Es un ejemplo preparado de antemano. Tu video tendrá su propio kit.",
  inLabel: "Lo que entra", inMeta: "Video de 10 s · sin fotos ni notas", outLabel: "Lo que sale",
  titleLabel: "Título · {n}/140", tagsLabel: "Etiquetas · {n}/13", descLabel: "Descripción · {n} palabras",
  askLabel: "No se ve en el video, así que lo completas tú",
  yarn: "Hilo", size: "Medidas", care: "Cuidados",
  comparables: "Bufandas de ochos tejidas a mano en Etsy: {range}, la mayoría cerca de {mid}",
  rates: "Convertido con el cambio del 22 oct 2026 · envío no incluido",
  drafts: "Guardado como borrador. Nada se publica hasta que tú lo digas.",
  draft: "Borrador",
  photos: { hero: "En la mano", cables: "Detalle de ochos", closeup: "Primer plano", progress: "En proceso", yarn: "El hilo" },
};

const pt: ExampleMessages = {
  title: "Envie um vídeo. Receba tudo isto.",
  sub: "Este vídeo de tricô de 10 segundos entrou sem fotos e sem notas. Veja o que o Launch Kit faz com ele.",
  cta: "Teste com o seu vídeo",
  seeExample: "Veja o que sai de um vídeo", sampleTag: "Exemplo",
  sampleNote: "É um exemplo preparado antes. O seu vídeo ganha um kit próprio.",
  inLabel: "O que entra", inMeta: "Vídeo de 10 s · sem fotos, sem notas", outLabel: "O que sai",
  titleLabel: "Título · {n}/140", tagsLabel: "Tags · {n}/13", descLabel: "Descrição · {n} palavras",
  askLabel: "Não aparece no vídeo, então fica para você",
  yarn: "Fio", size: "Tamanho", care: "Cuidados",
  comparables: "Cachecóis de tranças feitos à mão no Etsy: {range}, a maioria perto de {mid}",
  rates: "Convertido com o câmbio de 22 out 2026 · frete não incluído",
  drafts: "Salvo como rascunho. Nada vai ao ar até você decidir.",
  draft: "Rascunho",
  photos: { hero: "Na mão", cables: "Detalhe das tranças", closeup: "Close", progress: "Em andamento", yarn: "O fio" },
};

const fr: ExampleMessages = {
  title: "Une vidéo en entrée. Tout ceci en sortie.",
  sub: "Cette vidéo de tricot de 10 secondes est entrée sans photos ni notes. Voici ce que Launch Kit en tire.",
  cta: "Essayez avec votre vidéo",
  seeExample: "Voir ce qu’une vidéo donne", sampleTag: "Exemple",
  sampleNote: "Un exemple préparé à l’avance. Votre vidéo aura son propre kit.",
  inLabel: "Ce qui entre", inMeta: "Vidéo de 10 s · sans photos ni notes", outLabel: "Ce qui sort",
  titleLabel: "Titre · {n}/140", tagsLabel: "Mots-clés · {n}/13", descLabel: "Description · {n} mots",
  askLabel: "Absent de la vidéo, donc à compléter par vous",
  yarn: "Fil", size: "Taille", care: "Entretien",
  comparables: "Écharpes à torsades tricotées main sur Etsy : {range}, la plupart autour de {mid}",
  rates: "Converti au taux du 22 oct. 2026 · livraison non comprise",
  drafts: "Enregistré en brouillon. Rien n’est publié sans votre accord.",
  draft: "Brouillon",
  photos: { hero: "En main", cables: "Détail des torsades", closeup: "Gros plan", progress: "En cours", yarn: "Le fil" },
};

const de: ExampleMessages = {
  title: "Ein Video rein. All das raus.",
  sub: "Dieses 10-Sekunden-Strickvideo kam ohne Fotos und ohne Notizen rein. Das macht Launch Kit daraus.",
  cta: "Mit deinem Video ausprobieren",
  seeExample: "Sieh, was aus einem Video wird", sampleTag: "Beispiel",
  sampleNote: "Ein vorab erstelltes Beispiel. Dein Video bekommt sein eigenes Kit.",
  inLabel: "Was reingeht", inMeta: "10-s-Video · keine Fotos, keine Notizen", outLabel: "Was rauskommt",
  titleLabel: "Titel · {n}/140", tagsLabel: "Tags · {n}/13", descLabel: "Beschreibung · {n} Wörter",
  askLabel: "Nicht im Video zu sehen, also für dich offen gelassen",
  yarn: "Garn", size: "Größe", care: "Pflege",
  comparables: "Ähnliche handgestrickte Zopfschals auf Etsy: {range}, meist um {mid}",
  rates: "Umgerechnet zum Kurs vom 22.10.2026 · ohne Versand",
  drafts: "Als Entwurf gespeichert. Nichts geht live, bevor du es sagst.",
  draft: "Entwurf",
  photos: { hero: "In der Hand", cables: "Zopfmuster", closeup: "Nahaufnahme", progress: "In Arbeit", yarn: "Das Garn" },
};

const it: ExampleMessages = {
  title: "Carica un video. Ricevi tutto questo.",
  sub: "Questo video di maglia di 10 secondi è entrato senza foto né note. Ecco cosa ne ricava Launch Kit.",
  cta: "Provalo con il tuo video",
  seeExample: "Guarda cosa nasce da un video", sampleTag: "Esempio",
  sampleNote: "È un esempio preparato in anticipo. Il tuo video avrà un kit tutto suo.",
  inLabel: "Cosa entra", inMeta: "Video di 10 s · niente foto, niente note", outLabel: "Cosa esce",
  titleLabel: "Titolo · {n}/140", tagsLabel: "Tag · {n}/13", descLabel: "Descrizione · {n} parole",
  askLabel: "Non si vede nel video, quindi lo lasciamo a te",
  yarn: "Filato", size: "Misure", care: "Cura",
  comparables: "Sciarpe a trecce fatte a mano su Etsy: {range}, quasi tutte intorno a {mid}",
  rates: "Convertito al cambio del 22 ott 2026 · spedizione esclusa",
  drafts: "Salvato come bozza. Niente va online finché non lo decidi tu.",
  draft: "Bozza",
  photos: { hero: "In mano", cables: "Dettaglio trecce", closeup: "Primo piano", progress: "In lavorazione", yarn: "Il filato" },
};

const nl: ExampleMessages = {
  title: "Eén video erin. Dit allemaal eruit.",
  sub: "Deze breivideo van 10 seconden ging erin zonder foto’s of notities. Dit maakt Launch Kit ervan.",
  cta: "Probeer het met je video",
  seeExample: "Kijk wat één video oplevert", sampleTag: "Voorbeeld",
  sampleNote: "Een vooraf gemaakt voorbeeld. Jouw video krijgt een eigen kit.",
  inLabel: "Wat erin gaat", inMeta: "Video van 10 s · geen foto’s, geen notities", outLabel: "Wat eruit komt",
  titleLabel: "Titel · {n}/140", tagsLabel: "Tags · {n}/13", descLabel: "Beschrijving · {n} woorden",
  askLabel: "Niet te zien in de video, dus voor jou om in te vullen",
  yarn: "Garen", size: "Maat", care: "Onderhoud",
  comparables: "Vergelijkbare handgebreide kabelsjaals op Etsy: {range}, meestal rond {mid}",
  rates: "Omgerekend tegen de koers van 22 okt 2026 · exclusief verzending",
  drafts: "Opgeslagen als concept. Niets gaat live tot jij het zegt.",
  draft: "Concept",
  photos: { hero: "In de hand", cables: "Kabeldetail", closeup: "Close-up", progress: "Onderweg", yarn: "Het garen" },
};

const tr: ExampleMessages = {
  title: "Bir video koy. Hepsini al.",
  sub: "Bu 10 saniyelik örgü videosu fotoğrafsız ve notsuz girdi. Launch Kit’in ondan çıkardıkları burada.",
  cta: "Kendi videonla dene",
  seeExample: "Bir videodan neler çıktığını gör", sampleTag: "Örnek",
  sampleNote: "Önceden hazırlanmış bir örnek. Senin videon kendi kitini alır.",
  inLabel: "Giren", inMeta: "10 sn video · fotoğraf yok, not yok", outLabel: "Çıkan",
  titleLabel: "Başlık · {n}/140", tagsLabel: "Etiketler · {n}/13", descLabel: "Açıklama · {n} kelime",
  askLabel: "Videoda görünmüyor, bu yüzden sana bırakıldı",
  yarn: "İplik", size: "Ölçü", care: "Bakım",
  comparables: "Etsy’de benzer el örgüsü saç örgülü atkılar: {range}, çoğu {mid} civarı",
  rates: "22 Ekim 2026 kuruyla çevrildi · kargo hariç",
  drafts: "Taslak olarak kaydedildi. Sen demeden hiçbir şey yayına girmez.",
  draft: "Taslak",
  photos: { hero: "Elde", cables: "Saç örgüsü detayı", closeup: "Yakın plan", progress: "Yapım aşamasında", yarn: "İplik" },
};

const ar: ExampleMessages = {
  title: "ضع فيديو واحدًا، واحصل على كل هذا.",
  sub: "دخل فيديو الحياكة هذا ومدته 10 ثوانٍ بلا صور ولا ملاحظات. هذا ما يصنعه Launch Kit منه.",
  cta: "جرّبه بالفيديو الخاص بك",
  seeExample: "شاهد ما يخرج من فيديو واحد", sampleTag: "مثال",
  sampleNote: "هذا مثال أعددناه مسبقًا. فيديوك سيحصل على مجموعته الخاصة.",
  inLabel: "ما يدخل", inMeta: "فيديو مدته 10 ث · بلا صور ولا ملاحظات", outLabel: "ما يخرج",
  titleLabel: "العنوان · {n}/140", tagsLabel: "الوسوم · {n}/13", descLabel: "الوصف · الكلمات: {n}",
  askLabel: "لا يظهر في الفيديو، لذا تُرك لك",
  yarn: "الخيط", size: "المقاس", care: "العناية",
  comparables: "أوشحة مضفّرة محاكة يدويًا على Etsy: {range}، ومعظمها نحو {mid}",
  rates: "حُوّلت بأسعار 22 أكتوبر 2026 · الشحن غير مشمول",
  drafts: "حُفظت كمسودات. لا يُنشر شيء حتى تقرر ذلك.",
  draft: "مسودة",
  photos: { hero: "في اليد", cables: "تفاصيل الضفائر", closeup: "لقطة قريبة", progress: "قيد العمل", yarn: "الخيط" },
};

const hi: ExampleMessages = {
  title: "एक वीडियो डालिए। यह सब पाइए।",
  sub: "10 सेकंड का यह बुनाई वीडियो बिना फ़ोटो और बिना नोट्स के डाला गया। Launch Kit इससे यह सब बनाता है।",
  cta: "अपने वीडियो से आज़माइए",
  seeExample: "देखिए एक वीडियो से क्या बनता है", sampleTag: "उदाहरण",
  sampleNote: "यह पहले से तैयार किया गया उदाहरण है। आपके वीडियो से उसकी अपनी किट बनेगी।",
  inLabel: "क्या डाला", inMeta: "10 सेकंड का वीडियो · कोई फ़ोटो नहीं, कोई नोट नहीं", outLabel: "क्या मिला",
  titleLabel: "शीर्षक · {n}/140", tagsLabel: "टैग · {n}/13", descLabel: "विवरण · {n} शब्द",
  askLabel: "वीडियो में नहीं दिखा, इसलिए आपके भरने के लिए छोड़ा",
  yarn: "धागा", size: "नाप", care: "देखभाल",
  comparables: "Etsy पर हाथ से बुने ऐसे केबल स्कार्फ़: {range}, ज़्यादातर लगभग {mid}",
  rates: "22 अक्टूबर 2026 की दर से बदला गया · शिपिंग शामिल नहीं",
  drafts: "ड्राफ़्ट के रूप में सेव किया गया। आपके कहे बिना कुछ भी लाइव नहीं होगा।",
  draft: "ड्राफ़्ट",
  photos: { hero: "हाथ में", cables: "केबल डिज़ाइन", closeup: "क्लोज़-अप", progress: "बनते हुए", yarn: "धागा" },
};

const id: ExampleMessages = {
  title: "Masukkan satu video. Dapatkan semua ini.",
  sub: "Video merajut 10 detik ini masuk tanpa foto dan tanpa catatan. Ini yang dibuat Launch Kit darinya.",
  cta: "Coba dengan videomu",
  seeExample: "Lihat hasil dari satu video", sampleTag: "Contoh",
  sampleNote: "Ini contoh yang dibuat sebelumnya. Videomu akan mendapat kit sendiri.",
  inLabel: "Yang masuk", inMeta: "Video 10 dtk · tanpa foto, tanpa catatan", outLabel: "Yang keluar",
  titleLabel: "Judul · {n}/140", tagsLabel: "Tag · {n}/13", descLabel: "Deskripsi · {n} kata",
  askLabel: "Tidak terlihat di video, jadi kamu yang mengisi",
  yarn: "Benang", size: "Ukuran", care: "Perawatan",
  comparables: "Syal kabel rajutan tangan serupa di Etsy: {range}, kebanyakan sekitar {mid}",
  rates: "Dikonversi dengan kurs 22 Okt 2026 · belum termasuk ongkir",
  drafts: "Disimpan sebagai draf. Tidak ada yang tayang sampai kamu bilang.",
  draft: "Draf",
  photos: { hero: "Di tangan", cables: "Detail kabel", closeup: "Dari dekat", progress: "Sedang dibuat", yarn: "Benangnya" },
};

const ja: ExampleMessages = {
  title: "動画を1本入れるだけで、これが全部できます。",
  sub: "写真もメモもなしで、この10秒の編み物動画だけを入れました。Launch Kitがここから作るものです。",
  cta: "自分の動画で試す",
  seeExample: "1本の動画から何ができるか見る", sampleTag: "見本",
  sampleNote: "あらかじめ用意した見本です。あなたの動画からは、その動画だけのキットができます。",
  inLabel: "入れたもの", inMeta: "10秒の動画 · 写真なし、メモなし", outLabel: "できたもの",
  titleLabel: "タイトル · {n}/140", tagsLabel: "タグ · {n}/13", descLabel: "説明文 · {n}語",
  askLabel: "動画からはわからないので、あなたが入力",
  yarn: "糸", size: "サイズ", care: "お手入れ",
  comparables: "Etsyの手編みケーブルマフラー：{range}、多くは{mid}前後",
  rates: "2026年10月22日のレートで換算 · 送料別",
  drafts: "下書きとして保存。あなたが決めるまで公開されません。",
  draft: "下書き",
  photos: { hero: "手に持って", cables: "ケーブル模様", closeup: "クローズアップ", progress: "編んでいるところ", yarn: "糸" },
};

const ko: ExampleMessages = {
  title: "영상 하나 넣으면, 이게 다 나와요.",
  sub: "사진도 메모도 없이 10초짜리 뜨개질 영상만 넣었어요. Launch Kit이 여기서 만드는 것들이에요.",
  cta: "내 영상으로 해보기",
  seeExample: "영상 하나로 뭐가 나오는지 보기", sampleTag: "예시",
  sampleNote: "미리 만들어 둔 예시예요. 내 영상을 넣으면 내 제품에 맞춰 새로 만들어요.",
  inLabel: "넣은 것", inMeta: "10초 영상 · 사진 없음, 메모 없음", outLabel: "나온 것",
  titleLabel: "제목 · {n}/140", tagsLabel: "태그 · {n}/13", descLabel: "설명 · {n}단어",
  askLabel: "영상에 안 나와서 직접 채울 칸",
  yarn: "실", size: "크기", care: "관리법",
  comparables: "Etsy의 비슷한 손뜨개 꽈배기 목도리: {range}, 대부분 {mid} 안팎",
  rates: "2026년 10월 22일 환율로 환산 · 배송비 별도",
  drafts: "임시 저장만 해 뒀어요. 직접 올리기 전엔 아무것도 공개되지 않아요.",
  draft: "임시 저장",
  photos: { hero: "손에 들고", cables: "꽈배기 무늬", closeup: "가까이", progress: "뜨는 중", yarn: "실" },
};

const zh: ExampleMessages = {
  title: "放进一个视频，就能得到这些。",
  sub: "这段 10 秒的编织视频没有附照片，也没有备注。下面是 Launch Kit 用它做出的东西。",
  cta: "用你的视频试试",
  seeExample: "看看一个视频能做出什么", sampleTag: "示例",
  sampleNote: "这是事先做好的示例。你的视频会得到专属于它的一套。",
  inLabel: "放进去的", inMeta: "10 秒视频 · 无照片、无备注", outLabel: "得到的",
  titleLabel: "标题 · {n}/140", tagsLabel: "标签 · {n}/13", descLabel: "描述 · {n} 词",
  askLabel: "视频里看不出来，留给你填写",
  yarn: "毛线", size: "尺寸", care: "保养",
  comparables: "Etsy 上类似的手工麻花围巾：{range}，多数在 {mid} 左右",
  rates: "按 2026 年 10 月 22 日汇率换算 · 不含运费",
  drafts: "已存为草稿。你确认前不会发布。",
  draft: "草稿",
  photos: { hero: "拿在手上", cables: "麻花细节", closeup: "特写", progress: "编织中", yarn: "毛线" },
};

export const EXAMPLE: Record<Locale, ExampleMessages> = { en, es, pt, fr, de, it, nl, tr, ar, hi, id, ja, ko, zh };
