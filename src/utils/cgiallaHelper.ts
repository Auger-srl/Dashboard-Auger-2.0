export const updateAvanzamentiCG = (
  articolo: string,
  commessa: string,
  qtCompleted: number,
  fromPhase: 'taglio' | 'piega' | 'saldato' | 'vern' | null,
  toPhase: 'taglio' | 'piega' | 'saldato' | 'vern' | 'impegnati' | 'completato' | 'clear'
) => {
  try {
    const saved = localStorage.getItem('avanzamentiCGData_v2');
    if (!saved) return;
    
    let rows: any[] = JSON.parse(saved);
    let updated = false;

    // Normalizziamo per la ricerca
    const searchArticolo = (articolo || '').toLowerCase().trim();
    // La commessa potrebbe essere nelle note o meno.
    const searchCommessa = (commessa || '').toLowerCase().trim();
    
    rows = rows.map(row => {
      // Per identificare la riga giusta, l'articolo deve combaciare (almeno parzialmente)
      // E idealmente anche la commessa se presente nelle note, dato che mettiamo "(Comm: ...)" nelle note
      const rowArticolo = (row.articolo || '').toLowerCase();
      const rowNote = (row.note || '').toLowerCase();
      
      const matchArticolo = rowArticolo.includes(searchArticolo) || searchArticolo.includes(rowArticolo);
      let matchCommessa = true;
      if (searchCommessa && searchCommessa !== '-') {
        // Se c'è una commessa, verifichiamo che sia menzionata nelle note 
        // (o se la riga non ha note specifiche di commessa, proviamo ad aggiornarla cmq se l'articolo è unico)
        if (rowNote.includes('comm:')) {
          matchCommessa = rowNote.includes(searchCommessa);
        }
      }

      if (matchArticolo && matchCommessa) {
        // Se viene trovata una riga, andiamo a spostare le quantita
        // Sottrai da fromPhase se esiste, se no cerca nelle altre
        if (fromPhase) {
          let remainingToSubtract = qtCompleted;
          
          // Ordine logico inverso per cercare dove sottrarre se la fase indicata è vuota
          const reversePhases = ['vern', 'saldato', 'piega', 'taglio'];
          const startIndex = reversePhases.indexOf(fromPhase);
          
          // Cerca di sottrarre dalla fase specificata o dalle precedenti (in caso di salto operazione software)
          if (startIndex !== -1) {
            for (let i = startIndex; i < reversePhases.length && remainingToSubtract > 0; i++) {
              const phaseToCheck = reversePhases[i] as keyof typeof row;
              const currentVal = parseInt((row[phaseToCheck] as string)) || 0;
              
              if (currentVal > 0) {
                const amountFromHere = Math.min(currentVal, remainingToSubtract);
                row[phaseToCheck] = (currentVal - amountFromHere > 0) ? String(currentVal - amountFromHere) : '';
                remainingToSubtract -= amountFromHere;
              }
            }
          }
        }
        
        // Aggiungi a toPhase se non è clear o completato globale
        if (toPhase !== 'clear' && toPhase !== 'completato') {
          const currentToVal = parseInt(row[toPhase]) || 0;
          row[toPhase] = String(currentToVal + qtCompleted);
        }
        updated = true;
      }
      return row;
    });

    if (updated) {
      localStorage.setItem('avanzamentiCGData_v2', JSON.stringify(rows));
      // Dispatch per aggiornare la view se aperta
      window.dispatchEvent(new Event('avanzamentiCGUpdate'));
    }

  } catch (e) {
    console.error('Errore aggiornamento set da localstorage Avanzamenti CG', e);
  }
};
