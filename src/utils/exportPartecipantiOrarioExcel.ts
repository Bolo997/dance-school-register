import * as XLSX from 'xlsx';
import { Accademia, Corso, Socio } from '../types';
import { listHasToken, normalizeToken, parseListTokens } from './listTokens';

export interface PartecipantiOrarioRow {
  corso: string;
  partecipanti: string[];
}

const getPartecipantiForCorso = (nomeCorso: string, soci: Socio[], accademia: Accademia[]): Socio[] => {
  const corsoNorm = normalizeToken(nomeCorso);
  if (!corsoNorm) return [];

  const pacchettiCheIncludonoCorso = new Set(
    (accademia || [])
      .filter((a) => listHasToken(a.corsi, nomeCorso))
      .map((a) => normalizeToken(a.pacchetto))
      .filter(Boolean)
  );

  const socioHaPacchettoCheIncludeCorso = (socio: Socio): boolean => {
    if (!socio.accademia || pacchettiCheIncludonoCorso.size === 0) return false;
    return parseListTokens(socio.accademia).some((token) => pacchettiCheIncludonoCorso.has(normalizeToken(token)));
  };

  const corsoLower = (nomeCorso || '').trim().toLowerCase();

  return (soci || [])
    .filter((socio) => {
      const base = (socio.base || '').toLowerCase();
      const corsiStr = (socio.corsi || '').toLowerCase();
      return base.includes(corsoLower) || corsiStr.includes(corsoLower) || socioHaPacchettoCheIncludeCorso(socio);
    })
    .slice()
    .sort((a, b) => {
      const cognomeA = (a.cognome || '').toLowerCase();
      const cognomeB = (b.cognome || '').toLowerCase();
      const byCognome = cognomeA.localeCompare(cognomeB);
      if (byCognome !== 0) return byCognome;
      return (a.nome || '').toLowerCase().localeCompare((b.nome || '').toLowerCase());
    });
};

export const exportPartecipantiOrarioExcel = (corsi: Corso[], soci: Socio[], accademia: Accademia[]): void => {
  const rows: PartecipantiOrarioRow[] = (corsi || [])
    .map((c) => {
      const partecipanti = getPartecipantiForCorso(c.nomeCorso, soci, accademia)
        .map((s) => `${s.cognome || ''} ${s.nome || ''}`.trim())
        .filter(Boolean);

      return {
        corso: c.nomeCorso,
        partecipanti,
      };
    })
    .sort((a, b) => (a.corso || '').localeCompare((b.corso || ''), 'it', { sensitivity: 'base' }));

  const maxPartecipanti = rows.reduce((max, r) => Math.max(max, r.partecipanti.length), 0);

  const sheetRows = rows.map((r) => {
    const out: Record<string, any> = { Corso: r.corso };
    for (let i = 0; i < maxPartecipanti; i += 1) {
      out[`Partecipante ${i + 1}`] = r.partecipanti[i] ?? '';
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Partecipanti');
  XLSX.writeFile(workbook, 'Partecipanti_Corsi.xlsx');
};
