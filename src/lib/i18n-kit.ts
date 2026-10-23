import type { Locale } from "@/lib/i18n";

// Copy for the result screen (KitView) and the My launches list. Generated listing text stays in its own language.

/** BCP-47 tags for Intl formatting (dates, numbers). */
export const LOCALE_TAG: Record<Locale, string> = {
  en: "en-US", es: "es-ES", pt: "pt-BR", fr: "fr-FR", de: "de-DE", it: "it-IT", nl: "nl-NL",
  tr: "tr-TR", ar: "ar", hi: "hi-IN", id: "id-ID", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN",
};

const en = {
  status: {
    ready: "Ready in {time} · about {h} h {m} min saved",
    failed: "Something went wrong while building this kit.",
    uploadAgain: "Upload again",
    starting: "Starting",
    progress: "Build progress",
  },
  steps: {
    watch_footage: "Watching your footage", score_frames: "Picking the best frames", extract_attributes: "Reading the product",
    research_comparables: "Checking comparable listings", write_listing: "Writing the listing", price: "Pricing it",
    write_hooks: "Writing three hooks", cut_points: "Cutting the videos", localize: "Translating for four markets", format_for_channel: "Formatting for each channel",
  },
  header: {
    title: "Your launch kit",
    fromVideo: "From {video} ({dur})",
    fromVideoAndPhotos: "From {video} ({dur}) and {n} photos",
    fromPhotosNoVideo: "From {n} photos · no video",
    fromUpload: "From your upload",
    video: "video",
  },
  buttons: {
    downloadAll: "Download everything", etsyCsv: "Etsy CSV", publish: "Publish to Shopify and TikTok", queued: "Queued",
    copyAll: "Copy all", copy: "Copy", showRest: "Show the rest ({n} more)", showLess: "Show less",
    showDesc: "Show description and tags", hide: "Hide", swapHint: "Click a photo to swap it",
  },
  listing: {
    title: "Etsy listing", titleCount: "Title · {n} of 140", tagsCount: "Tags · {n} of 13", descCount: "Description · {n} words",
    similar: "similar listings {low} – {high}", cost: "your materials and work come to about {cost}",
  },
  photos: { title: "{n} photos", pickedFrom: "picked from {n} frames", pickedFromUpload: "picked from your upload" },
  videos: {
    title: "3 shorts", listingVideo: "and a {n} s listing video", noText: "Listing video. No text.", secs: "{n} s",
    fromPhotos: "These clips were built from your photos. Add a making-of video next time for footage-based clips.",
  },
  markets: {
    title: "{n} markets", sub: "translated, priced in local currency", shipping: "Shipping from your studio included in each price.",
    names: { GB: "United Kingdom", DE: "Germany", AU: "Australia", CA: "Canada", US: "United States" },
    langs: { de: "German", fr: "French", enGB: "British English", enAU: "Australian English" },
  },
  did: { title: "What Claude did", starting: "Starting up…", editable: "Everything is editable before you publish." },
  toast: {
    copied: "Listing copied", marketCopied: "{market} listing copied", queued: "Queued for Shopify and TikTok", failed: "Couldn't publish yet",
    previewPublish: "Preview only — nothing was published", previewDownload: "Preview only — connect Supabase to download", previewExport: "Preview only — connect Supabase to export",
  },
  roles: { hero: "Hero", in_hand: "In hand", detail: "Detail", process: "Making it", scale: "Scale", alt: "Alt" },
  dur: { minSec: "{m} min {s} s", sec: "{s} s" },
  launches: {
    title: "My launches", newLaunch: "New launch", emptyTitle: "Nothing here yet",
    emptySub: "Drop a making-of video and your first kit will show up here.", building: "Building…", builtIn: "built in {time}",
    status: { ready: "ready", published: "published", failed: "failed", building: "building" },
  },
};

export type KitMessages = typeof en;

/** fmtDuration, but with the locale's units: "3 min 12 s" → "3분 12초". */
export function fmtDur(t: KitMessages, sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return m ? t.dur.minSec.replace("{m}", String(m)).replace("{s}", String(s)) : t.dur.sec.replace("{s}", String(s));
}

const es: KitMessages = {
  status: { ready: "Listo en {time} · unas {h} h {m} min ahorrados", failed: "Algo salió mal al crear este kit.", uploadAgain: "Subir de nuevo", starting: "Empezando", progress: "Progreso" },
  steps: { watch_footage: "Viendo tu video", score_frames: "Eligiendo los mejores fotogramas", extract_attributes: "Leyendo el producto", research_comparables: "Revisando anuncios parecidos", write_listing: "Escribiendo el anuncio", price: "Poniendo el precio", write_hooks: "Escribiendo tres ganchos", cut_points: "Cortando los videos", localize: "Traduciendo para cuatro mercados", format_for_channel: "Dando formato para cada canal" },
  header: { title: "Tu kit de lanzamiento", fromVideo: "De {video} ({dur})", fromVideoAndPhotos: "De {video} ({dur}) y {n} fotos", fromPhotosNoVideo: "De {n} fotos · sin video", fromUpload: "De lo que subiste", video: "video" },
  buttons: { downloadAll: "Descargar todo", etsyCsv: "CSV de Etsy", publish: "Publicar en Shopify y TikTok", queued: "En cola", copyAll: "Copiar todo", copy: "Copiar", showRest: "Ver el resto ({n} más)", showLess: "Ver menos", showDesc: "Ver descripción y etiquetas", hide: "Ocultar", swapHint: "Toca una foto para cambiarla" },
  listing: { title: "Anuncio de Etsy", titleCount: "Título · {n} de 140", tagsCount: "Etiquetas · {n} de 13", descCount: "Descripción · {n} palabras", similar: "anuncios parecidos {low} – {high}", cost: "tus materiales y tu trabajo suman unos {cost}" },
  photos: { title: "{n} fotos", pickedFrom: "elegidas entre {n} fotogramas", pickedFromUpload: "elegidas de lo que subiste" },
  videos: { title: "3 videos cortos", listingVideo: "y un video de anuncio de {n} s", noText: "Video del anuncio. Sin texto.", secs: "{n} s", fromPhotos: "Estos clips se crearon con tus fotos. La próxima vez añade un video de tu proceso para clips con metraje real." },
  markets: { title: "{n} mercados", sub: "traducido y con precio en moneda local", shipping: "El envío desde tu taller está incluido en cada precio.", names: { GB: "Reino Unido", DE: "Alemania", AU: "Australia", CA: "Canadá", US: "Estados Unidos" }, langs: { de: "Alemán", fr: "Francés", enGB: "Inglés británico", enAU: "Inglés australiano" } },
  did: { title: "Lo que hizo Claude", starting: "Empezando…", editable: "Puedes editar todo antes de publicar." },
  toast: { copied: "Anuncio copiado", marketCopied: "Anuncio de {market} copiado", queued: "En cola para Shopify y TikTok", failed: "Todavía no se pudo publicar", previewPublish: "Solo vista previa: no se publicó nada", previewDownload: "Solo vista previa: conecta Supabase para descargar", previewExport: "Solo vista previa: conecta Supabase para exportar" },
  roles: { hero: "Principal", in_hand: "En la mano", detail: "Detalle", process: "En proceso", scale: "Escala", alt: "Alternativa" },
  dur: { minSec: "{m} min {s} s", sec: "{s} s" },
  launches: { title: "Mis lanzamientos", newLaunch: "Nuevo lanzamiento", emptyTitle: "Aún no hay nada", emptySub: "Suelta un video de tu proceso y tu primer kit aparecerá aquí.", building: "Creando…", builtIn: "creado en {time}", status: { ready: "listo", published: "publicado", failed: "falló", building: "en proceso" } },
};

const pt: KitMessages = {
  status: { ready: "Pronto em {time} · cerca de {h} h {m} min economizados", failed: "Algo deu errado ao criar este kit.", uploadAgain: "Enviar de novo", starting: "Começando", progress: "Progresso" },
  steps: { watch_footage: "Assistindo ao seu vídeo", score_frames: "Escolhendo os melhores quadros", extract_attributes: "Lendo o produto", research_comparables: "Conferindo anúncios parecidos", write_listing: "Escrevendo o anúncio", price: "Definindo o preço", write_hooks: "Escrevendo três ganchos", cut_points: "Cortando os vídeos", localize: "Traduzindo para quatro mercados", format_for_channel: "Formatando para cada canal" },
  header: { title: "Seu kit de lançamento", fromVideo: "De {video} ({dur})", fromVideoAndPhotos: "De {video} ({dur}) e {n} fotos", fromPhotosNoVideo: "De {n} fotos · sem vídeo", fromUpload: "Do seu envio", video: "vídeo" },
  buttons: { downloadAll: "Baixar tudo", etsyCsv: "CSV da Etsy", publish: "Publicar na Shopify e no TikTok", queued: "Na fila", copyAll: "Copiar tudo", copy: "Copiar", showRest: "Ver o resto (mais {n})", showLess: "Ver menos", showDesc: "Ver descrição e tags", hide: "Ocultar", swapHint: "Clique em uma foto para trocar" },
  listing: { title: "Anúncio na Etsy", titleCount: "Título · {n} de 140", tagsCount: "Tags · {n} de 13", descCount: "Descrição · {n} palavras", similar: "anúncios parecidos {low} – {high}", cost: "seus materiais e trabalho somam cerca de {cost}" },
  photos: { title: "{n} fotos", pickedFrom: "escolhidas entre {n} quadros", pickedFromUpload: "escolhidas do seu envio" },
  videos: { title: "3 vídeos curtos", listingVideo: "e um vídeo de anúncio de {n} s", noText: "Vídeo do anúncio. Sem texto.", secs: "{n} s", fromPhotos: "Estes clipes foram feitos com suas fotos. Da próxima vez, envie um vídeo do processo para clipes com filmagem real." },
  markets: { title: "{n} mercados", sub: "traduzido e com preço em moeda local", shipping: "O frete do seu ateliê está incluído em cada preço.", names: { GB: "Reino Unido", DE: "Alemanha", AU: "Austrália", CA: "Canadá", US: "Estados Unidos" }, langs: { de: "Alemão", fr: "Francês", enGB: "Inglês britânico", enAU: "Inglês australiano" } },
  did: { title: "O que o Claude fez", starting: "Iniciando…", editable: "Tudo pode ser editado antes de publicar." },
  toast: { copied: "Anúncio copiado", marketCopied: "Anúncio de {market} copiado", queued: "Na fila para Shopify e TikTok", failed: "Ainda não deu para publicar", previewPublish: "Só prévia: nada foi publicado", previewDownload: "Só prévia: conecte o Supabase para baixar", previewExport: "Só prévia: conecte o Supabase para exportar" },
  roles: { hero: "Principal", in_hand: "Na mão", detail: "Detalhe", process: "Fazendo", scale: "Escala", alt: "Alternativa" },
  dur: { minSec: "{m} min {s} s", sec: "{s} s" },
  launches: { title: "Meus lançamentos", newLaunch: "Novo lançamento", emptyTitle: "Nada por aqui ainda", emptySub: "Solte um vídeo do processo e seu primeiro kit aparece aqui.", building: "Criando…", builtIn: "criado em {time}", status: { ready: "pronto", published: "publicado", failed: "falhou", building: "em andamento" } },
};

const fr: KitMessages = {
  status: { ready: "Prêt en {time} · environ {h} h {m} min gagnées", failed: "Un problème est survenu pendant la création de ce kit.", uploadAgain: "Réessayer avec une vidéo", starting: "Démarrage", progress: "Progression" },
  steps: { watch_footage: "Visionnage de votre vidéo", score_frames: "Choix des meilleures images", extract_attributes: "Lecture du produit", research_comparables: "Comparaison avec des annonces similaires", write_listing: "Rédaction de l’annonce", price: "Fixation du prix", write_hooks: "Rédaction de trois accroches", cut_points: "Montage des vidéos", localize: "Traduction pour quatre marchés", format_for_channel: "Mise en forme pour chaque canal" },
  header: { title: "Votre kit de lancement", fromVideo: "À partir de {video} ({dur})", fromVideoAndPhotos: "À partir de {video} ({dur}) et {n} photos", fromPhotosNoVideo: "À partir de {n} photos · sans vidéo", fromUpload: "À partir de votre envoi", video: "vidéo" },
  buttons: { downloadAll: "Tout télécharger", etsyCsv: "CSV Etsy", publish: "Publier sur Shopify et TikTok", queued: "En file d’attente", copyAll: "Tout copier", copy: "Copier", showRest: "Voir la suite ({n} de plus)", showLess: "Voir moins", showDesc: "Voir la description et les mots-clés", hide: "Masquer", swapHint: "Cliquez sur une photo pour la remplacer" },
  listing: { title: "Annonce Etsy", titleCount: "Titre · {n} sur 140", tagsCount: "Mots-clés · {n} sur 13", descCount: "Description · {n} mots", similar: "annonces similaires {low} – {high}", cost: "vos matériaux et votre travail reviennent à environ {cost}" },
  photos: { title: "{n} photos", pickedFrom: "choisies parmi {n} images", pickedFromUpload: "choisies dans votre envoi" },
  videos: { title: "3 vidéos courtes", listingVideo: "et une vidéo d’annonce de {n} s", noText: "Vidéo d’annonce. Sans texte.", secs: "{n} s", fromPhotos: "Ces clips ont été créés à partir de vos photos. Ajoutez une vidéo de fabrication la prochaine fois pour des clips tirés de vos images." },
  markets: { title: "{n} marchés", sub: "traduit, prix en monnaie locale", shipping: "La livraison depuis votre atelier est comprise dans chaque prix.", names: { GB: "Royaume-Uni", DE: "Allemagne", AU: "Australie", CA: "Canada", US: "États-Unis" }, langs: { de: "Allemand", fr: "Français", enGB: "Anglais britannique", enAU: "Anglais australien" } },
  did: { title: "Ce que Claude a fait", starting: "Démarrage…", editable: "Tout est modifiable avant publication." },
  toast: { copied: "Annonce copiée", marketCopied: "Annonce {market} copiée", queued: "En file d’attente pour Shopify et TikTok", failed: "Publication impossible pour l’instant", previewPublish: "Aperçu seulement : rien n’a été publié", previewDownload: "Aperçu seulement : connectez Supabase pour télécharger", previewExport: "Aperçu seulement : connectez Supabase pour exporter" },
  roles: { hero: "Principale", in_hand: "En main", detail: "Détail", process: "Fabrication", scale: "Échelle", alt: "Variante" },
  dur: { minSec: "{m} min {s} s", sec: "{s} s" },
  launches: { title: "Mes lancements", newLaunch: "Nouveau lancement", emptyTitle: "Rien ici pour l’instant", emptySub: "Déposez une vidéo de fabrication et votre premier kit apparaîtra ici.", building: "En cours…", builtIn: "créé en {time}", status: { ready: "prêt", published: "publié", failed: "échec", building: "en cours" } },
};

const de: KitMessages = {
  status: { ready: "Fertig in {time} · etwa {h} Std. {m} Min. gespart", failed: "Beim Erstellen dieses Kits ist etwas schiefgelaufen.", uploadAgain: "Noch einmal hochladen", starting: "Startet", progress: "Fortschritt" },
  steps: { watch_footage: "Schaut dein Video an", score_frames: "Wählt die besten Bilder aus", extract_attributes: "Liest das Produkt", research_comparables: "Prüft vergleichbare Angebote", write_listing: "Schreibt das Angebot", price: "Legt den Preis fest", write_hooks: "Schreibt drei Hooks", cut_points: "Schneidet die Videos", localize: "Übersetzt für vier Märkte", format_for_channel: "Formatiert für jeden Kanal" },
  header: { title: "Dein Launch-Kit", fromVideo: "Aus {video} ({dur})", fromVideoAndPhotos: "Aus {video} ({dur}) und {n} Fotos", fromPhotosNoVideo: "Aus {n} Fotos · kein Video", fromUpload: "Aus deinem Upload", video: "Video" },
  buttons: { downloadAll: "Alles herunterladen", etsyCsv: "Etsy-CSV", publish: "Auf Shopify und TikTok veröffentlichen", queued: "In der Warteschlange", copyAll: "Alles kopieren", copy: "Kopieren", showRest: "Rest anzeigen ({n} weitere)", showLess: "Weniger anzeigen", showDesc: "Beschreibung und Tags anzeigen", hide: "Ausblenden", swapHint: "Klick auf ein Foto, um es zu tauschen" },
  listing: { title: "Etsy-Angebot", titleCount: "Titel · {n} von 140", tagsCount: "Tags · {n} von 13", descCount: "Beschreibung · {n} Wörter", similar: "ähnliche Angebote {low} – {high}", cost: "Material und Arbeit kosten dich etwa {cost}" },
  photos: { title: "{n} Fotos", pickedFrom: "aus {n} Bildern ausgewählt", pickedFromUpload: "aus deinem Upload ausgewählt" },
  videos: { title: "3 Shorts", listingVideo: "und ein {n}-s-Angebotsvideo", noText: "Angebotsvideo. Ohne Text.", secs: "{n} s", fromPhotos: "Diese Clips wurden aus deinen Fotos erstellt. Lade beim nächsten Mal ein Making-of-Video hoch, um Clips aus echtem Filmmaterial zu bekommen." },
  markets: { title: "{n} Märkte", sub: "übersetzt, Preise in Landeswährung", shipping: "Der Versand aus deiner Werkstatt ist in jedem Preis enthalten.", names: { GB: "Vereinigtes Königreich", DE: "Deutschland", AU: "Australien", CA: "Kanada", US: "USA" }, langs: { de: "Deutsch", fr: "Französisch", enGB: "Britisches Englisch", enAU: "Australisches Englisch" } },
  did: { title: "Was Claude gemacht hat", starting: "Startet…", editable: "Alles lässt sich vor dem Veröffentlichen bearbeiten." },
  toast: { copied: "Angebot kopiert", marketCopied: "Angebot für {market} kopiert", queued: "In der Warteschlange für Shopify und TikTok", failed: "Veröffentlichen hat noch nicht geklappt", previewPublish: "Nur Vorschau – nichts wurde veröffentlicht", previewDownload: "Nur Vorschau – verbinde Supabase zum Herunterladen", previewExport: "Nur Vorschau – verbinde Supabase zum Exportieren" },
  roles: { hero: "Hauptbild", in_hand: "In der Hand", detail: "Detail", process: "Beim Machen", scale: "Größe", alt: "Alternative" },
  dur: { minSec: "{m} Min. {s} s", sec: "{s} s" },
  launches: { title: "Meine Launches", newLaunch: "Neuer Launch", emptyTitle: "Hier ist noch nichts", emptySub: "Lade ein Making-of-Video hoch, und dein erstes Kit erscheint hier.", building: "Wird erstellt…", builtIn: "erstellt in {time}", status: { ready: "fertig", published: "veröffentlicht", failed: "fehlgeschlagen", building: "in Arbeit" } },
};

const it: KitMessages = {
  status: { ready: "Pronto in {time} · circa {h} h {m} min risparmiati", failed: "Qualcosa è andato storto nella creazione di questo kit.", uploadAgain: "Carica di nuovo", starting: "Avvio", progress: "Avanzamento" },
  steps: { watch_footage: "Guardo il tuo video", score_frames: "Scelgo i fotogrammi migliori", extract_attributes: "Leggo il prodotto", research_comparables: "Controllo annunci simili", write_listing: "Scrivo l’annuncio", price: "Fisso il prezzo", write_hooks: "Scrivo tre hook", cut_points: "Taglio i video", localize: "Traduco per quattro mercati", format_for_channel: "Formatto per ogni canale" },
  header: { title: "Il tuo kit di lancio", fromVideo: "Da {video} ({dur})", fromVideoAndPhotos: "Da {video} ({dur}) e {n} foto", fromPhotosNoVideo: "Da {n} foto · nessun video", fromUpload: "Dal tuo caricamento", video: "video" },
  buttons: { downloadAll: "Scarica tutto", etsyCsv: "CSV Etsy", publish: "Pubblica su Shopify e TikTok", queued: "In coda", copyAll: "Copia tutto", copy: "Copia", showRest: "Mostra il resto (altri {n})", showLess: "Mostra meno", showDesc: "Mostra descrizione e tag", hide: "Nascondi", swapHint: "Clicca una foto per sostituirla" },
  listing: { title: "Annuncio Etsy", titleCount: "Titolo · {n} di 140", tagsCount: "Tag · {n} di 13", descCount: "Descrizione · {n} parole", similar: "annunci simili {low} – {high}", cost: "materiali e lavoro ti costano circa {cost}" },
  photos: { title: "{n} foto", pickedFrom: "scelte tra {n} fotogrammi", pickedFromUpload: "scelte dal tuo caricamento" },
  videos: { title: "3 video brevi", listingVideo: "e un video annuncio di {n} s", noText: "Video dell’annuncio. Senza testo.", secs: "{n} s", fromPhotos: "Questi clip sono stati creati dalle tue foto. La prossima volta aggiungi un video della lavorazione per clip con riprese vere." },
  markets: { title: "{n} mercati", sub: "tradotto, con prezzi in valuta locale", shipping: "La spedizione dal tuo laboratorio è inclusa in ogni prezzo.", names: { GB: "Regno Unito", DE: "Germania", AU: "Australia", CA: "Canada", US: "Stati Uniti" }, langs: { de: "Tedesco", fr: "Francese", enGB: "Inglese britannico", enAU: "Inglese australiano" } },
  did: { title: "Cosa ha fatto Claude", starting: "Avvio…", editable: "Puoi modificare tutto prima di pubblicare." },
  toast: { copied: "Annuncio copiato", marketCopied: "Annuncio {market} copiato", queued: "In coda per Shopify e TikTok", failed: "Non è ancora possibile pubblicare", previewPublish: "Solo anteprima: non è stato pubblicato nulla", previewDownload: "Solo anteprima: collega Supabase per scaricare", previewExport: "Solo anteprima: collega Supabase per esportare" },
  roles: { hero: "Principale", in_hand: "In mano", detail: "Dettaglio", process: "In lavorazione", scale: "Proporzioni", alt: "Alternativa" },
  dur: { minSec: "{m} min {s} s", sec: "{s} s" },
  launches: { title: "I miei lanci", newLaunch: "Nuovo lancio", emptyTitle: "Ancora niente qui", emptySub: "Trascina un video della lavorazione e il tuo primo kit comparirà qui.", building: "In creazione…", builtIn: "creato in {time}", status: { ready: "pronto", published: "pubblicato", failed: "fallito", building: "in corso" } },
};

const nl: KitMessages = {
  status: { ready: "Klaar in {time} · ongeveer {h} u {m} min bespaard", failed: "Er ging iets mis bij het maken van deze kit.", uploadAgain: "Opnieuw uploaden", starting: "Starten", progress: "Voortgang" },
  steps: { watch_footage: "Je video bekijken", score_frames: "De beste beelden kiezen", extract_attributes: "Het product bekijken", research_comparables: "Vergelijkbare advertenties checken", write_listing: "De advertentie schrijven", price: "De prijs bepalen", write_hooks: "Drie hooks schrijven", cut_points: "De video’s monteren", localize: "Vertalen voor vier markten", format_for_channel: "Opmaken per kanaal" },
  header: { title: "Je launch-kit", fromVideo: "Uit {video} ({dur})", fromVideoAndPhotos: "Uit {video} ({dur}) en {n} foto’s", fromPhotosNoVideo: "Uit {n} foto’s · geen video", fromUpload: "Uit je upload", video: "video" },
  buttons: { downloadAll: "Alles downloaden", etsyCsv: "Etsy-CSV", publish: "Publiceren op Shopify en TikTok", queued: "In de wachtrij", copyAll: "Alles kopiëren", copy: "Kopiëren", showRest: "Rest tonen (nog {n})", showLess: "Minder tonen", showDesc: "Beschrijving en tags tonen", hide: "Verbergen", swapHint: "Klik op een foto om te wisselen" },
  listing: { title: "Etsy-advertentie", titleCount: "Titel · {n} van 140", tagsCount: "Tags · {n} van 13", descCount: "Beschrijving · {n} woorden", similar: "vergelijkbare advertenties {low} – {high}", cost: "je materiaal en werk komen op ongeveer {cost}" },
  photos: { title: "{n} foto’s", pickedFrom: "gekozen uit {n} beelden", pickedFromUpload: "gekozen uit je upload" },
  videos: { title: "3 shorts", listingVideo: "en een advertentievideo van {n} s", noText: "Advertentievideo. Zonder tekst.", secs: "{n} s", fromPhotos: "Deze clips zijn gemaakt van je foto’s. Voeg volgende keer een making-of-video toe voor clips uit echt beeldmateriaal." },
  markets: { title: "{n} markten", sub: "vertaald, geprijsd in lokale valuta", shipping: "Verzending vanuit je atelier zit in elke prijs.", names: { GB: "Verenigd Koninkrijk", DE: "Duitsland", AU: "Australië", CA: "Canada", US: "Verenigde Staten" }, langs: { de: "Duits", fr: "Frans", enGB: "Brits Engels", enAU: "Australisch Engels" } },
  did: { title: "Wat Claude deed", starting: "Opstarten…", editable: "Alles is aan te passen voordat je publiceert." },
  toast: { copied: "Advertentie gekopieerd", marketCopied: "Advertentie voor {market} gekopieerd", queued: "In de wachtrij voor Shopify en TikTok", failed: "Publiceren lukt nog niet", previewPublish: "Alleen voorbeeld: er is niets gepubliceerd", previewDownload: "Alleen voorbeeld: koppel Supabase om te downloaden", previewExport: "Alleen voorbeeld: koppel Supabase om te exporteren" },
  roles: { hero: "Hoofdfoto", in_hand: "In de hand", detail: "Detail", process: "Aan het maken", scale: "Formaat", alt: "Alternatief" },
  dur: { minSec: "{m} min {s} s", sec: "{s} s" },
  launches: { title: "Mijn lanceringen", newLaunch: "Nieuwe lancering", emptyTitle: "Nog niets hier", emptySub: "Sleep een making-of-video hierheen en je eerste kit verschijnt hier.", building: "Bezig…", builtIn: "gemaakt in {time}", status: { ready: "klaar", published: "gepubliceerd", failed: "mislukt", building: "bezig" } },
};

const tr: KitMessages = {
  status: { ready: "{time} içinde hazır · yaklaşık {h} sa {m} dk kazandın", failed: "Bu kit hazırlanırken bir şeyler ters gitti.", uploadAgain: "Yeniden yükle", starting: "Başlıyor", progress: "İlerleme" },
  steps: { watch_footage: "Videon izleniyor", score_frames: "En iyi kareler seçiliyor", extract_attributes: "Ürün inceleniyor", research_comparables: "Benzer ilanlar kontrol ediliyor", write_listing: "İlan yazılıyor", price: "Fiyat belirleniyor", write_hooks: "Üç açılış cümlesi yazılıyor", cut_points: "Videolar kesiliyor", localize: "Dört pazar için çevriliyor", format_for_channel: "Her kanal için biçimlendiriliyor" },
  header: { title: "Lansman kitin", fromVideo: "{video} ({dur}) ile", fromVideoAndPhotos: "{video} ({dur}) ve {n} fotoğraf ile", fromPhotosNoVideo: "{n} fotoğraf ile · video yok", fromUpload: "Yüklediklerinle", video: "video" },
  buttons: { downloadAll: "Hepsini indir", etsyCsv: "Etsy CSV", publish: "Shopify ve TikTok’ta yayınla", queued: "Sırada", copyAll: "Hepsini kopyala", copy: "Kopyala", showRest: "Devamını göster ({n} tane daha)", showLess: "Daha az göster", showDesc: "Açıklama ve etiketleri göster", hide: "Gizle", swapHint: "Değiştirmek için bir fotoğrafa tıkla" },
  listing: { title: "Etsy ilanı", titleCount: "Başlık · {n} / 140", tagsCount: "Etiketler · {n} / 13", descCount: "Açıklama · {n} kelime", similar: "benzer ilanlar {low} – {high}", cost: "malzeme ve emeğin yaklaşık {cost} tutuyor" },
  photos: { title: "{n} fotoğraf", pickedFrom: "{n} kare arasından seçildi", pickedFromUpload: "yüklediklerinden seçildi" },
  videos: { title: "3 kısa video", listingVideo: "ve {n} sn’lik bir ilan videosu", noText: "İlan videosu. Yazısız.", secs: "{n} sn", fromPhotos: "Bu klipler fotoğraflarından oluşturuldu. Gerçek çekimden klipler için bir dahaki sefere yapım videosu ekle." },
  markets: { title: "{n} pazar", sub: "çevrildi, yerel para biriminde fiyatlandı", shipping: "Atölyenden kargo her fiyata dahil.", names: { GB: "Birleşik Krallık", DE: "Almanya", AU: "Avustralya", CA: "Kanada", US: "ABD" }, langs: { de: "Almanca", fr: "Fransızca", enGB: "İngiliz İngilizcesi", enAU: "Avustralya İngilizcesi" } },
  did: { title: "Claude ne yaptı", starting: "Başlatılıyor…", editable: "Yayınlamadan önce her şeyi düzenleyebilirsin." },
  toast: { copied: "İlan kopyalandı", marketCopied: "{market} ilanı kopyalandı", queued: "Shopify ve TikTok için sıraya alındı", failed: "Henüz yayınlanamadı", previewPublish: "Yalnızca önizleme: hiçbir şey yayınlanmadı", previewDownload: "Yalnızca önizleme: indirmek için Supabase’i bağla", previewExport: "Yalnızca önizleme: dışa aktarmak için Supabase’i bağla" },
  roles: { hero: "Ana", in_hand: "Elde", detail: "Detay", process: "Yapım", scale: "Ölçek", alt: "Alternatif" },
  dur: { minSec: "{m} dk {s} sn", sec: "{s} sn" },
  launches: { title: "Lansmanlarım", newLaunch: "Yeni lansman", emptyTitle: "Henüz bir şey yok", emptySub: "Bir yapım videosu bırak, ilk kitin burada görünsün.", building: "Hazırlanıyor…", builtIn: "{time} içinde hazırlandı", status: { ready: "hazır", published: "yayında", failed: "başarısız", building: "hazırlanıyor" } },
};

const ar: KitMessages = {
  status: { ready: "جاهزة خلال {time} · وفّرت نحو {h} س {m} د", failed: "حدث خطأ أثناء إعداد هذه المجموعة.", uploadAgain: "ارفع من جديد", starting: "جارٍ البدء", progress: "تقدم الإعداد" },
  steps: { watch_footage: "مشاهدة الفيديو", score_frames: "اختيار أفضل اللقطات", extract_attributes: "قراءة المنتج", research_comparables: "مراجعة الإعلانات المشابهة", write_listing: "كتابة الإعلان", price: "تحديد السعر", write_hooks: "كتابة ثلاث جُمل افتتاحية", cut_points: "قصّ الفيديوهات", localize: "الترجمة لأربعة أسواق", format_for_channel: "التنسيق لكل قناة" },
  header: { title: "مجموعة الإطلاق الخاصة بك", fromVideo: "من {video} ({dur})", fromVideoAndPhotos: "من {video} ({dur}) و{n} صور", fromPhotosNoVideo: "من {n} صور · بلا فيديو", fromUpload: "مما رفعته", video: "فيديو" },
  buttons: { downloadAll: "تنزيل كل شيء", etsyCsv: "ملف CSV لـ Etsy", publish: "النشر على Shopify وTikTok", queued: "في قائمة الانتظار", copyAll: "نسخ الكل", copy: "نسخ", showRest: "عرض البقية ({n} أخرى)", showLess: "عرض أقل", showDesc: "عرض الوصف والوسوم", hide: "إخفاء", swapHint: "انقر على صورة لاستبدالها" },
  listing: { title: "إعلان Etsy", titleCount: "العنوان · {n} من 140", tagsCount: "الوسوم · {n} من 13", descCount: "الوصف · {n} كلمة", similar: "إعلانات مشابهة {low} – {high}", cost: "تكلفة موادك وعملك نحو {cost}" },
  photos: { title: "{n} صور", pickedFrom: "اختيرت من {n} لقطة", pickedFromUpload: "اختيرت مما رفعته" },
  videos: { title: "3 مقاطع قصيرة", listingVideo: "وفيديو إعلان مدته {n} ث", noText: "فيديو الإعلان. بلا نص.", secs: "{n} ث", fromPhotos: "صُنعت هذه المقاطع من صورك. أضف فيديو لعملية الصنع في المرة القادمة لتحصل على مقاطع من تصوير حقيقي." },
  markets: { title: "{n} أسواق", sub: "مترجم ومسعّر بالعملة المحلية", shipping: "الشحن من ورشتك مشمول في كل سعر.", names: { GB: "المملكة المتحدة", DE: "ألمانيا", AU: "أستراليا", CA: "كندا", US: "الولايات المتحدة" }, langs: { de: "الألمانية", fr: "الفرنسية", enGB: "الإنجليزية البريطانية", enAU: "الإنجليزية الأسترالية" } },
  did: { title: "ما فعله Claude", starting: "جارٍ البدء…", editable: "يمكنك تعديل كل شيء قبل النشر." },
  toast: { copied: "تم نسخ الإعلان", marketCopied: "تم نسخ إعلان {market}", queued: "في قائمة الانتظار لـ Shopify وTikTok", failed: "تعذّر النشر حاليًا", previewPublish: "معاينة فقط — لم يُنشر شيء", previewDownload: "معاينة فقط — اربط Supabase للتنزيل", previewExport: "معاينة فقط — اربط Supabase للتصدير" },
  roles: { hero: "الصورة الرئيسية", in_hand: "في اليد", detail: "تفاصيل", process: "أثناء الصنع", scale: "الحجم", alt: "بديلة" },
  dur: { minSec: "{m} د {s} ث", sec: "{s} ث" },
  launches: { title: "إطلاقاتي", newLaunch: "إطلاق جديد", emptyTitle: "لا شيء هنا بعد", emptySub: "ضع فيديو لعملية الصنع وستظهر مجموعتك الأولى هنا.", building: "قيد الإعداد…", builtIn: "أُعدّت خلال {time}", status: { ready: "جاهزة", published: "منشورة", failed: "فشلت", building: "قيد الإعداد" } },
};

const hi: KitMessages = {
  status: { ready: "{time} में तैयार · लगभग {h} घं {m} मि बचे", failed: "यह किट बनाते समय कुछ गड़बड़ हो गई।", uploadAgain: "फिर से अपलोड करें", starting: "शुरू हो रहा है", progress: "प्रगति" },
  steps: { watch_footage: "आपका वीडियो देख रहा है", score_frames: "सबसे अच्छे फ़्रेम चुन रहा है", extract_attributes: "प्रोडक्ट समझ रहा है", research_comparables: "मिलती-जुलती लिस्टिंग देख रहा है", write_listing: "लिस्टिंग लिख रहा है", price: "कीमत तय कर रहा है", write_hooks: "तीन हुक लिख रहा है", cut_points: "वीडियो काट रहा है", localize: "चार बाज़ारों के लिए अनुवाद कर रहा है", format_for_channel: "हर चैनल के लिए फ़ॉर्मैट कर रहा है" },
  header: { title: "आपकी लॉन्च किट", fromVideo: "{video} ({dur}) से", fromVideoAndPhotos: "{video} ({dur}) और {n} फ़ोटो से", fromPhotosNoVideo: "{n} फ़ोटो से · कोई वीडियो नहीं", fromUpload: "आपके अपलोड से", video: "वीडियो" },
  buttons: { downloadAll: "सब डाउनलोड करें", etsyCsv: "Etsy CSV", publish: "Shopify और TikTok पर पब्लिश करें", queued: "कतार में", copyAll: "सब कॉपी करें", copy: "कॉपी करें", showRest: "बाकी दिखाएँ ({n} और)", showLess: "कम दिखाएँ", showDesc: "विवरण और टैग दिखाएँ", hide: "छिपाएँ", swapHint: "बदलने के लिए किसी फ़ोटो पर क्लिक करें" },
  listing: { title: "Etsy लिस्टिंग", titleCount: "शीर्षक · 140 में से {n}", tagsCount: "टैग · 13 में से {n}", descCount: "विवरण · {n} शब्द", similar: "मिलती-जुलती लिस्टिंग {low} – {high}", cost: "आपकी सामग्री और मेहनत लगभग {cost} की है" },
  photos: { title: "{n} फ़ोटो", pickedFrom: "{n} फ़्रेम में से चुनी गईं", pickedFromUpload: "आपके अपलोड से चुनी गईं" },
  videos: { title: "3 शॉर्ट्स", listingVideo: "और {n} सेकंड का एक लिस्टिंग वीडियो", noText: "लिस्टिंग वीडियो। बिना टेक्स्ट।", secs: "{n} से", fromPhotos: "ये क्लिप आपकी फ़ोटो से बनाई गई हैं। असली फ़ुटेज वाली क्लिप के लिए अगली बार बनाने का वीडियो जोड़ें।" },
  markets: { title: "{n} बाज़ार", sub: "अनुवादित, स्थानीय मुद्रा में कीमत", shipping: "आपके स्टूडियो से शिपिंग हर कीमत में शामिल है।", names: { GB: "यूनाइटेड किंगडम", DE: "जर्मनी", AU: "ऑस्ट्रेलिया", CA: "कनाडा", US: "संयुक्त राज्य अमेरिका" }, langs: { de: "जर्मन", fr: "फ़्रेंच", enGB: "ब्रिटिश अंग्रेज़ी", enAU: "ऑस्ट्रेलियाई अंग्रेज़ी" } },
  did: { title: "Claude ने क्या किया", starting: "शुरू हो रहा है…", editable: "पब्लिश करने से पहले सब कुछ बदला जा सकता है।" },
  toast: { copied: "लिस्टिंग कॉपी हुई", marketCopied: "{market} की लिस्टिंग कॉपी हुई", queued: "Shopify और TikTok के लिए कतार में", failed: "अभी पब्लिश नहीं हो सका", previewPublish: "सिर्फ़ प्रीव्यू — कुछ पब्लिश नहीं हुआ", previewDownload: "सिर्फ़ प्रीव्यू — डाउनलोड के लिए Supabase जोड़ें", previewExport: "सिर्फ़ प्रीव्यू — एक्सपोर्ट के लिए Supabase जोड़ें" },
  roles: { hero: "मुख्य", in_hand: "हाथ में", detail: "बारीकी", process: "बनाते हुए", scale: "आकार", alt: "वैकल्पिक" },
  dur: { minSec: "{m} मि {s} से", sec: "{s} से" },
  launches: { title: "मेरे लॉन्च", newLaunch: "नया लॉन्च", emptyTitle: "अभी यहाँ कुछ नहीं है", emptySub: "बनाने का वीडियो डालिए, आपकी पहली किट यहाँ दिखेगी।", building: "बन रही है…", builtIn: "{time} में बनी", status: { ready: "तैयार", published: "पब्लिश", failed: "असफल", building: "बन रही है" } },
};

const id: KitMessages = {
  status: { ready: "Siap dalam {time} · hemat sekitar {h} jam {m} mnt", failed: "Ada yang salah saat membuat kit ini.", uploadAgain: "Unggah lagi", starting: "Memulai", progress: "Progres" },
  steps: { watch_footage: "Menonton videomu", score_frames: "Memilih frame terbaik", extract_attributes: "Membaca produk", research_comparables: "Mengecek listing serupa", write_listing: "Menulis listing", price: "Menentukan harga", write_hooks: "Menulis tiga hook", cut_points: "Memotong video", localize: "Menerjemahkan untuk empat pasar", format_for_channel: "Memformat untuk tiap kanal" },
  header: { title: "Kit peluncuranmu", fromVideo: "Dari {video} ({dur})", fromVideoAndPhotos: "Dari {video} ({dur}) dan {n} foto", fromPhotosNoVideo: "Dari {n} foto · tanpa video", fromUpload: "Dari unggahanmu", video: "video" },
  buttons: { downloadAll: "Unduh semua", etsyCsv: "CSV Etsy", publish: "Terbitkan ke Shopify dan TikTok", queued: "Dalam antrean", copyAll: "Salin semua", copy: "Salin", showRest: "Tampilkan sisanya ({n} lagi)", showLess: "Tampilkan lebih sedikit", showDesc: "Tampilkan deskripsi dan tag", hide: "Sembunyikan", swapHint: "Klik foto untuk menggantinya" },
  listing: { title: "Listing Etsy", titleCount: "Judul · {n} dari 140", tagsCount: "Tag · {n} dari 13", descCount: "Deskripsi · {n} kata", similar: "listing serupa {low} – {high}", cost: "bahan dan kerjamu sekitar {cost}" },
  photos: { title: "{n} foto", pickedFrom: "dipilih dari {n} frame", pickedFromUpload: "dipilih dari unggahanmu" },
  videos: { title: "3 video pendek", listingVideo: "dan satu video listing {n} dtk", noText: "Video listing. Tanpa teks.", secs: "{n} dtk", fromPhotos: "Klip ini dibuat dari fotomu. Lain kali tambahkan video proses pembuatan untuk klip dari rekaman asli." },
  markets: { title: "{n} pasar", sub: "diterjemahkan, harga dalam mata uang lokal", shipping: "Ongkir dari studiomu sudah termasuk di tiap harga.", names: { GB: "Inggris Raya", DE: "Jerman", AU: "Australia", CA: "Kanada", US: "Amerika Serikat" }, langs: { de: "Jerman", fr: "Prancis", enGB: "Inggris British", enAU: "Inggris Australia" } },
  did: { title: "Yang dilakukan Claude", starting: "Memulai…", editable: "Semua bisa diedit sebelum kamu terbitkan." },
  toast: { copied: "Listing disalin", marketCopied: "Listing {market} disalin", queued: "Dalam antrean untuk Shopify dan TikTok", failed: "Belum bisa diterbitkan", previewPublish: "Hanya pratinjau — tidak ada yang diterbitkan", previewDownload: "Hanya pratinjau — hubungkan Supabase untuk mengunduh", previewExport: "Hanya pratinjau — hubungkan Supabase untuk mengekspor" },
  roles: { hero: "Utama", in_hand: "Di tangan", detail: "Detail", process: "Proses pembuatan", scale: "Skala", alt: "Alternatif" },
  dur: { minSec: "{m} mnt {s} dtk", sec: "{s} dtk" },
  launches: { title: "Peluncuranku", newLaunch: "Peluncuran baru", emptyTitle: "Belum ada apa-apa", emptySub: "Lepaskan video proses pembuatan dan kit pertamamu akan muncul di sini.", building: "Sedang dibuat…", builtIn: "dibuat dalam {time}", status: { ready: "siap", published: "terbit", failed: "gagal", building: "dibuat" } },
};

const ja: KitMessages = {
  status: { ready: "{time}で完成 · 約{h}時間{m}分の作業を短縮", failed: "キットの作成中に問題が起きました。", uploadAgain: "もう一度アップロード", starting: "開始中", progress: "進行状況" },
  steps: { watch_footage: "動画を見ています", score_frames: "ベストなフレームを選んでいます", extract_attributes: "商品を読み取っています", research_comparables: "似た出品を調べています", write_listing: "出品文を書いています", price: "価格を決めています", write_hooks: "3つのフックを書いています", cut_points: "動画をカットしています", localize: "4つの市場向けに翻訳しています", format_for_channel: "各チャンネル向けに整えています" },
  header: { title: "あなたのローンチキット", fromVideo: "{video}（{dur}）から", fromVideoAndPhotos: "{video}（{dur}）と写真{n}枚から", fromPhotosNoVideo: "写真{n}枚から · 動画なし", fromUpload: "アップロードした素材から", video: "動画" },
  buttons: { downloadAll: "すべてダウンロード", etsyCsv: "Etsy用CSV", publish: "ShopifyとTikTokに公開", queued: "待機中", copyAll: "すべてコピー", copy: "コピー", showRest: "続きを表示（あと{n}段落）", showLess: "閉じる", showDesc: "説明文とタグを表示", hide: "隠す", swapHint: "写真をクリックすると差し替えられます" },
  listing: { title: "Etsyの出品", titleCount: "タイトル · {n}/140", tagsCount: "タグ · {n}/13", descCount: "説明文 · {n}語", similar: "似た出品 {low} – {high}", cost: "材料と作業のコストは約{cost}" },
  photos: { title: "写真{n}枚", pickedFrom: "{n}フレームから選択", pickedFromUpload: "アップロードした素材から選択" },
  videos: { title: "ショート動画3本", listingVideo: "と{n}秒の出品動画", noText: "出品動画。テキストなし。", secs: "{n}秒", fromPhotos: "これらのクリップは写真から作りました。次回は制作過程の動画を追加すると、実際の映像からクリップを作れます。" },
  markets: { title: "{n}つの市場", sub: "翻訳済み、現地通貨で価格設定", shipping: "工房からの送料は各価格に含まれています。", names: { GB: "イギリス", DE: "ドイツ", AU: "オーストラリア", CA: "カナダ", US: "アメリカ" }, langs: { de: "ドイツ語", fr: "フランス語", enGB: "イギリス英語", enAU: "オーストラリア英語" } },
  did: { title: "Claudeがしたこと", starting: "起動中…", editable: "公開前にすべて編集できます。" },
  toast: { copied: "出品文をコピーしました", marketCopied: "{market}向けの出品文をコピーしました", queued: "ShopifyとTikTokへの公開を待機中", failed: "まだ公開できませんでした", previewPublish: "プレビューのみ — 何も公開されていません", previewDownload: "プレビューのみ — ダウンロードにはSupabaseを接続してください", previewExport: "プレビューのみ — エクスポートにはSupabaseを接続してください" },
  roles: { hero: "メイン", in_hand: "手に持って", detail: "ディテール", process: "制作中", scale: "サイズ感", alt: "別カット" },
  dur: { minSec: "{m}分{s}秒", sec: "{s}秒" },
  launches: { title: "マイローンチ", newLaunch: "新しいローンチ", emptyTitle: "まだ何もありません", emptySub: "制作過程の動画を入れると、最初のキットがここに表示されます。", building: "作成中…", builtIn: "{time}で作成", status: { ready: "完成", published: "公開済み", failed: "失敗", building: "作成中" } },
};

const ko: KitMessages = {
  status: { ready: "{time} 만에 완성 · 약 {h}시간 {m}분 절약", failed: "키트를 만드는 중 문제가 생겼어요.", uploadAgain: "다시 올리기", starting: "시작 중", progress: "진행 상황" },
  steps: { watch_footage: "영상을 보는 중", score_frames: "가장 좋은 장면을 고르는 중", extract_attributes: "제품을 파악하는 중", research_comparables: "비슷한 상품을 살펴보는 중", write_listing: "상품 설명을 쓰는 중", price: "가격을 정하는 중", write_hooks: "첫 문장 세 개를 쓰는 중", cut_points: "영상을 자르는 중", localize: "4개 시장용으로 번역하는 중", format_for_channel: "채널별로 맞추는 중" },
  header: { title: "내 런치 키트", fromVideo: "{video} ({dur})에서", fromVideoAndPhotos: "{video} ({dur})와 사진 {n}장에서", fromPhotosNoVideo: "사진 {n}장에서 · 영상 없음", fromUpload: "올린 파일에서", video: "영상" },
  buttons: { downloadAll: "전부 내려받기", etsyCsv: "Etsy CSV", publish: "Shopify와 TikTok에 올리기", queued: "대기 중", copyAll: "전체 복사", copy: "복사", showRest: "나머지 보기 ({n}개 더)", showLess: "접기", showDesc: "설명과 태그 보기", hide: "숨기기", swapHint: "사진을 누르면 바꿀 수 있어요" },
  listing: { title: "Etsy 상품 페이지", titleCount: "제목 · {n}/140", tagsCount: "태그 · {n}/13", descCount: "설명 · {n}단어", similar: "비슷한 상품 {low} – {high}", cost: "재료비와 작업 비용은 약 {cost}" },
  photos: { title: "사진 {n}장", pickedFrom: "{n}개 장면 중에서 골랐어요", pickedFromUpload: "올린 파일에서 골랐어요" },
  videos: { title: "쇼츠 3개", listingVideo: "와 {n}초짜리 상품 영상", noText: "상품 영상. 자막 없음.", secs: "{n}초", fromPhotos: "이 클립들은 사진으로 만들었어요. 다음엔 만드는 과정 영상을 함께 올리면 실제 촬영분으로 클립을 만들어 드려요." },
  markets: { title: "{n}개 시장", sub: "번역하고 현지 통화로 가격을 매겼어요", shipping: "작업실에서 보내는 배송비가 각 가격에 포함돼 있어요.", names: { GB: "영국", DE: "독일", AU: "호주", CA: "캐나다", US: "미국" }, langs: { de: "독일어", fr: "프랑스어", enGB: "영국 영어", enAU: "호주 영어" } },
  did: { title: "Claude가 한 일", starting: "시작하는 중…", editable: "올리기 전에 모두 고칠 수 있어요." },
  toast: { copied: "상품 설명을 복사했어요", marketCopied: "{market} 상품 설명을 복사했어요", queued: "Shopify와 TikTok 게시 대기 중", failed: "아직 올리지 못했어요", previewPublish: "미리보기예요 — 아무것도 게시되지 않았어요", previewDownload: "미리보기예요 — 내려받으려면 Supabase를 연결하세요", previewExport: "미리보기예요 — 내보내려면 Supabase를 연결하세요" },
  roles: { hero: "대표", in_hand: "손에 들고", detail: "디테일", process: "만드는 중", scale: "크기 비교", alt: "다른 컷" },
  dur: { minSec: "{m}분 {s}초", sec: "{s}초" },
  launches: { title: "내 런치", newLaunch: "새 런치", emptyTitle: "아직 아무것도 없어요", emptySub: "만드는 과정 영상을 올리면 첫 키트가 여기에 나타나요.", building: "만드는 중…", builtIn: "{time} 만에 완성", status: { ready: "완성", published: "게시됨", failed: "실패", building: "만드는 중" } },
};

const zh: KitMessages = {
  status: { ready: "{time}内完成 · 约节省 {h} 小时 {m} 分钟", failed: "制作这套内容时出了问题。", uploadAgain: "重新上传", starting: "正在开始", progress: "制作进度" },
  steps: { watch_footage: "正在看你的视频", score_frames: "正在挑选最佳画面", extract_attributes: "正在识别产品", research_comparables: "正在查看同类商品", write_listing: "正在撰写商品页", price: "正在定价", write_hooks: "正在写三句开场", cut_points: "正在剪辑视频", localize: "正在为四个市场翻译", format_for_channel: "正在为各渠道排版" },
  header: { title: "你的发布套件", fromVideo: "来自 {video}（{dur}）", fromVideoAndPhotos: "来自 {video}（{dur}）和 {n} 张照片", fromPhotosNoVideo: "来自 {n} 张照片 · 无视频", fromUpload: "来自你上传的内容", video: "视频" },
  buttons: { downloadAll: "全部下载", etsyCsv: "Etsy CSV", publish: "发布到 Shopify 和 TikTok", queued: "排队中", copyAll: "全部复制", copy: "复制", showRest: "展开剩余内容（还有 {n} 段）", showLess: "收起", showDesc: "显示描述和标签", hide: "隐藏", swapHint: "点击照片即可更换" },
  listing: { title: "Etsy 商品页", titleCount: "标题 · {n}/140", tagsCount: "标签 · {n}/13", descCount: "描述 · {n} 词", similar: "同类商品 {low} – {high}", cost: "你的材料和工时成本约 {cost}" },
  photos: { title: "{n} 张照片", pickedFrom: "从 {n} 帧中挑选", pickedFromUpload: "从你上传的内容中挑选" },
  videos: { title: "3 条短视频", listingVideo: "和一条 {n} 秒的商品视频", noText: "商品视频。无文字。", secs: "{n} 秒", fromPhotos: "这些片段是用你的照片制作的。下次附上制作过程视频，就能用真实画面剪出片段。" },
  markets: { title: "{n} 个市场", sub: "已翻译，并按当地货币定价", shipping: "每个价格都已包含从你工作室发货的运费。", names: { GB: "英国", DE: "德国", AU: "澳大利亚", CA: "加拿大", US: "美国" }, langs: { de: "德语", fr: "法语", enGB: "英式英语", enAU: "澳式英语" } },
  did: { title: "Claude 做了什么", starting: "正在启动…", editable: "发布前一切都可以修改。" },
  toast: { copied: "已复制商品页", marketCopied: "已复制{market}商品页", queued: "已加入 Shopify 和 TikTok 的发布队列", failed: "暂时无法发布", previewPublish: "仅为预览——没有发布任何内容", previewDownload: "仅为预览——连接 Supabase 后才能下载", previewExport: "仅为预览——连接 Supabase 后才能导出" },
  roles: { hero: "主图", in_hand: "手持", detail: "细节", process: "制作中", scale: "尺寸参照", alt: "备选" },
  dur: { minSec: "{m} 分 {s} 秒", sec: "{s} 秒" },
  launches: { title: "我的发布", newLaunch: "新建发布", emptyTitle: "这里还什么都没有", emptySub: "放入一段制作过程视频，你的第一套内容就会出现在这里。", building: "制作中…", builtIn: "{time}内完成", status: { ready: "已完成", published: "已发布", failed: "失败", building: "制作中" } },
};

export const KIT: Record<Locale, KitMessages> = { en, es, pt, fr, de, it, nl, tr, ar, hi, id, ja, ko, zh };
