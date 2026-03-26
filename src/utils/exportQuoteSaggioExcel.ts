import * as XLSX from 'xlsx';

type QuotaSaggioRow = {
  nome: string;
  cognome: string;
  totalePrevisto: number;
  pagata: number;
  restante: number;
};

export function exportQuoteSaggioExcel(rows: QuotaSaggioRow[]): void {
  const data = rows.map((r) => ({
    Nome: r.nome,
    Cognome: r.cognome,
    'Totale previsto': Number.isFinite(r.totalePrevisto) ? r.totalePrevisto : 0,
    Pagata: Number.isFinite(r.pagata) ? r.pagata : 0,
    Restante: Number.isFinite(r.restante) ? r.restante : 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quote Saggio');
  XLSX.writeFile(workbook, 'QuoteSaggio.xlsx');
}
