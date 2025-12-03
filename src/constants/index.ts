export const ERROR_MESSAGES = {
  REQUIRED_FIELD: (fieldName: string) => `Il campo ${fieldName} è obbligatorio`,
  INVALID_TIME_RANGE: 'L\'ora di fine deve essere successiva all\'ora di inizio',
  DELETE_CONFIRMATION: (itemName: string) => `Sei sicuro di voler eliminare ${itemName}?`,
  GENERIC_ERROR: 'Si è verificato un errore. Riprova più tardi.',
};

export const SUCCESS_MESSAGES = {
  SAVED: 'Salvato con successo',
  DELETED: 'Eliminato con successo',
  UPDATED: 'Aggiornato con successo',
};

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9+\s()-]{6,20}$/,
};

export const TIME_SLOT_CONFIG = {
  START_HOUR: 7,
  END_HOUR: 23,
  INTERVAL_MINUTES: 15,
};

export const GIORNI_SETTIMANA = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato'
];
