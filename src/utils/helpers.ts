import { formatDateTime } from './formatters';

export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 7; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

export const createCreatoModificato = (userName: string, date: Date = new Date()): string => {
  return `${userName} - ${formatDateTime(date.toISOString())}`;
};

export const createOrario = (oraInizio: string, oraFine: string): string => {
  return `${oraInizio} - ${oraFine}`;
};

export const validateTimeRange = (oraInizio: string, oraFine: string): boolean => {
  return oraFine > oraInizio;
};

export { formatPrice, formatDate, formatDateTime, formatFullName } from './formatters';

