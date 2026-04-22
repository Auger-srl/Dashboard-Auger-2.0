import React, { useState, useEffect, useRef } from 'react';
import { Article, Client } from '../types';
import { 
  fetchClients, 
  addCommitmentBatch,
  addMacchina5000,
  addMovimentoCGialla,
  addFaseVerniciatura,
  addFaseSaldatura,
  addFasePannelatrice,
  addFaseTaglio,
  fetchProcesses
} from '../api';
import { Process } from '../types';
import toast from 'react-hot-toast';
import { Play, Scissors, Flame, CornerDownRight, PaintBucket, X, Search } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  articles?: Article[];
}

export default function SchedaVerniciaturaView({ articles = [] }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  useEffect(() => {
    fetchClients().then(data => {
      if (Array.isArray(data)) setClients(data);
    }).catch(console.error);
    fetchProcesses().then(data => {
      if (Array.isArray(data)) setProcesses(data);
    }).catch(console.error);
  }, []);

  const [headerData, setHeaderData] = useState({
    commessa: '',
    cliente: '',
    dataConsegna: '',
    destinazione: '',
    noteSV: '',
    quantitaGen: '',
    tipoImballo: '',
    ordineCliente: '',
    tipoComposizione: '',
    composizioneDettaglio: ''
  });

  const [table1Rows, setTable1Rows] = useState(Array(12).fill(null).map(() => ({
    parte: '', cod: '', nr: '', desc: '', note: '', ral: '', spc: ''
  })));

  const [table2Rows, setTable2Rows] = useState(Array(4).fill(null).map(() => ({
    parte: '', cod: '', nr: '', desc: '', note: '', ral: '', spc: ''
  })));

  const sheetRef = useRef<HTMLDivElement>(null);

  const handleHeaderChange = (field: keyof typeof headerData, value: string) => {
    setHeaderData({ ...headerData, [field]: value });
  };

  const handleRowChange = (table: 1 | 2, index: number, field: string, value: string) => {
    const setRows = table === 1 ? setTable1Rows : setTable2Rows;
    const currentRows = table === 1 ? table1Rows : table2Rows;
    
    const newRows = [...currentRows];
    (newRows[index] as any)[field] = value;
    
    if (field === 'note') {
      const noteLower = value.toLowerCase();
      const spcPhrases = [
        'ripreso a laser', 
        'spc', 
        'speciale', 
        'ripreso', 
        'forata', 
        'aerazione completa', 
        'aerazione lati esterni',
        'macchina 5000',
        'taglio laser'
      ];
      
      const shouldMarkSPC = spcPhrases.some(phrase => noteLower.includes(phrase));
      if (shouldMarkSPC) {
        newRows[index].spc = 'X';
      } else {
        newRows[index].spc = '';
      }
    }
    
    if (field === 'cod') {
      const foundArticle = articles.find(a => a.codice === value);
      if (foundArticle) {
        newRows[index].desc = foundArticle.nome;
        
        // Determina la "Parte" in base al nome o al codice
        const nomeUpper = foundArticle.nome.toUpperCase();
        const codUpper = foundArticle.codice.toUpperCase();
        
        // Logica per inserimento automatico "Parte"
        if (nomeUpper.includes('RETRO') || codUpper.startsWith('AG-RE')) {
          newRows[index].parte = 'RETRO';
        } else if (nomeUpper.includes('PIASTRA') || codUpper.includes('PI') || (codUpper.includes('PA') && codUpper.endsWith('F'))) {
          newRows[index].parte = 'PIASTRA';
        } else if (nomeUpper.includes('LATERALE') || (codUpper.startsWith('AGR') && codUpper.endsWith('L'))) {
          newRows[index].parte = 'LATERALE';
        } else if (nomeUpper.includes('STRUTTURA') || codUpper.includes('STB') || codUpper.includes('STT') || codUpper.startsWith('ST-')) {
          newRows[index].parte = 'STRUTTURA';
        } else if (nomeUpper.includes('PORTA') || codUpper.includes('PO')) {
          newRows[index].parte = 'PORTA';
        } else if (nomeUpper.includes('PARETE') || codUpper.includes('PA')) {
          newRows[index].parte = 'PARETE';
        } else if (nomeUpper.includes('TETTO') || codUpper.includes('TE')) {
          newRows[index].parte = 'TETTO';
        } else if (nomeUpper.includes('FIANCO') || codUpper.includes('FI')) {
          newRows[index].parte = 'FIANCO';
        } else if (nomeUpper.includes('BASE') || codUpper.includes('BA')) {
          newRows[index].parte = 'BASE';
        } else if (nomeUpper.includes('ZOCCOLO') || codUpper.includes('ZO')) {
          newRows[index].parte = 'ZOCCOLO';
        } else if (nomeUpper.includes('STRUTTURA') || codUpper.includes('ST')) {
          newRows[index].parte = 'STRUTTURA';
        } else if (nomeUpper.includes('COPERTURA') || codUpper.includes('CP')) {
          newRows[index].parte = 'COPERTURA';
        }
      }
    }
    
    setRows(newRows);
  };

  const addRow = (table: 1 | 2) => {
    const setRows = table === 1 ? setTable1Rows : setTable2Rows;
    const currentRows = table === 1 ? table1Rows : table2Rows;
    setRows([...currentRows, { parte: '', cod: '', nr: '', desc: '', note: '', ral: '', spc: '' }]);
  };

  const handlePrint = () => {
    const scheda = sheetRef.current;
    if (!scheda) return toast.error('Scheda non trovata');

    const win = window.open('', '_blank', 'width=1400,height=900');
    if (!win) return toast.error('Impossibile aprire la finestra di stampa. Controlla il blocco popup.');

    // Creiamo una versione pulita degli input per la stampa (sostituiamo gli input con il loro valore testuale)
    const clone = scheda.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll('input');
    inputs.forEach(input => {
      const span = document.createElement('span');
      span.textContent = input.value;
      
      // Assicuriamo una corretta visualizzazione e centratura nel titolo
      if (input.parentElement?.classList.contains('job-title-sv')) {
        span.style.width = 'auto';
        span.style.paddingLeft = '10px';
      } else {
        span.style.display = 'inline-block';
        span.style.width = '100%';
      }
      
      span.style.textAlign = input.style.textAlign || 'inherit';
      span.style.fontWeight = input.style.fontWeight || 'inherit';
      span.style.fontSize = input.style.fontSize || 'inherit';
      input.parentNode?.replaceChild(span, input);
    });

    win.document.write(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Scheda Verniciatura - Auger</title>
        <style>
          @page { size: A4 landscape; margin: 7mm 7mm 7mm 4mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
          body { background: #fff; padding: 10px 10px 10px 5px; }
          .sheet-sv { width: 100%; border: 0; background: #fff; }
          .toolbar-sv, .no-print-sv, .print-note-sv { display: none !important; }
          
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1.5px solid #000; padding: 5px 6px; font-size: 13px; vertical-align: middle; min-height: 28px; }
          
          .job-title-sv {
            text-align: center;
            font-size: 22px;
            font-weight: 800;
            border: 2.5px solid #000;
            padding: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            width: 100%;
          }
          
          .meta-grid-sv {
            display: grid;
            grid-template-columns: 105px 1fr 120px 190px 120px 1fr;
            border: 2.5px solid #000;
            border-bottom: 0;
          }
          
          .meta-label-sv, .meta-value-sv {
            min-height: 38px;
            display: flex;
            align-items: center;
            padding: 6px 10px;
            border-right: 1.5px solid #000;
            border-bottom: 1.5px solid #000;
            font-size: 13px;
          }
          .meta-label-sv { font-weight: 800; background: #f3f4f6; }
          .meta-value-sv { font-weight: 800; background: #fff; }
          .wide-note-sv { grid-column: 2 / 7; }
          
          .pack-type-sv {
            background: #f4b400 !important;
            justify-content: center;
            font-style: italic;
            font-size: 18px;
            text-transform: uppercase;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .composition-sv {
            grid-column: 3 / 7;
            justify-content: center;
            text-align: center;
            font-size: 14px;
            font-weight: 800;
          }
          
          .footer-row-sv {
            margin-top: 12px;
            display: flex;
            justify-content: flex-end;
            border: 2.5px solid #000;
            width: fit-content;
            margin-left: auto;
          }
          
          .footer-item-sv { width: 210px; border-right: 1.5px solid #000; }
          .footer-item-sv:last-child { width: 140px; border-right: 0; }
          .footer-label-sv {
            background: #f3f4f6;
            font-size: 12px;
            font-weight: 800;
            padding: 6px 10px;
            border-bottom: 1.5px solid #000;
            text-transform: uppercase;
          }
          .footer-content-sv {
            height: 65px;
            padding: 8px 10px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          }
          .sign-line-sv {
            width: 100%;
            border-top: 1.5px solid #000;
            min-height: 2px;
          }
          .date-placeholder-sv {
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 2px;
          }

          .sv-edit-table thead th { background: #f3f4f6; -webkit-print-color-adjust: exact; }
          .ral-sv { color: #ff0000 !important; font-weight: 800; -webkit-print-color-adjust: exact; }
          
          /* Garantiamo lo sfondo arancione anche in stampa sui browser Chromium/Safari/Firefox */
          .spc-sv { text-align: center; font-weight: 800; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          :root { --accent: #f4b400; }
          
          .text-center { text-align: center; }
          
          /* Evitiamo problemi con il rendering degli input clonati */
          span { display: inline-block; width: 100%; }
        </style>
      </head>
      <body>
        <div class="sheet-sv">
          ${clone.innerHTML}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const handleCreateImpegno = async () => {
    if (!headerData.cliente) return toast.error('Seleziona un cliente');
    if (!headerData.commessa) return toast.error('Inserisci il numero di commessa');

    const standardRALs = ['7035 BUCCIATO', '7035 BUCC.', '7035B'];
    const isStandardRAL = (ral: string) => {
      const r = (ral || '').toUpperCase().trim();
      return standardRALs.includes(r);
    };

    const spcPhrases = [
      'ripreso a laser', 
      'spc', 
      'speciale', 
      'ripreso', 
      'forata', 
      'aerazione completa', 
      'aerazione lati esterni'
    ];

    const allItems: any[] = [];
    const collectItems = (rows: any[]) => {
      rows.forEach(row => {
        if (!row.cod || !row.nr) return;
        const qty = parseInt(row.nr, 10);
        if (isNaN(qty) || qty <= 0) return;
        allItems.push({
          codice_articolo: row.cod,
          descrizione: row.desc,
          quantita: qty,
          parte: row.parte,
          ral: (row.ral || '').trim().toUpperCase(),
          note: (row.note || '').trim()
        });
      });
    };
    collectItems(table1Rows);
    collectItems(table2Rows);

    if (allItems.length === 0) {
      return toast.error('Nessun articolo valido da impegnare');
    }

    // Determine correctness of articles
    for (const item of allItems) {
      if (!item.codice_articolo.toUpperCase().endsWith('-PVR') && !item.codice_articolo.toUpperCase().endsWith('-SPC')) {
        const art = articles.find(a => a.codice.toUpperCase() === item.codice_articolo.toUpperCase());
        if (!art) {
          return toast.error(`Tipo articolo non definito o errato: ${item.codice_articolo}`);
        }
      }
    }

    try {
      toast.loading('Creazione impegni in corso...', { id: 'impegno' });
      
      const isBatchStandard = allItems.every(item => {
        const noteLower = item.note.toLowerCase();
        const isSPC = spcPhrases.some(phrase => noteLower.includes(phrase));
        const isMacchina5000 = noteLower.includes('macchina 5000') || noteLower.includes('taglio laser');
        return !isSPC && !isMacchina5000 && isStandardRAL(item.ral);
      });

      console.log(`--- DEBUG FLUSSO CREAZIONE ---`);
      console.log(`Lotto è Tutto Standard? ${isBatchStandard}`);

      const commitmentsToAdd: any[] = [];

      for (const item of allItems) {
        const noteLower = item.note.toLowerCase();
        const isSPC = spcPhrases.some(phrase => noteLower.includes(phrase));
        const isMacchina5000 = noteLower.includes('macchina 5000') || noteLower.includes('taglio laser');
        const articoloFull = item.codice_articolo + (item.descrizione ? ` - ${item.descrizione}` : '');
        
        let impegnoFase = 'Verniciatura';
        let repartoIniziale = '';
        let tracciamento = '';
        let fasiReq = '';

        if (isBatchStandard) {
          // CASO STANDARD
          impegnoFase = 'Verniciatura';
          repartoIniziale = 'Verniciatura';
          tracciamento = 'Movimenti';
          fasiReq = 'Verniciatura';

          await addFaseVerniciatura({
            data: new Date().toLocaleDateString('it-IT'),
            articolo: articoloFull,
            quantita: item.quantita,
            odl: headerData.ordineCliente || '',
            cliente: headerData.cliente.trim().toUpperCase(),
            commessa: headerData.commessa.trim().toUpperCase(),
            note: item.note,
            stato: 'da lavorare'
          });

        } else if (isMacchina5000) {
          // ARTICOLO MACCHINA 5000 / TAGLIO LASER
          impegnoFase = 'Taglio';
          repartoIniziale = 'Taglio (RidaTecnico)';
          tracciamento = 'Storico C.G.';
          fasiReq = 'Taglio -> M5000/Laser -> Pannellatrice'; // (e Verniciatura gestito dal domino se serve)

          await addFaseTaglio({
            lavorazione_per: headerData.cliente.trim().toUpperCase(),
            articolo: articoloFull,
            quantita: item.quantita,
            data: new Date().toLocaleDateString('it-IT'),
            fatto: 0,
            stampato: 0,
            odl: headerData.ordineCliente || '',
            commessa: headerData.commessa.trim().toUpperCase(),
            macchina: noteLower.includes('macchina 5000') ? 'Macchina 5000' : 'Taglio Laser',
            note: item.note
          });

          await addMovimentoCGialla({
            articolo_spc: articoloFull,
            fase: noteLower.includes('macchina 5000') ? 'INIZIO (Macchina 5000)' : 'INIZIO (Taglio Laser)',
            quantita: item.quantita,
            cliente: headerData.cliente.trim().toUpperCase(),
            commessa: headerData.commessa.trim().toUpperCase(),
            operatore: 'Auto SV',
            tempo_min: 0,
            data_reg: new Date().toISOString()
          });

        } else if (isSPC) {
          // ARTICOLO FORATO / SPC
          impegnoFase = 'Grezzo'; // Usually corresponds to Piegatura in real terms, but label Grezzo
          repartoIniziale = 'Pannellatrice';
          tracciamento = 'Storico C.G.';
          fasiReq = 'Pannellatrice'; // NON passa da verniciatura in questa fase

          await addFasePannelatrice({
            data: new Date().toLocaleDateString('it-IT'),
            articolo: articoloFull,
            quantita: item.quantita,
            odl: headerData.ordineCliente || '',
            cliente: headerData.cliente.trim().toUpperCase(),
            commessa: headerData.commessa.trim().toUpperCase(),
            note: item.note,
            stato: 'da lavorare'
          });

          await addMovimentoCGialla({
            articolo_spc: articoloFull,
            fase: 'INIZIO (Pannellatrice)',
            quantita: item.quantita,
            cliente: headerData.cliente.trim().toUpperCase(),
            commessa: headerData.commessa.trim().toUpperCase(),
            operatore: 'Auto SV',
            tempo_min: 0,
            data_reg: new Date().toISOString()
          });

        } else {
          // ARTICOLO STANDARD (ma in un lotto non standard) -> va a Verniciatura
          impegnoFase = 'Verniciatura';
          repartoIniziale = 'Verniciatura';
          tracciamento = 'Movimenti';
          fasiReq = 'Verniciatura';

          await addFaseVerniciatura({
            data: new Date().toLocaleDateString('it-IT'),
            articolo: articoloFull,
            quantita: item.quantita,
            odl: headerData.ordineCliente || '',
            cliente: headerData.cliente.trim().toUpperCase(),
            commessa: headerData.commessa.trim().toUpperCase(),
            note: item.note,
            stato: 'da lavorare'
          });
        }

        console.log(`Articolo: ${item.codice_articolo} | Impegno: ${impegnoFase} | Reparto: ${repartoIniziale} | Tracciamento: ${tracciamento} | Fasi: ${fasiReq}`);

        // Prepare commitment entity
        const art = articles.find(a => a.codice.toUpperCase() === item.codice_articolo.toUpperCase());
        commitmentsToAdd.push({
          articolo_id: art ? art.id : undefined,
          codice_articolo: item.codice_articolo,
          articolo_nome: art ? art.nome : `Commessa Speciale: ${item.codice_articolo}`,
          quantita: item.quantita,
          fase_produzione: impegnoFase,
          tracciamento_info: tracciamento
        });
      }

      // We group the commitments by fase_produzione to push them correctly using addCommitmentBatch
      const fasiGroups = commitmentsToAdd.reduce((acc, curr) => {
        if (!acc[curr.fase_produzione]) acc[curr.fase_produzione] = [];
        acc[curr.fase_produzione].push(curr);
        return acc;
      }, {} as Record<string, any[]>);

      for (const fase of Object.keys(fasiGroups)) {
        await addCommitmentBatch({
          items: fasiGroups[fase],
          cliente: headerData.cliente.trim().toUpperCase(),
          commessa: headerData.commessa.trim().toUpperCase(),
          priorita: 0,
          fase_produzione: fase,
          note: headerData.noteSV,
          stato_lavorazione: 'Pianificato',
          operatore: 'Auto SV'
        });
      }

      toast.success('Impegni creati ed elaborati con successo!', { id: 'impegno' });
    } catch (error: any) {
      console.error('Errore creazione impegno:', error);
      toast.error(`Errore: ${error.message}`, { id: 'impegno' });
    }
  };

  return (
    <>
      <style>{`
        :root {
          --text: #111827;
          --muted: #4b5563;
          --line: #1f2937;
          --head: #f3f4f6;
          --accent: #f4b400;
        }

        .page-wrap-sv {
          max-width: 1500px;
          margin: 0 auto;
          font-family: Arial, Helvetica, sans-serif;
          color: var(--text);
        }

        .toolbar-sv {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .title-block-sv h1 {
          margin: 0;
          font-size: 24px;
        }

        .title-block-sv p {
          margin: 6px 0 0;
          font-size: 14px;
          color: var(--muted);
        }

        .actions-sv {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-sv {
          border: 0;
          background: #111827;
          color: #fff;
          padding: 11px 16px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(17, 24, 39, 0.12);
        }

        .btn-sv.secondary {
          background: #fff;
          color: #111827;
          border: 1px solid #cfd6df;
          box-shadow: none;
        }

        .sheet-sv {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #d9e0e8;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .sheet-inner-sv {
          padding: 18px 18px 18px 10px;
        }

        .job-title-sv {
          text-align: center;
          font-size: 23px;
          font-weight: 800;
          border: 2px solid var(--line);
          padding: 10px 12px;
          margin-bottom: 14px;
          letter-spacing: .3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .meta-grid-sv {
          display: grid;
          grid-template-columns: 105px 1fr 120px 190px 120px 1fr;
          border: 2px solid var(--line);
          border-bottom: 0;
          align-items: stretch;
        }

        .meta-label-sv,
        .meta-value-sv {
          min-height: 40px;
          display: flex;
          align-items: center;
          padding: 8px 10px;
          border-right: 1.5px solid var(--line);
          border-bottom: 1.5px solid var(--line);
          font-size: 14px;
        }

        .meta-label-sv {
          font-weight: 700;
          background: var(--head);
        }

        .meta-value-sv {
          font-weight: 700;
          background: #fff;
        }

        .meta-grid-sv > div:nth-child(6),
        .meta-grid-sv > div:nth-child(12),
        .meta-grid-sv > div:nth-child(18),
        .meta-grid-sv > div:nth-child(24) {
          border-right: 0;
        }

        .wide-note-sv {
          grid-column: 2 / 7;
        }

        .pack-type-sv {
          background: var(--accent);
          font-style: italic;
          justify-content: center;
          font-size: 20px;
          text-transform: uppercase;
        }

        .composition-sv {
          grid-column: 3 / 7;
          font-weight: 800;
          justify-content: center;
          text-align: center;
          font-size: 16px;
        }

        .sv-edit-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 2px solid var(--line);
          margin-top: 12px;
        }

        .sv-edit-table th, .sv-edit-table td {
          border-right: 1.5px solid var(--line);
          border-bottom: 1.5px solid var(--line);
          padding: 0;
          font-size: 14px;
          line-height: 1.15;
          vertical-align: middle;
          height: 28px;
        }

        .sv-edit-table th:last-child, .sv-edit-table td:last-child { border-right: 0; }
        .sv-edit-table tbody tr:last-child td { border-bottom: 0; }

        .sv-edit-table thead th {
          background: var(--head);
          font-weight: 800;
          text-transform: uppercase;
          font-style: italic;
          text-align: center;
          padding: 5px 6px;
        }

        .sv-input {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          outline: none;
          padding: 5px 6px;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          display: block;
        }

        .sv-input:focus {
          background: rgba(244, 180, 0, 0.1);
        }

        .part-sv { width: 10%; font-weight: 700; }
        .code-sv { width: 11%; text-align: center; }
        .nr-sv { width: 6.5%; text-align: center; font-weight: 700; }
        .desc-sv { width: 29.5%; }
        .notes-sv { width: 29%; }
        .ral-sv { width: 11%; text-align: center; color: #ff0000 !important; font-weight: 800; }
        .spc-sv { width: 3%; text-align: center; }

        .footer-row-sv {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          border: 2px solid var(--line);
          width: fit-content;
          margin-left: auto;
        }

        .footer-item-sv {
          width: 210px;
          border-right: 1.5px solid var(--line);
        }

        .footer-item-sv:last-child {
          width: 140px;
          border-right: 0;
        }

        .footer-label-sv {
          background: var(--head);
          font-size: 13px;
          font-weight: 800;
          padding: 8px 10px;
          border-bottom: 1.5px solid var(--line);
          text-transform: uppercase;
        }

        .footer-content-sv {
          height: 65px;
          padding: 8px 10px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .sign-line-sv {
          width: 100%;
          border-top: 1.5px solid var(--line);
          min-height: 2px;
        }

        .date-placeholder-sv {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .print-note-sv {
          margin-top: 10px;
          color: var(--muted);
          font-size: 13px;
          text-align: right;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          
          /* Forza la visibilità di tutti i genitori della scheda */
          html, body, #root, div[class*="min-h-screen"], main, div[class*="flex-grow"] {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Nascondi tutto ciò che non è la scheda */
          header, footer, nav, aside, .toolbar-sv, .no-print-sv, .debug-panel, [class*="fixed"], [class*="absolute"]:not(.sheet-sv) {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .page-wrap-sv {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 10mm !important;
          }

          .sheet-sv {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            background: white !important;
          }

          /* Forza i bordi neri per la stampa */
          .job-title-sv, .meta-grid-sv, .sv-edit-table, .footer-row-sv {
            border: 2px solid #000 !important;
          }

          .meta-label-sv, .meta-value-sv, .sv-edit-table th, .sv-edit-table td, 
          .footer-item-sv, .footer-label-sv, .sign-line-sv {
            border-right: 1.5px solid #000 !important;
            border-bottom: 1.5px solid #000 !important;
            color: #000 !important;
          }

          .sv-input {
            border: none !important;
          }
        }
      `}</style>

      <div className="page-wrap-sv">
        <div className="toolbar-sv">
          <div className="title-block-sv">
            <h1>Scheda Verniciatura</h1>
            <p>Layout aggiornato secondo le vostre indicazioni.</p>
          </div>
          <div className="actions-sv">
            <button 
              type="button" 
              className="btn-sv secondary no-print-sv" 
              onClick={handleCreateImpegno}
              style={{ background: '#10b981', color: 'white', borderColor: '#059669' }}
            >
              CREA IMPEGNO
            </button>
            <button 
              type="button" 
              className="btn-sv no-print-sv" 
              onClick={handlePrint}
            >
              Stampa PDF
            </button>
          </div>
        </div>

        <div className="sheet-sv" ref={sheetRef}>
          <div className="sheet-inner-sv">
            <div className="job-title-sv">
              COMMESSA DI LAVORO ARMADIO N:
              <input 
                type="text" 
                className="sv-input" 
                style={{ width: '200px', fontSize: '23px', fontWeight: '800', textAlign: 'center', borderBottom: '2px solid var(--line)' }}
                value={headerData.commessa}
                onChange={(e) => handleHeaderChange('commessa', e.target.value)}
              />
            </div>

            <section className="meta-grid-sv">
              <div className="meta-label-sv">Cliente:</div>
              <div className="meta-value-sv">
                <input 
                  type="text" 
                  list="clienti-list"
                  className="sv-input" 
                  value={headerData.cliente} 
                  onChange={(e) => handleHeaderChange('cliente', e.target.value)} 
                />
              </div>
              <div className="meta-label-sv">Consegna:</div>
              <div className="meta-value-sv">
                <input type="text" className="sv-input" value={headerData.dataConsegna} onChange={(e) => handleHeaderChange('dataConsegna', e.target.value)} />
              </div>
              <div className="meta-label-sv">Destinazione:</div>
              <div className="meta-value-sv">
                <input type="text" className="sv-input" value={headerData.destinazione} onChange={(e) => handleHeaderChange('destinazione', e.target.value)} />
              </div>

              <div className="meta-label-sv">Note:</div>
              <div className="meta-value-sv wide-note-sv">
                <input type="text" className="sv-input" value={headerData.noteSV} onChange={(e) => handleHeaderChange('noteSV', e.target.value)} />
              </div>

              <div className="meta-label-sv">Quantità</div>
              <div className="meta-value-sv" style={{ justifyContent: 'center', fontSize: '28px' }}>
                <input type="text" className="sv-input text-center" value={headerData.quantitaGen} onChange={(e) => handleHeaderChange('quantitaGen', e.target.value)} />
              </div>
              <div className="meta-label-sv">Tipo Imballo:</div>
              <div className="meta-value-sv">
                <input type="text" className="sv-input" value={headerData.tipoImballo} onChange={(e) => handleHeaderChange('tipoImballo', e.target.value)} />
              </div>
              <div className="meta-label-sv">N. Ordine Cliente:</div>
              <div className="meta-value-sv">
                <input type="text" className="sv-input" value={headerData.ordineCliente} onChange={(e) => handleHeaderChange('ordineCliente', e.target.value)} />
              </div>

              <div className="meta-label-sv">Composizione</div>
              <div className="meta-value-sv pack-type-sv">
                <input type="text" className="sv-input text-center" value={headerData.tipoComposizione} onChange={(e) => handleHeaderChange('tipoComposizione', e.target.value)} />
              </div>
              <div className="meta-value-sv composition-sv">
                <input type="text" className="sv-input text-center" value={headerData.composizioneDettaglio} onChange={(e) => handleHeaderChange('composizioneDettaglio', e.target.value)} />
              </div>
            </section>

            <table className="sv-edit-table">
              <thead>
                <tr>
                  <th className="part-sv">Parte</th>
                  <th className="code-sv">Codice</th>
                  <th className="nr-sv">Nr.</th>
                  <th className="desc-sv">Descrizione</th>
                  <th className="notes-sv">Note</th>
                  <th className="ral-sv">RAL</th>
                  <th className="spc-sv">SPC</th>
                </tr>
              </thead>
              <tbody>
                {table1Rows.map((row, index) => (
                  <tr key={`t1-${index}`}>
                    <td className="part-sv"><input type="text" className="sv-input" value={row.parte} onChange={(e) => handleRowChange(1, index, 'parte', e.target.value)} /></td>
                    <td className="code-sv">
                      <input 
                        type="text" 
                        list="articoli-list" 
                        className="sv-input text-center" 
                        value={row.cod} 
                        onChange={(e) => handleRowChange(1, index, 'cod', e.target.value)} 
                      />
                    </td>
                    <td className="nr-sv"><input type="text" className="sv-input text-center" value={row.nr} onChange={(e) => handleRowChange(1, index, 'nr', e.target.value)} /></td>
                    <td className="desc-sv"><input type="text" className="sv-input" value={row.desc} onChange={(e) => handleRowChange(1, index, 'desc', e.target.value)} /></td>
                    <td className="notes-sv"><input type="text" className="sv-input" value={row.note} onChange={(e) => handleRowChange(1, index, 'note', e.target.value)} /></td>
                    <td className="ral-sv"><input type="text" className="sv-input text-center" value={row.ral} onChange={(e) => handleRowChange(1, index, 'ral', e.target.value)} /></td>
                    <td className="spc-sv" style={{ backgroundColor: row.spc.toUpperCase() === 'X' ? 'var(--accent)' : 'transparent' }}>
                      <input type="text" className="sv-input text-center" value={row.spc} onChange={(e) => handleRowChange(1, index, 'spc', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="sv-edit-table">
              <thead>
                <tr>
                  <th className="part-sv">Parte</th>
                  <th className="code-sv">Codice</th>
                  <th className="nr-sv">Nr.</th>
                  <th className="desc-sv">Descrizione</th>
                  <th className="notes-sv">Note</th>
                  <th className="ral-sv">RAL</th>
                  <th className="spc-sv">SPC</th>
                </tr>
              </thead>
              <tbody>
                {table2Rows.map((row, index) => (
                  <tr key={`t2-${index}`}>
                    <td className="part-sv"><input type="text" className="sv-input" value={row.parte} onChange={(e) => handleRowChange(2, index, 'parte', e.target.value)} /></td>
                    <td className="code-sv">
                      <input 
                        type="text" 
                        list="articoli-list" 
                        className="sv-input text-center" 
                        value={row.cod} 
                        onChange={(e) => handleRowChange(2, index, 'cod', e.target.value)} 
                      />
                    </td>
                    <td className="nr-sv"><input type="text" className="sv-input text-center" value={row.nr} onChange={(e) => handleRowChange(2, index, 'nr', e.target.value)} /></td>
                    <td className="desc-sv"><input type="text" className="sv-input" value={row.desc} onChange={(e) => handleRowChange(2, index, 'desc', e.target.value)} /></td>
                    <td className="notes-sv"><input type="text" className="sv-input" value={row.note} onChange={(e) => handleRowChange(2, index, 'note', e.target.value)} /></td>
                    <td className="ral-sv"><input type="text" className="sv-input text-center" value={row.ral} onChange={(e) => handleRowChange(2, index, 'ral', e.target.value)} /></td>
                    <td className="spc-sv" style={{ backgroundColor: row.spc.toUpperCase() === 'X' ? 'var(--accent)' : 'transparent' }}>
                      <input type="text" className="sv-input text-center" value={row.spc} onChange={(e) => handleRowChange(2, index, 'spc', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-2 mt-4 no-print-sv">
              <button className="btn-sv secondary" onClick={() => addRow(1)}>Aggiungi riga tabella 1</button>
              <button className="btn-sv secondary" onClick={() => addRow(2)}>Aggiungi riga tabella 2</button>
            </div>

            <section className="footer-row-sv">
              <div className="footer-item-sv">
                <div className="footer-label-sv">Firma Operatore</div>
                <div className="footer-content-sv">
                  <div className="sign-line-sv"></div>
                </div>
              </div>
              <div className="footer-item-sv">
                <div className="footer-label-sv">Data</div>
                <div className="footer-content-sv">
                  <div className="date-placeholder-sv">___ / ___ / ______</div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="print-note-sv">Premi “Stampa PDF” per l’anteprima A4 orizzontale.</div>
      </div>

      <datalist id="clienti-list">
        {clients.map(c => <option key={c.id} value={c.nome} />)}
      </datalist>

      <datalist id="articoli-list">
        {articles.map(a => <option key={a.id} value={a.codice}>{a.nome}</option>)}
      </datalist>
    </>
  );
}
