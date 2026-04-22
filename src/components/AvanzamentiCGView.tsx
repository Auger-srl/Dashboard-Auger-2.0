import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

interface StdRow {
  id: string;
  cliente: string;
  articolo: string;
  taglio: string;
  piega: string;
  saldato: string;
  vern: string;
  impegnati: string;
  nuova: string;
  note: string;
}

const initialData: string[][] = [];

export default function AvanzamentiCGView() {
  const [rows, setRows] = useState<StdRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const reloadData = () => {
    const saved = localStorage.getItem('avanzamentiCGData_v2');
    if (saved) {
      try {
        setRows(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved data", e);
      }
    }
  };

  useEffect(() => {
    reloadData();
    if (rows.length === 0) {
      // Just check if we need to initialize
      const saved = localStorage.getItem('avanzamentiCGData_v2');
      if (!saved) initializeData();
    }
    
    // Ascolta gli aggiornamenti scatenati da altre view
    window.addEventListener('avanzamentiCGUpdate', reloadData);
    return () => window.removeEventListener('avanzamentiCGUpdate', reloadData);
  }, []);

  const initializeData = () => {
    const initialRows: StdRow[] = initialData.map((row, index) => ({
      id: `row-${Date.now()}-${index}`,
      cliente: row[0] || '',
      articolo: row[1] || '',
      taglio: row[2] || '',
      piega: row[3] || '',
      saldato: row[4] || '',
      vern: row[5] || '',
      impegnati: row[6] || '',
      nuova: row[7] || '',
      note: row[8] || ''
    }));
    
    // You asked to keep only the columns, but normally we might want at least 1 empty row to start typing.
    // I will leave the array completely empty initially as requested.

    setRows(initialRows);
    localStorage.setItem('avanzamentiCGData_v2', JSON.stringify(initialRows));
  };

  const saveRows = (newRows: StdRow[]) => {
    setRows(newRows);
    localStorage.setItem('avanzamentiCGData_v2', JSON.stringify(newRows));
  };

  const handleAddRow = () => {
    const newRow: StdRow = {
      id: `new-${Date.now()}`,
      cliente: '',
      articolo: '',
      taglio: '',
      piega: '',
      saldato: '',
      vern: '',
      impegnati: '',
      nuova: '',
      note: ''
    };
    saveRows([newRow, ...rows]);
  };

  const handleAddRowAfter = (id: string) => {
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) return;

    const newRow: StdRow = {
      id: `new-${Date.now()}`,
      cliente: rows[index].cliente, // Copy the same client name
      articolo: '',
      taglio: '',
      piega: '',
      saldato: '',
      vern: '',
      impegnati: '',
      nuova: '',
      note: ''
    };

    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    saveRows(newRows);
  };

  const handleDeleteRow = (id: string) => {
    saveRows(rows.filter(r => r.id !== id));
  };

  const handleChange = (id: string, field: keyof StdRow, value: string) => {
    const newRows = rows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    saveRows(newRows);
  };

  const filteredRows = rows.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (row.cliente || '').toLowerCase().includes(searchLower) ||
      (row.articolo || '').toLowerCase().includes(searchLower) ||
      (row.note || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">AVANZAMENTI C.G.</h2>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Aggiungi</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 border-r border-slate-200 w-[280px]">CLIENTE</th>
                <th className="px-4 py-3 border-r border-slate-200">ARTICOLO</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#c6efce] w-[60px]">TAGLIO</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#e0e0e0] w-[60px]">PIEGA</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#f4cccc] w-[60px]">SALDATO</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#fce5cd] w-[60px]">VERN</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#fff2cc] w-[60px]">IMPEGNATI</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#b6d7a8] w-[60px]">NUOVA G.</th>
                <th className="px-4 py-3 border-r border-slate-200 w-[200px]">NOTE</th>
                <th className="px-4 py-3 text-center w-12">X</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="border-r border-slate-200 px-4 py-2 font-medium">
                    {row.cliente}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-2">
                    {row.articolo}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-2 text-center text-slate-600">
                    {row.taglio || '-'}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-2 text-center text-slate-600">
                    {row.piega || '-'}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-2 text-center text-slate-600">
                    {row.saldato || '-'}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-2 text-center text-slate-600">
                    {row.vern || '-'}
                  </td>
                  <td className="border-r border-slate-200 px-4 py-2 text-center text-slate-600 font-bold">
                    {row.impegnati || '-'}
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.nuova} 
                      onChange={(e) => handleChange(row.id, 'nuova', e.target.value)}
                      className="w-full h-full px-1 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.note} 
                      onChange={(e) => handleChange(row.id, 'note', e.target.value)}
                      className="w-full h-full px-2 py-2 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-xs"
                    />
                  </td>
                  <td className="text-center">
                    <button 
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors mx-auto"
                      title="Elimina riga"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Nessun risultato trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
