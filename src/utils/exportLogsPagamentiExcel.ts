import * as XLSX from 'xlsx';
import { Log } from '../types';

export function exportLogsPagamentiExcel(logs: Log[]): void {
  const data = (logs || []).map((l) => ({
    Data: (l as any).dataOperazione || (l as any).dataoperazione || (l as any).data || '',
    Utente: (l as any).utente || '',
    Operazione: (l as any).tipoOperazione || '',
    Lista: (l as any).lista || '',
    Elemento: (l as any).elemento || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagamenti');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  XLSX.writeFile(workbook, `Pagamenti_${yyyy}-${mm}-${dd}.xlsx`);
}
