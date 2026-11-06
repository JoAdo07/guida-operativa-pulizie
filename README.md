# Guida operativa di pulizia · Global Behring

Sito statico (GitHub Pages) con due strumenti:

- **`index.html` — Guida operativa.** La giornata tipo, i passaggi con audio, le regole e i DPI.
- **`modulo.html` — Modulo comunicazione.** Carica il vocale di WhatsApp: l'AI lo trascrive, estrae i compiti e li mostra sopra le domande giuste. Il dipendente risponde, allega foto e note vocali.

## Come funziona il modulo

1. **Carica il vocale** (MP3, OGG, M4A, WAV — max 10 minuti).
2. **Trascrivi e assegna**: la trascrizione avviene sul dispositivo con Whisper (transformers.js). La prima volta scarica il modello (≈75 MB), poi resta in cache. Nessun audio viene inviato a un server.
3. **Controlla i compiti**: ogni compito è sopra la sezione che gli compete; puoi correggerlo, spostarlo, cancellarlo o aggiungerne uno.
4. **Invia il link al dipendente**: i compiti viaggiano nel frammento `#m=…` dell'URL, senza audio e senza server.
5. **Consegna**: il dipendente scarica il report HTML (leggibile, con foto e trascrizioni) e i dati JSON, da rimandare al referente su WhatsApp o email.

Non c'è niente da compilare: sono file statici.
