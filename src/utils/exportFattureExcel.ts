import * as XLSX from 'xlsx';

export function exportFattureExcel(fatture: any[], columns: any[]): void {
  const data = fatture.map((row: any) => {
    const out: Record<string, any> = {};
    columns.forEach((col: any) => {
      const value = row[col.key];
      out[col.label] = typeof col.format === 'function' ? col.format(value) : value;
    });
    return out;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro Soci');
  XLSX.writeFile(workbook, 'registro_soci.xlsx');
}
