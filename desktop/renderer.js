
// NEOFIND_I18N_LAYER: browser chrome text, status messages, accessibility labels and tooltips.
const browserLanguageKey = "neofind.browserLanguage";
const browserLanguageSelect = document.getElementById("browserLanguage");
const browserTranslations = {
  "Open NeoFind home": ["Otwórz stronę główną NeoFind", "Abrir la página de inicio de NeoFind", "Ouvrir la page d’accueil NeoFind"],
  "NeoFind logo": ["Logo NeoFind", "Logotipo de NeoFind", "Logo NeoFind"],
  "New tab": ["Nowa karta", "Nueva pestaña", "Nouvel onglet"],
  "Back": ["Wstecz", "Atrás", "Précédent"],
  "Forward": ["Dalej", "Adelante", "Suivant"],
  "Reload": ["Odśwież", "Actualizar", "Actualiser"],
  "NeoFind home": ["Strona główna NeoFind", "Inicio de NeoFind", "Accueil NeoFind"],
  "Search NeoFind or enter an address": ["Szukaj w NeoFind lub wpisz adres", "Busca en NeoFind o introduce una dirección", "Rechercher avec NeoFind ou saisir une adresse"],
  "Go": ["Przejdź", "Ir", "Aller"],
  "NeoFind sidebar": ["Panel boczny NeoFind", "Barra lateral de NeoFind", "Barre latérale NeoFind"],
  "Web page area": ["Obszar strony internetowej", "Área de la página web", "Zone de la page web"],
  "Settings": ["Ustawienia", "Configuración", "Paramètres"],
  "Close settings": ["Zamknij ustawienia", "Cerrar configuración", "Fermer les paramètres"],
  "General": ["Ogólne", "General", "Général"],
  "Import": ["Importuj", "Importar", "Importer"],
  "Sidebar apps": ["Aplikacje panelu bocznego", "Aplicaciones de la barra lateral", "Applications de la barre latérale"],
  "History": ["Historia", "Historial", "Historique"],
  "Privacy & security": ["Prywatność i bezpieczeństwo", "Privacidad y seguridad", "Confidentialité et sécurité"],
  "Manage your NeoFind Browser preferences.": ["Zarządzaj ustawieniami NeoFind Browser.", "Administra las preferencias de NeoFind Browser.", "Gérez les préférences de NeoFind Browser."],
  "Browser updates": ["Aktualizacje przeglądarki", "Actualizaciones del navegador", "Mises à jour du navigateur"],
  "Checking installed version...": ["Sprawdzanie zainstalowanej wersji...", "Comprobando la versión instalada...", "Vérification de la version installée..."],
  "Updates are checked automatically when the app starts.": ["Aktualizacje są sprawdzane automatycznie po uruchomieniu aplikacji.", "Las actualizaciones se comprueban automáticamente al iniciar la aplicación.", "Les mises à jour sont vérifiées automatiquement au démarrage de l’application."],
  "Check for updates": ["Sprawdź aktualizacje", "Buscar actualizaciones", "Rechercher des mises à jour"],
  "Default browser": ["Domyślna przeglądarka", "Navegador predeterminado", "Navigateur par défaut"],
  "Set NeoFind Browser as the app that opens web links in Windows.": ["Ustaw NeoFind Browser jako aplikację otwierającą linki w Windows.", "Establece NeoFind Browser como aplicación para abrir enlaces en Windows.", "Définir NeoFind Browser comme application ouvrant les liens dans Windows."],
  "Set as default": ["Ustaw jako domyślną", "Establecer como predeterminado", "Définir par défaut"],
  "Windows may ask you to confirm NeoFind Browser in Default apps.": ["Windows może poprosić o potwierdzenie NeoFind Browser w aplikacjach domyślnych.", "Windows puede pedirte que confirmes NeoFind Browser en Aplicaciones predeterminadas.", "Windows peut demander de confirmer NeoFind Browser dans les applications par défaut."],
  "Browser theme": ["Motyw przeglądarki", "Tema del navegador", "Thème du navigateur"],
  "Choose a theme for the browser chrome and tabs.": ["Wybierz motyw interfejsu i kart przeglądarki.", "Elige un tema para la interfaz y las pestañas del navegador.", "Choisissez un thème pour l’interface et les onglets du navigateur."],
  "New tab destination": ["Miejsce docelowe nowej karty", "Destino de nueva pestaña", "Destination du nouvel onglet"],
  "New tab": ["Nowa karta", "Nueva pestaña", "Nouvel onglet"],
  "Choose whether a new tab stays blank (tooltip: about:home) or opens NeoFind.": ["Wybierz, czy nowa karta ma być pusta (about:home), czy otwierać NeoFind.", "Elige si una pestaña nueva queda en blanco (about:home) o abre NeoFind.", "Choisissez si un nouvel onglet reste vide (about:home) ou ouvre NeoFind."],
  "Blank tab (about:home)": ["Pusta karta (about:home)", "Pestaña en blanco (about:home)", "Onglet vierge (about:home)"],
  "NeoFind (neofind.pl)": ["NeoFind (neofind.pl)", "NeoFind (neofind.pl)", "NeoFind (neofind.pl)"],
  "Choose the language used across the browser, including hover tooltips.": ["Wybierz język całej przeglądarki, w tym podpowiedzi po najechaniu.", "Elige el idioma de todo el navegador, incluidas las ayudas al pasar el cursor.", "Choisissez la langue de tout le navigateur, y compris les infobulles au survol."],
  "Language": ["Język", "Idioma", "Langue"],
  "Browser language": ["Język przeglądarki", "Idioma del navegador", "Langue du navigateur"],
  "Privacy & security": ["Prywatność i bezpieczeństwo", "Privacidad y seguridad", "Confidentialité et sécurité"],
  "Control what NeoFind Browser stores on this device.": ["Kontroluj, co NeoFind Browser zapisuje na tym urządzeniu.", "Controla lo que NeoFind Browser guarda en este dispositivo.", "Contrôlez ce que NeoFind Browser enregistre sur cet appareil."],
  "Do not save browsing history": ["Nie zapisuj historii przeglądania", "No guardar el historial de navegación", "Ne pas enregistrer l’historique de navigation"],
  "When enabled, new visits are not added to NeoFind Browser history. This does not erase history imported from another browser.": ["Po włączeniu nowe odwiedziny nie będą dodawane do historii NeoFind Browser. Nie usuwa to historii zaimportowanej z innej przeglądarki.", "Al activarlo, las nuevas visitas no se añaden al historial de NeoFind Browser. No elimina el historial importado de otro navegador.", "Lorsque cette option est activée, les nouvelles visites ne sont pas ajoutées à l’historique NeoFind Browser. Cela n’efface pas l’historique importé d’un autre navigateur."],
  "Enabled": ["Włączone", "Activado", "Activé"],
  "Incognito mode": ["Tryb incognito", "Modo incógnito", "Mode navigation privée"],
  "Open a private tab. Its browsing history, cookies and site data are not kept after you close the tab. Websites, your network administrator and your internet provider may still see activity.": ["Otwórz kartę prywatną. Po jej zamknięciu historia, pliki cookie i dane witryn nie zostaną zachowane. Witryny, administrator sieci i dostawca internetu nadal mogą widzieć aktywność.", "Abre una pestaña privada. Su historial, cookies y datos del sitio no se conservan al cerrarla. Los sitios, el administrador de red y el proveedor de internet aún pueden ver la actividad.", "Ouvrez un onglet privé. Son historique, ses cookies et ses données de site ne sont pas conservés après fermeture. Les sites, l’administrateur réseau et le fournisseur Internet peuvent toujours voir l’activité."],
  "Open incognito tab": ["Otwórz kartę incognito", "Abrir pestaña de incógnito", "Ouvrir un onglet privé"],
  "Clear browsing data": ["Wyczyść dane przeglądania", "Borrar datos de navegación", "Effacer les données de navigation"],
  "Clear cookies, cache and website storage for the regular browser session.": ["Wyczyść pliki cookie, pamięć podręczną i dane witryn zwykłej sesji.", "Borra cookies, caché y almacenamiento de sitios de la sesión normal.", "Effacez les cookies, le cache et le stockage des sites de la session normale."],
  "Clear data": ["Wyczyść dane", "Borrar datos", "Effacer les données"],
  "Permission requests from supported websites are shown for approval.": ["Prośby o uprawnienia obsługiwanych witryn są wyświetlane do zatwierdzenia.", "Las solicitudes de permisos de sitios compatibles se muestran para su aprobación.", "Les demandes d’autorisation des sites compatibles sont affichées pour approbation."],
  "Connection safety": ["Bezpieczeństwo połączenia", "Seguridad de la conexión", "Sécurité de la connexion"],
  "Use HTTPS for websites that support it. A secure connection does not guarantee that a website itself is trustworthy.": ["Używaj HTTPS na stronach, które go obsługują. Bezpieczne połączenie nie gwarantuje wiarygodności samej witryny.", "Usa HTTPS en los sitios que lo admitan. Una conexión segura no garantiza que el sitio sea fiable.", "Utilisez HTTPS sur les sites compatibles. Une connexion sécurisée ne garantit pas que le site soit fiable."],
  "Browsing history": ["Historia przeglądania", "Historial de navegación", "Historique de navigation"],
  "Pages visited in NeoFind Browser on this device.": ["Strony odwiedzone w NeoFind Browser na tym urządzeniu.", "Páginas visitadas en NeoFind Browser en este dispositivo.", "Pages visitées dans NeoFind Browser sur cet appareil."],
  "Clear history": ["Wyczyść historię", "Borrar historial", "Effacer l’historique"],
  "Import browser data": ["Importuj dane przeglądarki", "Importar datos del navegador", "Importer les données du navigateur"],
  "Move selected information from another browser into NeoFind Browser.": ["Przenieś wybrane informacje z innej przeglądarki do NeoFind Browser.", "Transfiere información seleccionada de otro navegador a NeoFind Browser.", "Transférez les informations sélectionnées d’un autre navigateur vers NeoFind Browser."],
  "Source browser": ["Przeglądarka źródłowa", "Navegador de origen", "Navigateur source"],
  "Everything": ["Wszystko", "Todo", "Tout"],
  "Select all categories, including cookies.": ["Zaznacz wszystkie kategorie, w tym pliki cookie.", "Selecciona todas las categorías, incluidas las cookies.", "Sélectionnez toutes les catégories, y compris les cookies."],
  "Everything except cookies": ["Wszystko oprócz plików cookie", "Todo excepto las cookies", "Tout sauf les cookies"],
  "Select all categories except cookies.": ["Zaznacz wszystkie kategorie oprócz plików cookie.", "Selecciona todas las categorías excepto las cookies.", "Sélectionnez toutes les catégories sauf les cookies."],
  "Bookmarks": ["Zakładki", "Marcadores", "Favoris"],
  "Saved websites and folders": ["Zapisane strony i foldery", "Sitios y carpetas guardados", "Sites et dossiers enregistrés"],
  "Previously visited pages": ["Wcześniej odwiedzone strony", "Páginas visitadas anteriormente", "Pages visitées précédemment"],
  "Saved passwords": ["Zapisane hasła", "Contraseñas guardadas", "Mots de passe enregistrés"],
  "Sensitive login information": ["Wrażliwe informacje logowania", "Información de inicio de sesión sensible", "Informations de connexion sensibles"],
  "Autofill data": ["Dane autouzupełniania", "Datos de autocompletado", "Données de saisie automatique"],
  "Addresses and form details": ["Adresy i dane formularzy", "Direcciones y datos de formularios", "Adresses et détails des formulaires"],
  "Browser settings": ["Ustawienia przeglądarki", "Configuración del navegador", "Paramètres du navigateur"],
  "Preferences, where supported": ["Preferencje, jeśli obsługiwane", "Preferencias, si son compatibles", "Préférences, si prises en charge"],
  "Extensions": ["Rozszerzenia", "Extensiones", "Extensions"],
  "May need to be installed again": ["Może być konieczna ponowna instalacja", "Puede que deban instalarse de nuevo", "Peuvent devoir être réinstallées"],
  "Cookies and website sessions": ["Pliki cookie i sesje witryn", "Cookies y sesiones de sitios web", "Cookies et sessions des sites web"],
  "Can transfer active sign-in sessions. Only select if you trust this device.": ["Może przenieść aktywne sesje logowania. Zaznacz tylko na zaufanym urządzeniu.", "Puede transferir sesiones activas. Selecciona solo si confías en este dispositivo.", "Peut transférer des sessions actives. Sélectionnez uniquement si vous faites confiance à cet appareil."],
  "Import availability in this version": ["Dostępność importu w tej wersji", "Disponibilidad de importación en esta versión", "Disponibilité de l’importation dans cette version"],
  "Chrome, Edge, Brave, Opera, Opera GX and Firefox profiles can import bookmarks and history. Passwords, autofill, browser preferences, extensions and active cookies are detected where possible but are not automatically migrated.": ["Profile Chrome, Edge, Brave, Opera, Opera GX i Firefox mogą importować zakładki i historię. Hasła, autouzupełnianie, ustawienia, rozszerzenia i aktywne pliki cookie są wykrywane, jeśli to możliwe, ale nie są automatycznie przenoszone.", "Los perfiles de Chrome, Edge, Brave, Opera, Opera GX y Firefox pueden importar marcadores e historial. Las contraseñas, el autocompletado, las preferencias, las extensiones y las cookies activas se detectan cuando es posible, pero no se migran automáticamente.", "Les profils Chrome, Edge, Brave, Opera, Opera GX et Firefox peuvent importer les favoris et l’historique. Les mots de passe, la saisie automatique, les préférences, les extensions et les cookies actifs sont détectés si possible, mais ne sont pas migrés automatiquement."],
  "Import selected browser profile…": ["Importuj wybrany profil przeglądarki…", "Importar perfil de navegador seleccionado…", "Importer le profil de navigateur sélectionné…"],
  "Choose bookmarks HTML…": ["Wybierz plik zakładek HTML…", "Elegir archivo HTML de marcadores…", "Choisir un fichier HTML de favoris…"],
  "View imported bookmarks": ["Pokaż zaimportowane zakładki", "Ver marcadores importados", "Afficher les favoris importés"],
  "Choose a preset or customize the categories.": ["Wybierz zestaw lub dostosuj kategorie.", "Elige una opción predefinida o personaliza las categorías.", "Choisissez un préréglage ou personnalisez les catégories."],
  "Spotify": ["Spotify", "Spotify", "Spotify"],
  "X (Twitter)": ["X (Twitter)", "X (Twitter)", "X (Twitter)"],
  "Discord": ["Discord", "Discord", "Discord"],
  "Cyrber": ["Cyrber", "Cyrber", "Cyrber"],
  "GitHub": ["GitHub", "GitHub", "GitHub"],
  "Duplicate tab": ["Duplikuj kartę", "Duplicar pestaña", "Dupliquer l’onglet"],
  "Pin tab": ["Przypnij kartę", "Fijar pestaña", "Épingler l’onglet"],
  "Unpin tab": ["Odepnij kartę", "Desfijar pestaña", "Désépingler l’onglet"],
  "Close tab": ["Zamknij kartę", "Cerrar pestaña", "Fermer l’onglet"],
  "No browsing history yet.": ["Brak historii przeglądania.", "Aún no hay historial de navegación.", "Aucun historique de navigation pour le moment."],
  "Browsing history saving is off. Existing local browsing history was cleared.": ["Zapisywanie historii jest wyłączone. Lokalna historia została wyczyszczona.", "El guardado del historial está desactivado. Se borró el historial local existente.", "L’enregistrement de l’historique est désactivé. L’historique local existant a été effacé."],
  "Browsing history saving is on for regular tabs.": ["Historia jest zapisywana na zwykłych kartach.", "El historial se guarda en las pestañas normales.", "L’historique est enregistré dans les onglets normaux."],
  "An incognito tab was opened. Close that tab when finished to clear its temporary site data.": ["Otwarto kartę incognito. Zamknij ją po zakończeniu, aby usunąć tymczasowe dane witryn.", "Se abrió una pestaña de incógnito. Ciérrala al terminar para borrar los datos temporales del sitio.", "Un onglet privé a été ouvert. Fermez-le pour effacer les données temporaires des sites."],
  "Clearing website storage and cache…": ["Czyszczenie pamięci witryn i pamięci podręcznej…", "Borrando almacenamiento de sitios y caché…", "Effacement du stockage des sites et du cache…"],
  "Cookies, cache, website storage and local browsing history cleared.": ["Wyczyszczono pliki cookie, pamięć podręczną, dane witryn i lokalną historię.", "Se borraron las cookies, la caché, los datos de sitios y el historial local.", "Cookies, cache, stockage des sites et historique local effacés."],
  "Could not clear all data: ": ["Nie udało się wyczyścić wszystkich danych: ", "No se pudieron borrar todos los datos: ", "Impossible d’effacer toutes les données : "],
  "Could not clear browsing data: ": ["Nie udało się wyczyścić danych przeglądania: ", "No se pudieron borrar los datos de navegación: ", "Impossible d’effacer les données de navigation : "],
  "Custom selection updated. Only supported data types will be imported.": ["Zmieniono wybór. Zaimportowane zostaną tylko obsługiwane typy danych.", "Selección actualizada. Solo se importarán los tipos de datos compatibles.", "Sélection mise à jour. Seuls les types de données pris en charge seront importés."],
  "Opening Windows Default apps settings…": ["Otwieranie ustawień aplikacji domyślnych Windows…", "Abriendo la configuración de aplicaciones predeterminadas de Windows…", "Ouverture des paramètres des applications par défaut de Windows…"],
  "Windows Settings opened. Find NeoFind Browser and select it as the default for HTTP and HTTPS.": ["Otwarto ustawienia Windows. Znajdź NeoFind Browser i ustaw go jako domyślną aplikację dla HTTP i HTTPS.", "Se abrió Configuración de Windows. Busca NeoFind Browser y selecciónalo como predeterminado para HTTP y HTTPS.", "Les paramètres Windows sont ouverts. Trouvez NeoFind Browser et définissez-le par défaut pour HTTP et HTTPS."],
  "Could not open Windows Settings. Open Settings → Apps → Default apps and search for NeoFind Browser.": ["Nie udało się otworzyć ustawień Windows. Otwórz Ustawienia → Aplikacje → Aplikacje domyślne i wyszukaj NeoFind Browser.", "No se pudo abrir Configuración de Windows. Abre Configuración → Aplicaciones → Aplicaciones predeterminadas y busca NeoFind Browser.", "Impossible d’ouvrir les paramètres Windows. Ouvrez Paramètres → Applications → Applications par défaut et recherchez NeoFind Browser."],
  "Open Windows Settings → Apps → Default apps and search for NeoFind Browser.": ["Otwórz Ustawienia Windows → Aplikacje → Aplikacje domyślne i wyszukaj NeoFind Browser.", "Abre Configuración de Windows → Aplicaciones → Aplicaciones predeterminadas y busca NeoFind Browser.", "Ouvrez Paramètres Windows → Applications → Applications par défaut et recherchez NeoFind Browser."],
  "No imported bookmarks yet.": ["Brak zaimportowanych zakładek.", "Aún no hay marcadores importados.", "Aucun favori importé pour le moment."],
  "No valid bookmarks found. Export bookmarks as HTML from your source browser and try again.": ["Nie znaleziono prawidłowych zakładek. Wyeksportuj zakładki jako HTML z przeglądarki źródłowej i spróbuj ponownie.", "No se encontraron marcadores válidos. Exporta los marcadores como HTML desde el navegador de origen e inténtalo de nuevo.", "Aucun favori valide trouvé. Exportez les favoris en HTML depuis le navigateur source et réessayez."],
  "Imported ": ["Zaimportowano ", "Importados ", "Importé(s) "],
  " bookmarks from ": [" zakładek z ", " marcadores de ", " favoris depuis "],
  ". Total saved: ": ". Łącznie zapisano: ",
  "Could not import bookmarks: ": ["Nie udało się zaimportować zakładek: ", "No se pudieron importar los marcadores: ", "Impossible d’importer les favoris : "],
  "Reading ": ["Odczytywanie ", "Leyendo ", "Lecture de "],
  " profile…": [" profilu…", " perfil…", " du profil…"],
  "No imported history yet.": ["Brak zaimportowanej historii.", "Aún no hay historial importado.", "Aucun historique importé pour le moment."],
  "Update status changed.": ["Zmieniono stan aktualizacji.", "El estado de actualización ha cambiado.", "L’état de la mise à jour a changé."],
  "Version ": ["Wersja ", "Versión ", "Version "],
  " is already installed.": [" jest już zainstalowana.", " ya está instalada.", " est déjà installée."],
  "Downloading...": ["Pobieranie...", "Descargando...", "Téléchargement..."],
  "Checking...": ["Sprawdzanie...", "Comprobando...", "Vérification..."],
  "Checking GitHub Releases...": ["Sprawdzanie wydań GitHub...", "Comprobando las versiones de GitHub...", "Vérification des versions GitHub..."],
  "Could not check for updates: ": ["Nie udało się sprawdzić aktualizacji: ", "No se pudieron comprobar las actualizaciones: ", "Impossible de vérifier les mises à jour : "],
  "Installed version: ": ["Zainstalowana wersja: ", "Versión instalada: ", "Version installée : "],
  "Private tab · ": ["Karta prywatna · ", "Pestaña privada · ", "Onglet privé · "],
  "Loading": ["Ładowanie", "Cargando", "Chargement"],
  "Close ": ["Zamknij ", "Cerrar ", "Fermer "],
  "tab": ["kartę", "pestaña", "onglet"]
};
const browserTranslationReverse = {};
for (const [english, values] of Object.entries(browserTranslations)) {
  browserTranslationReverse[english] = english;
  values.forEach(value => { browserTranslationReverse[value] = english; });
}
function translateBrowserString(value, language) {
  if (typeof value !== "string" || !value) return value;
  const original = browserTranslationReverse[value] || value;
  const index = ({ en: -1, pl: 0, es: 1, fr: 2 })[language] ?? -1;
  if (index < 0) return original;
  if (browserTranslations[original]) return browserTranslations[original][index];
  for (const [key, values] of Object.entries(browserTranslations)) {
    if (value.startsWith(key) && key.length > 6) {
      const suffix = value.slice(key.length);
      const translatedPrefix = values[index];
      if (typeof translatedPrefix === "string") return translatedPrefix + suffix;
    }
  }
  return value;
}
function applyBrowserLanguage(language) {
  const chosen = ["en", "pl", "es", "fr"].includes(language) ? language : "en";
  document.documentElement.lang = chosen;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const translated = translateBrowserString(node.nodeValue, chosen);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }
  document.querySelectorAll("*").forEach(element => {
    for (const attr of ["title", "placeholder", "aria-label"]) {
      const value = element.getAttribute(attr);
      if (value) {
        const translated = translateBrowserString(value, chosen);
        if (translated !== value) element.setAttribute(attr, translated);
      }
    }
  });
  if (browserLanguageSelect && browserLanguageSelect.value !== chosen) browserLanguageSelect.value = chosen;
  window.neoBrowser.setLanguage(chosen);
}
if (browserLanguageSelect) {
  browserLanguageSelect.value = localStorage.getItem(browserLanguageKey) || "en";
  browserLanguageSelect.addEventListener("change", () => {
    localStorage.setItem(browserLanguageKey, browserLanguageSelect.value);
    applyBrowserLanguage(browserLanguageSelect.value);
  });
}
applyBrowserLanguage(localStorage.getItem(browserLanguageKey) || "en");
const browserLanguageObserver = new MutationObserver(() => {
  if (browserLanguageObserver._running) return;
  browserLanguageObserver._running = true;
  try {
    const language = localStorage.getItem(browserLanguageKey) || "en";
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const translated = translateBrowserString(node.nodeValue, language);
      if (translated !== node.nodeValue) node.nodeValue = translated;
    }
    document.querySelectorAll("*").forEach(element => {
      for (const attr of ["title", "placeholder", "aria-label"]) {
        const value = element.getAttribute(attr);
        if (value) {
          const translated = translateBrowserString(value, language);
          if (translated !== value) element.setAttribute(attr, translated);
        }
      }
    });
  } finally { browserLanguageObserver._running = false; }
});
browserLanguageObserver.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "placeholder", "aria-label"] });

const tabsElement = document.getElementById("tabs");
const addressInput = document.getElementById("address");
const viewport = document.getElementById("pageViewport");

function renderTabs(state) {
  tabsElement.replaceChildren();
  for (const tab of state.tabs) {
    const item = document.createElement("div");
    item.className = "tab" + (tab.id === state.activeTabId ? " active" : "") + (tab.pinned ? " pinned" : "") + (tab.isPrivate ? " private-tab" : "");
    item.title = (tab.isPrivate ? "Private tab · " : "") + (tab.isHomeTab ? "about:home" : (tab.url || "about:blank"));
    item.draggable = true;
    item.dataset.tabId = String(tab.id);
    item.addEventListener("click", () => window.neoBrowser.switchTab(tab.id));
    item.addEventListener("contextmenu", (event) => { event.preventDefault(); showTabContextMenu(event.clientX, event.clientY, tab); });
    item.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", String(tab.id)); event.dataTransfer.effectAllowed = "move"; item.classList.add("dragging"); });
    item.addEventListener("dragend", () => { item.classList.remove("dragging"); tabsElement.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over")); });
    item.addEventListener("dragover", (event) => { event.preventDefault(); item.classList.add("drag-over"); });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", (event) => { event.preventDefault(); item.classList.remove("drag-over"); const from = Number(event.dataTransfer.getData("text/plain")); const to = Number(item.dataset.tabId); if (from && to && from !== to) window.neoBrowser.reorderTabs(from, to); });

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.isHomeTab ? "New Tab" : (tab.loading ? (tab.title || "Loading") + " ·" : (tab.title || "New Tab"));

    const close = document.createElement("button");
    close.className = "tab-close";
    close.type = "button";
    close.textContent = "×";
    close.title = "Close tab";
    close.setAttribute("aria-label", "Close " + (tab.title || "tab"));
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      window.neoBrowser.closeTab(tab.id);
    });
    item.append(title, close);
    tabsElement.append(item);
  }

  const active = state.tabs.find((tab) => tab.id === state.activeTabId);
  if (active && document.activeElement !== addressInput) addressInput.value = active.url || "";
  document.getElementById("back").disabled = !active || !active.canGoBack;
  document.getElementById("forward").disabled = !active || !active.canGoForward;
}


// Tab context menu: duplicate and pin actions live on right-click.
let tabContextTarget = null;
let tabContextMenu = document.getElementById("tabContextMenu");
if (!tabContextMenu) {
  tabContextMenu = document.createElement("div");
  tabContextMenu.id = "tabContextMenu";
  tabContextMenu.className = "tab-context-menu hidden";
  tabContextMenu.setAttribute("role", "menu");
  tabContextMenu.innerHTML = '<button type="button" data-tab-action="duplicate" role="menuitem">Duplicate tab</button><button type="button" data-tab-action="pin" role="menuitem">Pin tab</button>';
  document.body.append(tabContextMenu);
}
function showTabContextMenu(x, y, tab) {
  tabContextTarget = tab;
  const pinAction = tabContextMenu.querySelector('[data-tab-action="pin"]');
  pinAction.textContent = tab.pinned ? "Unpin tab" : "Pin tab";
  tabContextMenu.classList.remove("hidden");
  const width = tabContextMenu.offsetWidth || 180, height = tabContextMenu.offsetHeight || 80;
  tabContextMenu.style.left = Math.max(6, Math.min(x, window.innerWidth - width - 6)) + "px";
  tabContextMenu.style.top = Math.max(6, Math.min(y, window.innerHeight - height - 6)) + "px";
}
tabContextMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-tab-action]");
  if (!button || !tabContextTarget) return;
  const target = tabContextTarget;
  tabContextMenu.classList.add("hidden");
  if (button.dataset.tabAction === "duplicate") await window.neoBrowser.duplicateTab(target.id);
  if (button.dataset.tabAction === "pin") await window.neoBrowser.togglePinTab(target.id);
});
document.addEventListener("click", (event) => { if (!tabContextMenu.contains(event.target)) tabContextMenu.classList.add("hidden"); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") tabContextMenu.classList.add("hidden"); });
window.addEventListener("blur", () => tabContextMenu.classList.add("hidden"));

function updateViewportBounds() {
  const rect = viewport.getBoundingClientRect();
  window.neoBrowser.setBounds({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
}

document.getElementById("addressForm").addEventListener("submit", (event) => {
  event.preventDefault();
  window.neoBrowser.navigate(addressInput.value);
  addressInput.blur();
});
document.getElementById("go").addEventListener("click", () => window.neoBrowser.navigate(addressInput.value));
document.getElementById("newTab").addEventListener("click", () => { const opensNeoFind = localStorage.getItem("neofind.newTabOpensNeoFind") === "true"; window.neoBrowser.createTab(opensNeoFind ? "https://neofind.pl/" : "about:home"); });
let lastTabsState = null;
document.getElementById("back").addEventListener("click", () => window.neoBrowser.back());
document.getElementById("forward").addEventListener("click", () => window.neoBrowser.forward());
document.getElementById("reload").addEventListener("click", () => window.neoBrowser.reload());
document.getElementById("home").addEventListener("click", () => window.neoBrowser.home());
document.getElementById("brandHome").addEventListener("click", () => window.neoBrowser.home());

window.neoBrowser.onTabsState((state)=>{
  lastTabsState = state;
  renderTabs(state);
  const history=getBrowserHistory(), known=new Set(history.map(item=>item.url));
  if (!isHistorySavingDisabled()) {
    (state.tabs||[]).forEach(tab=>{if(!tab.isPrivate&&tab.url&&/^https?:/i.test(tab.url)&&!known.has(tab.url)){history.unshift({url:tab.url,title:tab.title||tab.url,visitedAt:Date.now()});known.add(tab.url);}});
    if(history.length)localStorage.setItem(browserHistoryKey,JSON.stringify(history.slice(0,1000)));
  }
});
window.addEventListener("resize", updateViewportBounds);
requestAnimationFrame(updateViewportBounds);
setTimeout(updateViewportBounds, 250);


const settingsPanel = document.getElementById("settingsPanel");
const importStatus = document.getElementById("importStatus");
const bookmarkStoreKey = "neofind.importedBookmarks";
const historyStoreKey = "neofind.importedHistory";
const browserThemeKey = "neofind.browserTheme";
const themeSelect = document.getElementById("browserTheme");
function applyBrowserTheme(theme) {
  const allowed = ["midnight","ocean","purple","light","aurora","nord","lavender","rose","sunset","ember","forest","sakura","paper","cyber","space","matrix"];
  const value = allowed.includes(theme) ? theme : "midnight";
  document.body.dataset.theme = value;
  themeSelect.value = value;
  try { localStorage.setItem(browserThemeKey, value); } catch {}
}
applyBrowserTheme(localStorage.getItem(browserThemeKey) || "midnight");
themeSelect.addEventListener("change", () => applyBrowserTheme(themeSelect.value));

function setSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((button) => button.classList.toggle("selected", button.dataset.settingsTab === tab));
  document.getElementById("settingsGeneral").classList.toggle("hidden", tab !== "general");
  document.getElementById("settingsImport").classList.toggle("hidden", tab !== "import");
  document.getElementById("settingsIntegrations").classList.toggle("hidden", tab !== "integrations");
  document.getElementById("settingsHistory").classList.toggle("hidden", tab !== "history");
  document.getElementById("settingsPrivacy").classList.toggle("hidden", tab !== "privacy");
}


const browserHistoryKey = "neofind.browserHistory";
const disableHistorySavingKey = "neofind.disableHistorySaving";
function isHistorySavingDisabled() { return localStorage.getItem(disableHistorySavingKey) === "true"; }
function getBrowserHistory() { try { const value=JSON.parse(localStorage.getItem(browserHistoryKey)||"[]"); return Array.isArray(value)?value:[]; } catch { return []; } }
function renderBrowserHistory() {
  const host=document.getElementById("browserHistoryList"); if(!host)return; host.replaceChildren();
  const items=getBrowserHistory();
  if(!items.length){host.textContent="No browsing history yet.";return;}
  items.slice(0,300).forEach(entry=>{
    const link=document.createElement("a"); link.href=entry.url; link.textContent=entry.title||entry.url; link.title=entry.url;
    link.addEventListener("click",event=>{event.preventDefault();window.neoBrowser.createTab(entry.url);closeSettingsPanel();}); host.append(link);
  });
}
document.getElementById("clearBrowserHistory").addEventListener("click",()=>{localStorage.removeItem(browserHistoryKey);localStorage.removeItem(historyStoreKey);renderBrowserHistory();});
const disableHistorySavingToggle = document.getElementById("disableHistorySaving");
disableHistorySavingToggle.checked = isHistorySavingDisabled();
disableHistorySavingToggle.addEventListener("change", () => {
  localStorage.setItem(disableHistorySavingKey, disableHistorySavingToggle.checked ? "true" : "false");
  if (disableHistorySavingToggle.checked) { localStorage.removeItem(browserHistoryKey); renderBrowserHistory(); }
  document.getElementById("privacyStatus").textContent = disableHistorySavingToggle.checked
    ? "Browsing history saving is off. Existing local browsing history was cleared."
    : "Browsing history saving is on for regular tabs.";
});
document.getElementById("openIncognito").addEventListener("click", () => {
  window.neoBrowser.createTab("about:home", { private: true });
  document.getElementById("privacyStatus").textContent = "An incognito tab was opened. Close that tab when finished to clear its temporary site data.";
  closeSettingsPanel();
});
document.getElementById("clearBrowserData").addEventListener("click", async () => {
  const status = document.getElementById("privacyStatus"); status.textContent = "Clearing website storage and cache…";
  try { const result = await window.neoBrowser.clearBrowserData(); if (result.ok) { localStorage.removeItem(browserHistoryKey); localStorage.removeItem(historyStoreKey); status.textContent = "Cookies, cache, website storage and local browsing history cleared."; renderBrowserHistory(); } else status.textContent = "Could not clear all data: " + (result.message || "unknown error"); }
  catch (error) { status.textContent = "Could not clear browsing data: " + String(error.message || error); }
});

const sidebarApps = {
  spotify: {label:"Spotify",icon:"♫",url:"https://open.spotify.com/"},
  x: {label:"X",icon:"𝕏",url:"https://x.com/"},
  discord: {label:"Discord",icon:"◉",url:"https://discord.com/app"},
  cyrber: {label:"Cyrber",icon:"C",url:"https://cyrber.com/"},
  github: {label:"GitHub",icon:"⌘",url:"https://github.com/"}
};
const sidebarAppsKey = "neofind.sidebarApps";
function getEnabledSidebarApps() {
  try { const value=JSON.parse(localStorage.getItem(sidebarAppsKey)||"null"); if(value&&typeof value==="object") return value; } catch {}
  return {spotify:true,x:true,discord:true,cyrber:true,github:true};
}
function renderSidebarApps() {
  const host=document.getElementById("sidebarLinks"), enabled=getEnabledSidebarApps();
  host.replaceChildren();
  Object.entries(sidebarApps).forEach(([key,app])=>{
    if(!enabled[key]) return;
    const button=document.createElement("button"); button.type="button"; button.className="side-icon";
    button.title=app.label; button.setAttribute("aria-label","Open "+app.label);
    const icon=document.createElement("span"); icon.textContent=app.icon; button.append(icon);
    button.addEventListener("click",()=>window.neoBrowser.createTab(app.url)); host.append(button);
  });
}
document.querySelectorAll("[data-sidebar-app]").forEach(input=>{
  input.checked=!!getEnabledSidebarApps()[input.dataset.sidebarApp];
  input.addEventListener("change",()=>{
    const enabled=getEnabledSidebarApps(); enabled[input.dataset.sidebarApp]=input.checked;
    localStorage.setItem(sidebarAppsKey,JSON.stringify(enabled)); renderSidebarApps();
const newTabDestination = document.getElementById("newTabDestination");
if (newTabDestination) {
  newTabDestination.value = localStorage.getItem("neofind.newTabOpensNeoFind") === "true" ? "neofind" : "blank";
  newTabDestination.addEventListener("change", () => localStorage.setItem("neofind.newTabOpensNeoFind", newTabDestination.value === "neofind" ? "true" : "false"));
}
  });
});
renderSidebarApps();
document.getElementById("sideNeoAI").addEventListener("click",()=>window.neoBrowser.openNeoAI());
document.getElementById("sideHistory").addEventListener("click",()=>{ renderBrowserHistory(); window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); setSettingsTab("history"); });
document.getElementById("sideAccount").addEventListener("click",()=>window.neoBrowser.createTab("https://neofind.pl/?p=profile"));

function setImportPreset(preset) {
  document.getElementById("importEverything").classList.toggle("selected", preset === "everything");
  document.getElementById("importNoCookies").classList.toggle("selected", preset === "no-cookies");
  document.querySelectorAll('input[name="importData"]').forEach((input) => {
    input.checked = preset === "everything" || (preset === "no-cookies" && input.value !== "cookies");
  });
  importStatus.textContent = preset === "everything"
    ? "All categories selected, including cookies. Selected data will be imported only where supported."
    : "All categories except cookies selected. Selected data will be imported only where supported.";
}
document.getElementById("sideSettings").addEventListener("click", () => { window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); setSettingsTab("general"); });
function closeSettingsPanel() { settingsPanel.classList.add("hidden"); window.neoBrowser.showContent(); }
document.getElementById("closeSettings").addEventListener("click", closeSettingsPanel);
settingsPanel.addEventListener("click", (event) => { if (event.target === settingsPanel) closeSettingsPanel(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !settingsPanel.classList.contains("hidden")) { closeSettingsPanel(); return; }
  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    const typing = event.target && (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName));
    if (!typing && key === "arrowleft") { event.preventDefault(); window.neoBrowser.back(); return; }
    if (!typing && key === "arrowright") { event.preventDefault(); window.neoBrowser.forward(); return; }
  }
  if (event.ctrlKey || event.metaKey) {
    if (key === "u") { event.preventDefault(); window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); setSettingsTab("general"); return; }
    if (key === "c") { event.preventDefault(); addressInput.focus(); addressInput.select(); return; }
    if (key === "r") { event.preventDefault(); window.neoBrowser.reload(); return; }
    if (key === "f5") { event.preventDefault(); window.neoBrowser.reloadIgnoringCache(); return; }
    if (key === "x") { event.preventDefault(); window.neoBrowser.closeActiveTab(); return; }
  }
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === "t" && !event.shiftKey) { event.preventDefault(); document.getElementById("newTab").click(); }
  else if (key === "w") { event.preventDefault(); window.neoBrowser.closeActiveTab(); }
  else if (key === "l") { event.preventDefault(); addressInput.focus(); addressInput.select(); }
  else if (key === "d") { event.preventDefault(); const active = lastTabsState && lastTabsState.tabs.find(tab => tab.id === lastTabsState.activeTabId); if (active) window.neoBrowser.duplicateTab(active.id); }
});
window.neoBrowser.onFocusAddress(() => { addressInput.focus(); addressInput.select(); });
document.querySelectorAll(".settings-tab").forEach((button) => button.addEventListener("click", () => { setSettingsTab(button.dataset.settingsTab); if (button.dataset.settingsTab === "history") renderBrowserHistory(); }));
document.getElementById("importEverything").addEventListener("click", () => setImportPreset("everything"));
document.getElementById("importNoCookies").addEventListener("click", () => setImportPreset("no-cookies"));
document.querySelectorAll('input[name="importData"]').forEach((input) => input.addEventListener("change", () => {
  document.getElementById("importEverything").classList.remove("selected");
  document.getElementById("importNoCookies").classList.remove("selected");
  importStatus.textContent = "Custom selection updated. Only supported data types will be imported.";
}));
document.getElementById("setDefaultBrowser").addEventListener("click", async () => {
  const status = document.getElementById("defaultBrowserStatus");
  status.textContent = "Opening Windows Default apps settings…";
  try {
    const result = await window.neoBrowser.openDefaultApps();
    status.textContent = result && result.ok
      ? "Windows Settings opened. Find NeoFind Browser and select it as the default for HTTP and HTTPS."
      : "Could not open Windows Settings. Open Settings → Apps → Default apps and search for NeoFind Browser.";
  } catch {
    status.textContent = "Open Windows Settings → Apps → Default apps and search for NeoFind Browser.";
  }
});
function getImportedBookmarks() {
  try { const value = JSON.parse(localStorage.getItem(bookmarkStoreKey) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function renderImportedBookmarks() {
  const container = document.getElementById("importedBookmarksList");
  const bookmarks = getImportedBookmarks();
  container.replaceChildren(); container.classList.remove("hidden");
  if (!bookmarks.length) { container.textContent = "No imported bookmarks yet."; return; }
  const heading = document.createElement("h3"); heading.textContent = "Imported bookmarks (" + bookmarks.length + ")"; container.append(heading);
  bookmarks.slice(0, 300).forEach((bookmark) => {
    const link = document.createElement("a"); link.href = bookmark.url; link.textContent = bookmark.title || bookmark.url; link.title = bookmark.url;
    link.addEventListener("click", (event) => { event.preventDefault(); window.neoBrowser.navigate(bookmark.url); closeSettingsPanel(); });
    container.append(link);
  });
}
document.getElementById("chooseBookmarksFile").addEventListener("click", async () => {
  try {
    const result = await window.neoBrowser.chooseBookmarksFile();
    if (result.canceled) return;
    const doc = new DOMParser().parseFromString(result.content, "text/html");
    const imported = [];
    doc.querySelectorAll("a[href]").forEach((anchor) => {
      let url; try { url = new URL(anchor.getAttribute("href")); } catch { return; }
      if (!["http:", "https:"].includes(url.protocol)) return;
      imported.push({ title: (anchor.textContent || url.href).trim().slice(0, 300), url: url.href });
    });
    if (!imported.length) { importStatus.textContent = "No valid bookmarks found. Export bookmarks as HTML from your source browser and try again."; return; }
    const merged = new Map(getImportedBookmarks().map((bookmark) => [bookmark.url, bookmark]));
    imported.forEach((bookmark) => merged.set(bookmark.url, bookmark));
    localStorage.setItem(bookmarkStoreKey, JSON.stringify(Array.from(merged.values())));
    importStatus.textContent = "Imported " + imported.length + " bookmarks from " + document.getElementById("sourceBrowser").value + ". Total saved: " + merged.size + ".";
    renderImportedBookmarks();
  } catch (error) { importStatus.textContent = "Could not import bookmarks: " + String(error.message || error); }
});
document.getElementById("showImportedBookmarks").addEventListener("click", renderImportedBookmarks);
document.getElementById("chooseOperaProfile").addEventListener("click", async () => {
  const sourceBrowser = document.getElementById("sourceBrowser").value;
  try {
    const picked = await window.neoBrowser.chooseSourceProfile(sourceBrowser);
    if (picked.canceled) return;
    const selected = {};
    document.querySelectorAll('input[name="importData"]').forEach((input) => { selected[input.value] = input.checked; });
    importStatus.textContent = "Reading " + sourceBrowser + " profile…";
    const result = await window.neoBrowser.importSourceProfile(sourceBrowser, picked.profilePath, selected);
    if (selected.bookmarks && result.bookmarks.length) {
      const merged = new Map(getImportedBookmarks().map((bookmark) => [bookmark.url, bookmark]));
      result.bookmarks.forEach((bookmark) => merged.set(bookmark.url, bookmark));
      localStorage.setItem(bookmarkStoreKey, JSON.stringify(Array.from(merged.values())));
    }
    if (selected.history && result.history.length) {
      let existing = [];
      try { existing = JSON.parse(localStorage.getItem(historyStoreKey) || "[]"); } catch {}
      const merged = new Map(existing.map((item) => [item.url, item]));
      result.history.forEach((item) => merged.set(item.url, item));
      localStorage.setItem(historyStoreKey, JSON.stringify(Array.from(merged.values()).slice(0, 20000)));
    }
    const summary = [];
    if (selected.bookmarks) summary.push("bookmarks: " + result.bookmarks.length);
    if (selected.history) summary.push("history: " + result.history.length);
    if (selected.settings && result.settingsFound) summary.push("settings detected, not applied");
    if (selected.extensions && result.extensionsFound) summary.push("extensions found: " + result.extensionsFound + " (not installed)");
    if (selected.cookies && result.cookiesFound) summary.push("cookies detected but not copied");
    importStatus.textContent = sourceBrowser + " import finished. " + summary.join(" · ") + (result.notes.length ? " | " + result.notes.join(" ") : "");
    renderImportedBookmarks();
    renderImportedHistory();
  } catch (error) { importStatus.textContent = sourceBrowser + " import failed: " + String(error.message || error); }
});
function renderImportedHistory() {
  const container = document.getElementById("importedHistoryList");
  if (!container) return;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(historyStoreKey) || "[]"); } catch {}
  container.replaceChildren();
  container.classList.remove("hidden");
  const heading = document.createElement("h3");
  heading.textContent = "Imported browsing history (" + history.length + ")";
  container.append(heading);
  if (!history.length) { container.append(document.createTextNode("No imported history yet.")); return; }
  history.slice(0, 100).forEach((entry) => {
    const link = document.createElement("a");
    link.href = entry.url;
    link.textContent = entry.title || entry.url;
    link.title = entry.url;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.neoBrowser.navigate(entry.url);
      closeSettingsPanel();
    });
    container.append(link);
  });
}

setImportPreset("no-cookies");


const updateStatusElement = document.getElementById("updateStatus");
const checkUpdatesButton = document.getElementById("checkUpdatesButton");
window.neoBrowser.getVersion().then((version) => { document.getElementById("appVersion").textContent = "Installed version: " + version; }).catch(() => {});
window.neoBrowser.onUpdaterState((state) => {
  updateStatusElement.textContent = state.message || "Update status changed.";
  if (state.status === "current" && state.version) updateStatusElement.textContent = "Version " + state.version + " is already installed.";
  checkUpdatesButton.disabled = ["checking", "downloading"].includes(state.status);
  checkUpdatesButton.textContent = state.status === "downloading" ? "Downloading..." : state.status === "checking" ? "Checking..." : "Check for updates";
});
checkUpdatesButton.addEventListener("click", async () => {
  checkUpdatesButton.disabled = true;
  updateStatusElement.textContent = "Checking GitHub Releases...";
  try {
    const result = await window.neoBrowser.checkForUpdates();
    if (result && result.message && result.status !== "checking") updateStatusElement.textContent = result.message;
  } catch (error) { updateStatusElement.textContent = "Could not check for updates: " + String(error.message || error); }
  finally { checkUpdatesButton.disabled = false; }
});
