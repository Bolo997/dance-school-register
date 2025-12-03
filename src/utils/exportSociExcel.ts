import * as XLSX from 'xlsx';
import { Socio } from '../types';

interface Column {
  key: string;
  label: string;
  format?: (value: any) => string | React.ReactNode;
  width?: string;
}

export function exportSociExcel(soci: Socio[], columns: Column[]): void {
  const data = soci.map((socio: Socio) => {
    const row: Record<string, any> = {};
    columns.forEach((col: Column) => {
      const value = socio[col.key as keyof Socio];
      row[col.label] = typeof col.format === 'function' ? col.format(value) : value;
    });
    return row;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Soci');
  XLSX.writeFile(workbook, 'soci.xlsx');
}
