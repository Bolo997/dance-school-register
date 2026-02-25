export interface InfoSito {
  id: string;
  campo: string;
  valore: string;
}

export interface TipoIscrizione {
  id: string;
  tipo: string;
  value: string;
}

export interface ImportoPreventivo {
  id: string;
  descrizione: string;
  valore: string;
}

export interface Log {
  id: string;
  utente: string;
  dataOperazione: string;
  tipoOperazione: string;
  lista: string;
  elemento: string;
}

export interface Fattura {
  id: string;
  idSocio: string;
  nome: string;
  cognome: string;
  settembre: string;
  ottobre: number;
  novembre: number;
  dicembre: number;
  gennaio: number;
  febbraio: number;
  marzo: number;
  aprile: number;
  maggio: number;
  giugno: number;
  pagamenti: string;
  note?: string;
  creato: string;
  modificato?: string;
}

export interface UserProfile {
  id: string;
  userName: string;
  password?: string;
  role: string;
  full_name?: string;
}

export interface Sala {
  id: string;
  nomeSala: string;
  creato: string;
  modificato?: string;
}

export interface Corso {
  id: string;
  nomeCorso: string;
  prezzoBase: number;
  prezzoAggiuntivo: number;
  lezioni: string[];
  categoria: string;
  oreSettimanali: number;
  creato: string;
  modificato?: string;
}

export interface CategoriaCorso {
  id: string;
  categoria: string;
  colore: string;
  creato: string;
  modificato?: string;
}

export interface Socio {
  id: string;
  nome: string;
  cognome: string;
  codFiscale: string;
  dataNascita: string;
  luogoNascita: string;
  provinciaNascita: string;
  indirizzo: string;
  residenza: string;
  provinciaResidenza: string;
  telefono: string;
  email: string;
  iscrizione: boolean;
  modulo: boolean;
  agonistico: boolean;
  sospeso: boolean;
  dataIscrizione: string;
  quotaIscrizione: string;
  scadenzaTessera: string;
  scadenzaCertificato: string;
  quotaMensile: string;
  quotaSaggio: string;
  base: string;
  corsi: string;
  accademia?: string;
  nomeGenitore: string;
  cognomeGenitore: string;
  codFiscaleGenitore: string;
  note: string;
  creato: string;
  modificato?: string;
}

export interface Accademia {
  id: string;
  pacchetto: string;
  categoria: string;
  corsi: string;
  prezzo: number;
}

export interface Insegnante {
  id: string;
  nome: string;
  cognome: string;
  discipline: string[];
  codFiscale: string;
  dataNascita: string;
  luogoNascita: string;
  provinciaNascita: string;
  indirizzo: string;
  residenza: string;
  provinciaResidenza: string;
  telefono: string;
  email: string;
  partitaIva: string;
  contratto: string;
  dataAssunzione: string;
  note: string;
  creato: string;
  modificato?: string;
}

export interface PagamentoInsegnante {
  id: string;
  idInsegnante: string;
  disciplina: string;
  settimana: number;
  mese: string;
  data: string;
  compensoLezione: number;
  note: string;
  creato: string;
  modificato?: string;
}

export interface Column {
  key: string;
  label: string;
  format?: (value: any) => string | React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface Role {
  id: string;
  role: string;
}