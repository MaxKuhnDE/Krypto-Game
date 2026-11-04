# Changelog

Alle nennenswerten Änderungen an KryptoQuest. Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

## [1.1.0] – 2026-11-04

### Hinzugefügt
- **Updates aus der App:** *Einstellungen → Updates* zeigt die installierte Version, sucht auf GitHub nach einer
  neueren und spielt sie mit **„Jetzt aktualisieren“** ein – mit Fortschrittsanzeige, Release-Notizen und
  SHA-256-Prüfung des Downloads. Installer-Fassung: Der neue Installer läuft still im Hintergrund und startet
  KryptoQuest danach neu. Portable Fassung: Die neue EXE ersetzt nach dem Beenden die bisherige Datei.
- Beim Start wird automatisch nach Updates gesucht (abschaltbar); ist eine neue Version da, erscheint ein Hinweis
  und ein Punkt an „Einstellungen“. Nach dem Neustart meldet KryptoQuest, ob das Update eingespielt wurde.
- Tests `tests/updater.test.js` (Versionsvergleich, Prüfsummen, Download) und `tests/e2e.update.js`
  (Ablauf in der App gegen ein nachgestelltes Release).

## [1.0.0] – 2026-11-04

### Hinzugefügt
- Erste Version: 43 Stationen in 13 Abschnitten, 79 Challenges, 131 Quizfragen, Prüfungs-Sprint,
  Zuordnungsspiele und Spickzettel; Darstellung im Stil der RFC-Editor-Dokumente, hell und dunkel.
