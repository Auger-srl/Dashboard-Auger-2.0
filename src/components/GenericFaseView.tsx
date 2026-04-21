import React, { useState, useEffect } from 'react';
import { Plus, Save, Printer, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { apiCall } from '../api';
import { Article, FaseTaglio } from '../types';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';

interface GenericFaseViewProps {
  articles: Article[];
  username: string;
  onUpdate?: () => void;
  apiPath: string;
  title: string;
  filterMachine: string;
  defaultMachine: string;
}

export default function GenericFaseView({ 
  articles, 
  username, 
  onUpdate, 
  apiPath, 
  title, 
  filterMachine, 
  defaultMachine 
}: GenericFaseViewProps) {
  const [rows, setRows] = useState<FaseTaglio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<FaseTaglio[]>([]);

  const [formData, setFormData] = useState({
    lavorazione_per: '',
    articolo: '',
    quantita: 1,
    data: new Date().toISOString().split('T')[0],
    fatto: 0,
    odl: '',
    commessa: '',
    macchina: defaultMachine
  });

  const fetchRows = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await apiCall<FaseTaglio[]>(apiPath);
      // Filter by machine if filterMachine is provided
      const filteredData = filterMachine === 'All' ? data : data.filter(r => r.macchina === filterMachine);
      setRows(filteredData);
    } catch (error) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [apiPath, filterMachine]);

  const handleSave = async () => {
    if (!formData.lavorazione_per || !formData.articolo || formData.quantita <= 0 || !formData.data) {
      toast.error('Compila tutti i campi correttamente');
      return;
    }

    try {
      if (editingId) {
        await apiCall(`${apiPath}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Riga aggiornata');
      } else {
        await apiCall(apiPath, {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Riga aggiunta');
      }
      
      setEditingId(null);
      setFormData({
        lavorazione_per: '',
        articolo: '',
        quantita: 1,
        data: new Date().toISOString().split('T')[0],
        fatto: 0,
        odl: '',
        commessa: '',
        macchina: defaultMachine
      });
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const handleEdit = (row: FaseTaglio) => {
    setEditingId(row.id);
    setFormData({
      lavorazione_per: row.lavorazione_per,
      articolo: row.articolo,
      quantita: row.quantita,
      data: row.data,
      fatto: row.fatto,
      odl: row.odl || '',
      commessa: row.commessa || '',
      macchina: row.macchina || defaultMachine
    });
  };

  const handleToggleStampato = async (row: FaseTaglio, forceValue?: number) => {
    const newValue = forceValue !== undefined ? forceValue : (row.stampato === 1 ? 0 : 1);
    try {
      await apiCall(`${apiPath}/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...row, stampato: newValue })
      });
      fetchRows(true);
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleToggleFatto = async (row: FaseTaglio) => {
    try {
      const newValue = row.fatto === 1 ? 0 : 1;
      await apiCall(`${apiPath}/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...row, fatto: newValue })
      });
      fetchRows(true);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa riga?')) return;
    try {
      await apiCall(`${apiPath}/${id}`, { method: 'DELETE' });
      toast.success('Riga eliminata');
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleInlineEditStart = (row: FaseTaglio) => {
    setInlineEditingId(row.id);
    setInlineFormData({ ...row });
  };

  const handleInlineSave = async () => {
    if (!inlineFormData) return;
    try {
      await apiCall(`${apiPath}/${inlineFormData.id}`, {
        method: 'PUT',
        body: JSON.stringify(inlineFormData)
      });
      toast.success('Dati salvati');
      setInlineEditingId(null);
      setInlineFormData(null);
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  const toggleSelection = (row: FaseTaglio) => {
    if (selectedRows.find(r => r.id === row.id)) {
      setSelectedRows(selectedRows.filter(r => r.id !== row.id));
    } else {
      setSelectedRows([...selectedRows, row]);
    }
  };

  const printRows = (rowsToPrint: FaseTaglio[]) => {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error('Permetti i popup per stampare');
      return;
    }

    const renderRow = (row: FaseTaglio) => {
      const articleData = articles.find(a => a.nome === row.articolo);
      const isSpecial = !articleData;
      const codice = articleData ? articleData.codice : 'SPECIALE';
      const rawBarcodeValue = isSpecial ? row.articolo : (codice !== 'N/A' ? codice : row.articolo);
      const safeBarcodeValue = rawBarcodeValue.replace(/[^\x20-\x7E]/g, "") || "SPECIALE";

      const barcodeCanvasCodice = document.createElement('canvas');
      try {
        JsBarcode(barcodeCanvasCodice, safeBarcodeValue, { format: "CODE128", width: 4, height: 80, displayValue: false });
      } catch (e) {
        JsBarcode(barcodeCanvasCodice, "ERROR", { format: "CODE128", width: 4, height: 80, displayValue: false });
      }
      const barcodeCodiceUrl = barcodeCanvasCodice.toDataURL("image/png");

      const odlValue = row.odl || 'N/A';
      const barcodeCanvasOdl = document.createElement('canvas');
      try {
        JsBarcode(barcodeCanvasOdl, odlValue, { format: "CODE128", width: 3, height: 50, displayValue: false });
      } catch (e) {
        JsBarcode(barcodeCanvasOdl, "N/A", { format: "CODE128", width: 3, height: 50, displayValue: false });
      }
      const barcodeOdlUrl = barcodeCanvasOdl.toDataURL("image/png");

      return `
        <div class="label">
          <div class="header-top">
            <div class="title-section">
              <h1 style="font-size: 36px; font-weight: bold; margin: 0;">${codice}</h1>
              <p style="font-size: 16px; margin: 0;">${row.articolo}</p>
            </div>
            <div class="date-section">
              <p>DATA: ${row.data ? new Date(row.data).toLocaleDateString('it-IT') : '-'}</p>
            </div>
          </div>
          <div class="info-section">
            <p>${row.lavorazione_per}</p>
            <p>COMMESSA: ${row.commessa || 'Nessuna'}</p>
          </div>
          <div class="barcode-section">
            <div class="barcode"><img src="${barcodeCodiceUrl}" style="max-width: 100%; height: 60px;" /></div>
          </div>
          <div class="footer-section">
            <div class="qty-section">
              <p>QTÀ</p>
              <h1 style="font-size: 42px; font-weight: bold; margin: 0;">${row.quantita}</h1>
            </div>
            <div class="odl-section">
              <p>ODL</p>
              <div class="barcode"><img src="${barcodeOdlUrl}" style="max-height: 40px;" /></div>
            </div>
          </div>
        </div>
      `;
    };

    win.document.write(`
      <html>
        <head>
          <title>Stampa Etichette - ${title}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
            .label { 
              width: 100%; 
              height: 85mm; 
              border: 2px solid black; 
              margin-bottom: 10mm;
              padding: 10px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header-top { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 5px; }
            .info-section { text-align: center; border-bottom: 2px solid black; padding: 10px 0; font-size: 20px; font-weight: bold; }
            .barcode-section { text-align: center; padding: 10px 0; border-bottom: 1px solid #ccc; }
            .footer-section { display: flex; justify-content: space-between; align-items: center; padding-top: 5px; }
            .qty-section { text-align: center; width: 40%; border-right: 2px solid black; }
            .odl-section { text-align: center; width: 60%; }
            @media print { .label { break-inside: avoid; } }
          </style>
        </head>
        <body>
          ${rowsToPrint.map(row => renderRow(row)).join('')}
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><RefreshCw className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <button onClick={() => fetchRows()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <RefreshCw className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-500" />
          {editingId ? 'Modifica Voce' : 'Nuova Voce'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <input
            type="text"
            placeholder="Lavorazione per"
            value={formData.lavorazione_per}
            onChange={(e) => setFormData({ ...formData, lavorazione_per: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            list="articles-list"
            placeholder="Articolo"
            value={formData.articolo}
            onChange={(e) => setFormData({ ...formData, articolo: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            placeholder="Qtà"
            value={formData.quantita}
            onChange={(e) => setFormData({ ...formData, quantita: parseInt(e.target.value) || 0 })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="ODL"
            value={formData.odl}
            onChange={(e) => setFormData({ ...formData, odl: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Commessa"
            value={formData.commessa}
            onChange={(e) => setFormData({ ...formData, commessa: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="date"
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" /> {editingId ? 'Salva' : 'Aggiungi'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider w-10"></th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider">Lavorazione Per</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider">Articolo</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider text-center">Qtà</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider">ODL</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider">Commessa</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider">Data</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider text-center">Stato</th>
                <th className="px-4 py-3 text-xs font-black uppercase text-slate-500 tracking-wider text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => (
                <tr key={row.id} className={clsx("hover:bg-slate-50 transition-colors", row.fatto === 1 && "bg-emerald-50/30")}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!selectedRows.find(r => r.id === row.id)}
                      onChange={() => toggleSelection(row)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{row.lavorazione_per}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{row.articolo}</div>
                    <div className="text-[10px] text-slate-500">{articles.find(a => a.nome === row.articolo)?.codice || 'SPECIALE'}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-blue-600">{row.quantita}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-sm">{row.odl || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{row.commessa || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-sm">{row.data ? new Date(row.data).toLocaleDateString('it-IT') : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleFatto(row)}
                      className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                        row.fatto === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      )}
                    >
                      {row.fatto === 1 ? 'Completato' : 'In Corso'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => printRows([row])} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors" title="Stampa etichetta">
                        <Printer className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleEdit(row)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500 italic">Nessun dato presente</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedRows.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-[60] border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-sm font-bold">
            {selectedRows.length} {selectedRows.length === 1 ? 'elemento selezionato' : 'elementi selezionati'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => printRows(selectedRows)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-black uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Printer className="h-4 w-4" /> Stampa
            </button>
            <button
              onClick={() => setSelectedRows([])}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-black uppercase tracking-wider transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      <datalist id="articles-list">
        {articles.map(a => (
          <option key={a.id} value={a.nome}>{a.codice}</option>
        ))}
      </datalist>
    </div>
  );
}
