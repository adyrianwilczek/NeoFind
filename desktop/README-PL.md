# NeoFind Browser (MVP)

Osobna aplikacja Windows oparta na Electronie i Chromium. Nie zastępuje ani nie modyfikuje głównego index.html NeoFind.

## Wymagania
- Windows 10/11
- Node.js LTS: https://nodejs.org/

## Uruchomienie lokalne
W PowerShell/CMD, w tym katalogu:
1. npm install
2. npm start

## Budowa instalatora
npm run build:win

Plik instalatora powstanie w katalogu dist.

## Co działa w MVP
- Osobne okno aplikacji
- Karty: dodawanie, przełączanie i zamykanie
- Pasek adresu oraz wyszukiwanie wpisanych fraz
- Wstecz, dalej, odśwież, strona startowa
- Strony otwierane w natywnym WebContentsView Chromium, a nie iframe
- Linki otwierające nowe okno kierowane do nowej karty

To prototyp. Przed publiczną dystrybucją należy przetestować logowanie, aktualizacje, politykę prywatności i podpisywanie instalatora.
