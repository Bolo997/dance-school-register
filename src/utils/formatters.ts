export const formatPrice = (value: number): string => {
  if (value === null || value === undefined) return '€0.00';
  return `€${value.toFixed(2)}`;
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

