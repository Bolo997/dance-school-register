import * as XLSX from 'xlsx';

export function exportInsegnantiExcel(insegnanti: any[], columns: any[]): void {
  const data = insegnanti.map((row: any) => {
    const out: Record<string, any> = {};
    columns.forEach((col: any) => {
      let value = row[col.key];

      // Normalizza il campo "discipline" con separatore ';'
      if (col.key === 'discipline') {
        if (Array.isArray(value)) {
          value = value.map(v => String(v).trim()).filter(Boolean).join(';');
        } else if (typeof value === 'string') {
          value = value
            .split(/\r?\n|;|,/) // accetta newline, ';' o ',' in input
            .map(s => s.trim())
            .filter(Boolean)
            .join(';');
        }
      }
      out[col.label] = typeof col.format === 'function' ? col.format(value) : value;
    });
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Insegnanti');
  XLSX.writeFile(workbook, 'Insegnanti.xlsx');
}
