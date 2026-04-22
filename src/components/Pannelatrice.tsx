import React, { useState, useEffect } from 'react';
import { TimedProductionItem, Article } from '../types';
import { fetchTimedPhase, addTimedPhase, updateTimedPhase, deleteTimedPhase, addMovementLog, addMovimentoCGialla, addFaseVerniciatura, addFaseSaldatura } from '../api';
import { getCategory, isPhaseEnabled } from '../utils';
import { toast } from 'react-hot-toast';
import { Plus, Save, Trash2, CheckCircle, Clock, Play, Square, Loader2, RefreshCw, Edit2, X } from 'lucide-react';
import clsx from 'clsx';

interface PannelatriceProps {
  apiPath: string;
  title: string;
  machineName: string;
  faseLogName: string;
  faseCGiallaName: string;
  articles: Article[];
  username: string;
  role: string;
  onUpdate: () => void;
  allowedOperators?: string[];
  allowedManagers?: string[];
  filterMachine?: string;
  items?: TimedProductionItem[];
  articleFilter?: (article: Article) => boolean;
}

export default function Pannelatrice({ 
  apiPath, 
  title, 
  machineName, 
  faseLogName,
  faseCGiallaName,
  articles, 
  username, 
  role, 
  onUpdate,
  allowedOperators = ['Andrea', 'TahaDev', 'Osvaldo', 'RidaTecnico'], // Default to common operators
  allowedManagers = ['RidaTecnico', 'fondatore@investortahashh10.com', 'LucaTurati', 'RobertoBonalumi'],
  filterMachine,
  items: propItems,
  articleFilter
}: PannelatriceProps) {
  const [internalItems, setInternalItems] = useState<TimedProductionItem[]>([]);
  const [loading, setLoading] = useState(propItems === undefined);

  // Use prop items if provided, otherwise fallback to internal state
  const rawItems = propItems !== undefined ? propItems : internalItems;
  const items = filterMachine 
    ? rawItems.filter(item => item.macchina === filterMachine)
    : rawItems;
  
  // Confirmation state
  const [confirmingItem, setConfirmingItem] = useState<TimedProductionItem | null>(null);
  const [confirmedQty, setConfirmedQty] = useState<number | ''>('');
  const [tempPrep, setTempPrep] = useState<number>(0);
  const [tempFine, setTempFine] = useState<string>('');
  
  // Form state for managers
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newArticle, setNewArticle] = useState('');
  const [newQuantita, setNewQuantita] = useState<number | ''>('');
  const [newOdl, setNewOdl] = useState('');
  const [newCliente, setNewCliente] = useState('');
  const [newCommessa, setNewCommessa] = useState('');

  const isDeveloper = role === 'developer';
  const canAddProgram = isDeveloper || allowedManagers.includes(username) || (role === 'admin' && username !== 'Andrea' && username !== 'LucaTurati');
  const isOperator = isDeveloper || allowedOperators.includes(username) || role === 'admin';
  const isManager = isDeveloper || allowedManagers.includes(username) || role === 'admin';

  useEffect(() => {
    if (propItems === undefined) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [apiPath, filterMachine, propItems]);

  const loadData = async (silent = false) => {
    if (propItems !== undefined) return;
    try {
      if (!silent) setLoading(true);
      let data = await fetchTimedPhase<TimedProductionItem>(apiPath);
      if (filterMachine) {
        data = data.filter(item => item.macchina === filterMachine);
      }
      setInternalItems(data);
    } catch (error: any) {
      toast.error(`Errore nel caricamento dati ${title}: ` + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle || !newQuantita) return;

    try {
      await addTimedPhase<TimedProductionItem>(apiPath, {
        data: newDate,
        articolo: newArticle,
        quantita: Number(newQuantita),
        preparazione: 0,
        inizio: null,
        inizio2: null,
        pausa: null,
        fine: null,
        totale_tempo: null,
        odl: newOdl || null,
        stato: 'da lavorare',
        operatore: null,
        cliente: newCliente || null,
        commessa: newCommessa || null,
        macchina: machineName
      });
      toast.success('Programma aggiunto con successo');
      setNewArticle('');
      setNewQuantita('');
      setNewOdl('');
      setNewCliente('');
      setNewCommessa('');
      loadData();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo programma?')) return;
    try {
      await deleteTimedPhase(apiPath, id);
      toast.success('Programma eliminato');
      loadData();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleStart = async (item: TimedProductionItem, prep: number) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTimedPhase<TimedProductionItem>(apiPath, item.id, {
        inizio: timeStr,
        stato: 'in lavorazione',
        preparazione: prep,
        operatore: username
      });
      toast.success('Lavorazione iniziata');
      loadData();
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handlePause = async (item: TimedProductionItem) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTimedPhase<TimedProductionItem>(apiPath, item.id, {
        pausa: timeStr,
        stato: 'in pausa',
        operatore: username
      });
      toast.success('Lavorazione in pausa');
      loadData(true);
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleResume = async (item: TimedProductionItem) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTimedPhase<TimedProductionItem>(apiPath, item.id, {
        inizio2: timeStr,
        stato: 'in lavorazione',
        operatore: username
      });
      toast.success('Lavorazione ripresa');
      loadData(true);
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleComplete = async (item: TimedProductionItem, prep: number, fine: string, confirmedQty: number) => {
    try {
      const parseTimeToDate = (timeStr: string | null, referenceDate?: Date) => {
        if (!timeStr) return null;
        if (timeStr.includes('T')) {
          return new Date(timeStr);
        }
        const [h, m] = timeStr.split(':').map(Number);
        const d = referenceDate ? new Date(referenceDate) : new Date();
        d.setHours(h, m, 0, 0);
        return d;
      };

      let startDate = parseTimeToDate(item.inizio);
      const endDate = parseTimeToDate(fine, startDate || new Date());
      if (!endDate) throw new Error('Orario di fine non valido');

      if (!startDate) {
        startDate = endDate; // Fallback so totalMinutes calculation becomes 0
      }

      const getDiffMinutes = (d1: Date, d2: Date, t1: string, t2: string) => {
        let diff = (d2.getTime() - d1.getTime()) / 60000;
        if (!t1.includes('T') && !t2.includes('T') && diff < 0) {
          diff += 24 * 60;
        }
        return diff;
      };

      let totalMinutes = 0;
      if (item.pausa && item.inizio2) {
        const pauseDate = parseTimeToDate(item.pausa, startDate);
        const resumeDate = parseTimeToDate(item.inizio2, startDate);
        if (pauseDate && resumeDate) {
          const seg1 = getDiffMinutes(startDate, pauseDate, item.inizio || fine, item.pausa);
          const seg2 = getDiffMinutes(resumeDate, endDate, item.inizio2, fine);
          totalMinutes = seg1 + seg2;
        } else {
          totalMinutes = getDiffMinutes(startDate, endDate, item.inizio || fine, fine);
        }
      } else if (item.pausa) {
        const pauseDate = parseTimeToDate(item.pausa, startDate);
        if (pauseDate) {
          totalMinutes = getDiffMinutes(startDate, pauseDate, item.inizio || fine, item.pausa);
        } else {
          totalMinutes = getDiffMinutes(startDate, endDate, item.inizio || fine, fine);
        }
      } else {
        totalMinutes = getDiffMinutes(startDate, endDate, item.inizio || fine, fine);
      }
      
      const totalTime = Math.round(totalMinutes) + prep;

      const updateData: Partial<TimedProductionItem> = {
        preparazione: prep,
        fine,
        totale_tempo: totalTime,
        stato: 'completato',
        operatore: username,
        quantita: confirmedQty
      };

      if (!item.inizio) {
        updateData.inizio = fine;
      }

      await updateTimedPhase<TimedProductionItem>(apiPath, item.id, updateData);

      const articleObj = articles.find(a => a.codice === item.articolo || a.nome === item.articolo);
      
      if (articleObj) {
        await addMovementLog({
          articolo_id: articleObj.id,
          articolo_nome: articleObj.nome,
          articolo_codice: articleObj.codice,
          fase: `${faseLogName} - Carico da ${machineName}`,
          tipo: 'carico',
          quantita: confirmedQty,
          quantita_lanciata: item.quantita,
          operatore: username,
          tempo: totalTime,
          timestamp: new Date().toISOString()
        });
        onUpdate();
      } else {
        await addMovimentoCGialla({
          articolo_spc: item.articolo,
          fase: faseCGiallaName,
          quantita: confirmedQty,
          cliente: item.cliente || '-',
          commessa: item.commessa || '-',
          operatore: username,
          tempo_min: totalTime,
          data_reg: new Date().toISOString()
        });
      }

      // Check for domino effect from Pannellatrice
      if (apiPath === '/api/fase-pannelatrice' || apiPath === '/api/fase-piega-manuale') {
        const articleObj = articles.find(a => a.codice === item.articolo || a.nome === item.articolo);
        let needsSaldatura = false;
        
        if (articleObj) {
           const cat = getCategory(articleObj.nome || '', articleObj.codice || '');
           needsSaldatura = isPhaseEnabled(cat, 'saldatura');
        }

        if (needsSaldatura) {
          await addFaseSaldatura({
            data: new Date().toLocaleDateString('it-IT'),
            articolo: item.articolo,
            quantita: confirmedQty,
            odl: item.odl || '',
            cliente: item.cliente || '',
            commessa: item.commessa || '',
            note: item.note,
            stato: 'da lavorare'
          });
          
          await addMovimentoCGialla({
            articolo_spc: item.articolo,
            fase: 'Uscita Piega -> Entrata Saldatura',
            quantita: confirmedQty,
            cliente: item.cliente || '-',
            commessa: item.commessa || '-',
            operatore: 'Auto SV',
            tempo_min: 0,
            data_reg: new Date().toISOString()
          });
        } else {
          await addFaseVerniciatura({
            data: new Date().toLocaleDateString('it-IT'),
            articolo: item.articolo,
            quantita: confirmedQty,
            odl: item.odl || '',
            cliente: item.cliente || '',
            commessa: item.commessa || '',
            note: item.note,
            stato: 'da lavorare'
          });
          
          await addMovimentoCGialla({
            articolo_spc: item.articolo,
            fase: 'Uscita Piega -> Entrata Verniciatura',
            quantita: confirmedQty,
            cliente: item.cliente || '-',
            commessa: item.commessa || '-',
            operatore: 'Auto SV',
            tempo_min: 0,
            data_reg: new Date().toISOString()
          });
        }
      }

      toast.success('Lavorazione completata e carico registrato');
      loadData();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <button
          onClick={() => loadData()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95"
          title="Aggiorna dati"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {canAddProgram && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Nuovo Programma {machineName}
          </h2>
          <form onSubmit={handleAddProgram} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Articolo</label>
              <input
                list={`articles-list-${machineName.replace(/\s+/g, '-')}`}
                value={newArticle}
                onChange={(e) => setNewArticle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Codice o nome"
                required
              />
              <datalist id={`articles-list-${machineName.replace(/\s+/g, '-')}`}>
                {(articleFilter ? articles.filter(articleFilter) : articles).map(a => (
                  <option key={a.id} value={a.codice}>{a.nome}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantità</label>
              <input
                type="number"
                min="1"
                value={newQuantita}
                onChange={(e) => setNewQuantita(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N. ODL (Opz.)</label>
              <input
                type="text"
                value={newOdl}
                onChange={(e) => setNewOdl(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
              <input
                type="text"
                value={newCliente}
                onChange={(e) => setNewCliente(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N. Commessa</label>
              <input
                type="text"
                value={newCommessa}
                onChange={(e) => setNewCommessa(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-5 flex justify-end mt-2">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Aggiungi al Piano
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Lavorazioni {machineName}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-2 py-3">Data</th>
                <th className="px-2 py-3">Cliente</th>
                <th className="px-2 py-3">Commessa</th>
                <th className="px-2 py-3">Articolo</th>
                <th className="px-2 py-3">Q.tà</th>
                <th className="px-2 py-3">ODL</th>
                <th className="px-2 py-3">Stato</th>
                <th className="px-2 py-3">Prep. (min)</th>
                <th className="px-2 py-3">Inizio</th>
                <th className="px-2 py-3">Pausa</th>
                <th className="px-2 py-3">2° Inizio</th>
                <th className="px-2 py-3">Fine</th>
                <th className="px-2 py-3">Totale (min)</th>
                <th className="px-2 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <TimedPhaseRow 
                  key={item.id} 
                  item={item} 
                  isOperator={isOperator} 
                  isManager={isManager}
                  isDeveloper={isDeveloper}
                  apiPath={apiPath}
                  onUpdateRow={async (id, data) => {
                    try {
                      await updateTimedPhase<TimedProductionItem>(apiPath, id, data);
                      toast.success('Riga aggiornata');
                      loadData(true);
                    } catch (error: any) {
                      toast.error('Errore: ' + error.message);
                    }
                  }}
                  onStart={(prep) => handleStart(item, prep)}
                  onPause={() => handlePause(item)}
                  onResume={() => handleResume(item)}
                  onComplete={(prep, fine) => {
                    setConfirmingItem(item);
                    setConfirmedQty(item.quantita);
                    setTempPrep(prep);
                    setTempFine(fine);
                  }}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-500">
                    Nessun programma trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                Conferma Quantità {machineName}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                L'articolo <span className="font-bold text-slate-700">{confirmingItem.articolo}</span> è stato completato.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Quantità Prevista: <span className="text-slate-900">{confirmingItem.quantita}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    value={confirmedQty}
                    onChange={(e) => setConfirmedQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="Inserisci quantità effettiva..."
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => {
                  setConfirmingItem(null);
                  setConfirmedQty('');
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (confirmedQty === '' || Number(confirmedQty) < 0) {
                    toast.error('Inserisci una quantità valida');
                    return;
                  }
                  handleComplete(confirmingItem, tempPrep, tempFine, Number(confirmedQty));
                  setConfirmingItem(null);
                  setConfirmedQty('');
                }}
                className="flex-[2] bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Conferma e Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeCell({ 
  item, 
  field, 
  onUpdateRow 
}: { 
  item: any, 
  field: string, 
  onUpdateRow: (id: string, data: any) => void 
}) {
  const formatTimeStr = (iso: string | null) => {
    if (!iso) return '-';
    if (iso.includes(':') && !iso.includes('T')) return iso;
    try {
      return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  };

  return (
    <span className="px-1 py-0.5">
      {formatTimeStr(item[field])}
    </span>
  );
}

function TimedPhaseRow({ 
  item, 
  isOperator, 
  isManager,
  onStart, 
  onPause,
  onResume,
  onComplete, 
  onDelete,
  isDeveloper,
  onUpdateRow
}: { 
  item: TimedProductionItem; 
  isOperator: boolean;
  isManager: boolean;
  onStart: (prep: number) => void; 
  onPause: () => void;
  onResume: () => void;
  onComplete: (prep: number, fine: string) => void;
  onDelete: () => void;
  isDeveloper: boolean;
  apiPath: string;
  onUpdateRow: (id: string, data: Partial<TimedProductionItem>) => Promise<void>;
}) {
  const [prep, setPrep] = useState<number | ''>(item.preparazione || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TimedProductionItem>>({});

  const isDaLavorare = item.stato === 'da lavorare' || item.stato === 'da tagliare';
  const isInLavorazione = item.stato === 'in lavorazione';
  const isPausa = item.stato === 'in pausa';
  const isCompletato = item.stato === 'completato';

  const formatTimeStr = (iso: string | null) => {
    if (!iso) return '-';
    if (iso.includes(':') && !iso.includes('T')) return iso;
    try {
      return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  };

  const handleTimeUpdate = (id: string, updates: any) => {
    const parseTimeToDate = (timeStr: string | null, referenceDate?: Date) => {
      if (!timeStr) return null;
      if (timeStr.includes('T')) return new Date(timeStr);
      const [h, m] = timeStr.split(':').map(Number);
      const d = referenceDate ? new Date(referenceDate) : new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };

    const getDiffMinutes = (d1: Date, d2: Date, t1: string, t2: string) => {
      let diff = (d2.getTime() - d1.getTime()) / 60000;
      if (!t1.includes('T') && !t2.includes('T') && diff < 0) diff += 24 * 60;
      return diff;
    };

    const newData = { ...item, ...updates };
    
    let startDate = parseTimeToDate(newData.inizio);
    const endDate = parseTimeToDate(newData.fine, startDate || new Date());
    
    let totalMinutes = 0;
    if (startDate && endDate) {
      if (newData.pausa && newData.inizio2) {
        const pauseDate = parseTimeToDate(newData.pausa, startDate);
        const resumeDate = parseTimeToDate(newData.inizio2, startDate);
        if (pauseDate && resumeDate) {
          const seg1 = getDiffMinutes(startDate, pauseDate, newData.inizio || newData.fine || '', newData.pausa);
          const seg2 = getDiffMinutes(resumeDate, endDate, newData.inizio2, newData.fine || '');
          totalMinutes = seg1 + seg2;
        } else {
          totalMinutes = getDiffMinutes(startDate, endDate, newData.inizio || newData.fine || '', newData.fine || '');
        }
      } else if (newData.pausa) {
        const pauseDate = parseTimeToDate(newData.pausa, startDate);
        if (pauseDate) {
          totalMinutes = getDiffMinutes(startDate, pauseDate, newData.inizio || newData.fine || '', newData.pausa);
        } else {
          totalMinutes = getDiffMinutes(startDate, endDate, newData.inizio || newData.fine || '', newData.fine || '');
        }
      } else {
        totalMinutes = getDiffMinutes(startDate, endDate, newData.inizio || newData.fine || '', newData.fine || '');
      }
      newData.totale_tempo = Math.round(totalMinutes) + (Number(prep) || 0);
    }
    
    onUpdateRow(id, newData);
  };

  const handleStartEdit = () => {
    setEditData({ ...item });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await onUpdateRow(item.id, editData);
    setIsEditing(false);
  };

  if (isEditing && isDeveloper) {
    return (
      <tr className="bg-blue-50 text-xs">
        <td className="px-1 py-2"><input type="date" className="w-full border rounded px-1" value={editData.data || ''} onChange={e => setEditData({...editData, data: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.cliente || ''} onChange={e => setEditData({...editData, cliente: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.commessa || ''} onChange={e => setEditData({...editData, commessa: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.articolo || ''} onChange={e => setEditData({...editData, articolo: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="number" className="w-full border rounded px-1" value={editData.quantita || ''} onChange={e => setEditData({...editData, quantita: Number(e.target.value)})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.odl || ''} onChange={e => setEditData({...editData, odl: e.target.value})} /></td>
        <td className="px-1 py-2">
          <select className="w-full border rounded px-1" value={editData.stato || ''} onChange={e => setEditData({...editData, stato: e.target.value})}>
            <option value="da lavorare">Lanciato</option>
            <option value="in lavorazione">In lavorazione</option>
            <option value="in pausa">In pausa</option>
            <option value="completato">Completato</option>
          </select>
        </td>
        <td className="px-1 py-2"><input type="number" className="w-full border rounded px-1" value={editData.preparazione || 0} onChange={e => setEditData({...editData, preparazione: Number(e.target.value)})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.inizio || ''} onChange={e => setEditData({...editData, inizio: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.pausa || ''} onChange={e => setEditData({...editData, pausa: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.inizio2 || ''} onChange={e => setEditData({...editData, inizio2: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="text" className="w-full border rounded px-1" value={editData.fine || ''} onChange={e => setEditData({...editData, fine: e.target.value})} /></td>
        <td className="px-1 py-2"><input type="number" className="w-full border rounded px-1" value={editData.totale_tempo || 0} onChange={e => setEditData({...editData, totale_tempo: Number(e.target.value)})} /></td>
        <td className="px-1 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-4 h-4" /></button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={clsx(
      "hover:bg-slate-50 transition-colors",
      isCompletato ? "bg-emerald-50/30" : isInLavorazione ? "bg-amber-50/30" : isPausa ? "bg-red-50/30" : ""
    )}>
      <td className="px-2 py-3 whitespace-nowrap">
        {item.data && !isNaN(new Date(item.data).getTime()) ? (
          <div className="flex flex-col">
            <span>{new Date(item.data).toLocaleDateString('it-IT')}</span>
            <span className="text-[10px] text-slate-500">{new Date(item.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ) : '-'}
      </td>
      <td className="px-2 py-3 text-[10px] text-slate-600 max-w-[100px] truncate" title={item.cliente}>{item.cliente || '-'}</td>
      <td className="px-2 py-3 text-[10px] text-slate-600 max-w-[100px] truncate" title={item.commessa}>{item.commessa || '-'}</td>
      <td className="px-2 py-3 font-medium text-slate-800 text-xs">{item.articolo}</td>
      <td className="px-2 py-3">
        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-xs">
          {item.quantita}
        </span>
      </td>
      <td className="px-2 py-3 text-[10px] text-slate-500">{item.odl || '-'}</td>
      <td className="px-2 py-3">
        <span className={clsx(
          "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider",
          isDaLavorare && "bg-slate-100 text-slate-600",
          isInLavorazione && "bg-amber-100 text-amber-700",
          isPausa && "bg-red-100 text-red-700",
          isCompletato && "bg-emerald-100 text-emerald-700"
        )}>
          {isDaLavorare ? 'Lanciato' : item.stato}
        </span>
      </td>
      <td className="px-2 py-3">
        <input 
          type="number" 
          min="0"
          value={prep}
          onChange={(e) => setPrep(e.target.value === '' ? '' : Number(e.target.value))}
          className="border border-slate-300 rounded px-1 py-0.5 text-xs w-12 focus:ring-1 focus:ring-indigo-500 outline-none"
          placeholder="Min."
          disabled={!isDaLavorare && !isPausa}
        />
      </td>
      <td className="px-2 py-3 font-mono text-[10px]">
        <TimeCell item={item} field="inizio" onUpdateRow={handleTimeUpdate} />
      </td>
      <td className="px-2 py-3 font-mono text-[10px] text-red-600 font-bold">
        <TimeCell item={item} field="pausa" onUpdateRow={handleTimeUpdate} />
      </td>
      <td className="px-2 py-3 font-mono text-[10px] text-indigo-600 font-bold">
        <TimeCell item={item} field="inizio2" onUpdateRow={handleTimeUpdate} />
      </td>
      <td className="px-2 py-3 font-mono text-[10px]">
        <TimeCell item={item} field="fine" onUpdateRow={handleTimeUpdate} />
      </td>
      <td className="px-2 py-3 font-bold text-slate-700 text-xs">
        {item.totale_tempo ? `${item.totale_tempo}'` : '-'}
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {isDaLavorare && isOperator && (
            <button 
              onClick={() => {
                if (prep === '' || prep === 0) {
                  toast.error('Inserisci la preparazione');
                  return;
                }
                onStart(Number(prep));
              }}
              className="bg-amber-500 text-white p-1 rounded hover:bg-amber-600 transition-colors"
              title="Inizia Lavorazione"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          
          {isPausa && isOperator && (
            <button 
              onClick={() => onResume()}
              className="bg-indigo-500 text-white p-1 rounded hover:bg-indigo-600 transition-colors"
              title="Riprendi Lavorazione"
            >
              <Play className="w-3 h-3" />
            </button>
          )}

          {isInLavorazione && isOperator && (
            <button 
              onClick={() => onPause()}
              className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors"
              title="Pausa"
            >
              <Clock className="w-3 h-3" />
            </button>
          )}

          {isInLavorazione && isOperator && (
            <button 
              onClick={() => {
                const now = new Date().toISOString();
                onComplete(Number(prep) || 0, now);
              }}
              className="bg-emerald-500 text-white p-1 rounded hover:bg-emerald-600 transition-colors"
              title="Completa Lavorazione"
            >
              <Square className="w-3 h-3" />
            </button>
          )}

          {isManager && isDaLavorare && (
            <button 
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
              title="Elimina"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {isDeveloper && (
            <button 
              onClick={handleStartEdit}
              className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
              title="Modifica riga"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
