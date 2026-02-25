import * as XLSX from 'xlsx';
import { Accademia } from '../types';

interface Column {
  key: keyof Accademia | string;
  label: string;
  format?: (value: any) => string;
}

export function exportAccademiaExcel(items: Accademia[], columns: Column[]): void {
  const data = items.map((item) => {
    const row: Record<string, any> = {};
    columns.forEach((col) => {
      const value = (item as any)[col.key];
      row[col.label] = typeof col.format === 'function' ? col.format(value) : value;
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accademia');
  XLSX.writeFile(workbook, 'Accademia.xlsx');
}
