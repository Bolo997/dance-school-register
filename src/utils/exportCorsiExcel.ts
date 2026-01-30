import * as XLSX from 'xlsx';

export function exportCorsiExcel(corsi: any[], columns: any[]): void {
  const data = corsi.map((row: any) => {
    const out: Record<string, any> = {};
    columns.forEach((col: any) => {
      const value = row[col.key];
      out[col.label] = typeof col.format === 'function' ? col.format(value) : value;
    });
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Corsi');
  XLSX.writeFile(workbook, 'Corsi.xlsx');
}
