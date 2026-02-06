export const formatPrice = (value: number): string => {
  if (value === null || value === undefined) return '€0.00';
  return `€${value.toFixed(2)}`;
};

export const formatEuro = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && value.trim() === '') return '';

  let numeric: number;
  if (typeof value === 'number') {
    numeric = value;
  } else if (typeof value === 'string') {
    // Support common IT formats: "12,34" and "1.234,56"
    const normalized = value.trim().replace(/\./g, '').replace(',', '.');
    numeric = Number(normalized);
  } else {
    numeric = Number(value);
  }

  if (Number.isNaN(numeric)) return '';
  return `€${numeric.toFixed(2)}`;
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('it-IT');
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatFullName = (nome: string, cognome: string): string => {
  return `${cognome} ${nome}`.trim();
};

