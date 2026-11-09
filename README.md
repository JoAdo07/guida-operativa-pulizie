# Guida operativa di pulizia · Global Behring

Strumento unico di comunicazione tra responsabili e dipendenti, su GitHub Pages (file statici).

- **`index.html` — Guida del dipendente.** Il piano di lavoro diviso per giorni (Lunedì, Martedì e giovedì, Mercoledì, Mensile) e la sezione **Regole e DPI** con i **Regolamenti** (prodotti, chiavi, attrezzature) e il glossario.
- **`modulo.html` — Area responsabili.** Accesso con codice di reparto. Si carica il vocale (fino a 30 minuti): l'AI lo trascrive, divide le informazioni per giorni e regolamenti, prepara la guida e genera il link da dare al dipendente.

## Flusso

1. Il responsabile apre `modulo.html`, inserisce il codice e carica il vocale.
2. L'AI trascrive sul dispositivo (Whisper, transformers.js): la prima volta scarica il modello (≈75 MB), poi resta in cache. Nessun audio viene inviato a un server.
3. L'AI assegna le informazioni:
   - **Giro**, **Orari e frequenza**, **Vizi e spazzatura** → schede dei giorni.
   - **Prodotti e materiali**, **Chiavi e accessi**, **Attrezzature** → sezione **Regolamenti** dentro Regole e DPI.
4. Il responsabile controlla il risultato e genera il **link per il dipendente**: il piano viaggia nel frammento `#d=…` dell'URL, senza audio.
5. Il dipendente apre la guida sul telefono, spunta le attività (salvataggio automatico) e usa **Consegna** per scaricare il rapporto HTML e condividerlo su WhatsApp.

## Note

- La trascrizione avviene interamente nel browser: il modello è la prima volta ≈75 MB e la lavorazione richiede circa un minuto per minuto di audio.
- L'accesso all'area responsabili è un codice lato browser: sufficiente per uso interno, non è un'autenticazione server.
- Il piano resta nel browser del dipendente e nel link; non c'è un server che raccoglie i moduli.
- Nessuna build: si modificano i file e si pubblica su `main`.
