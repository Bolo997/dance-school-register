import { supabase } from '../config/supabase';

const getCurrentOperationDateTime = (): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
};

interface LogOperationParams {
  utente: string;
  tipoOperazione: string;
  lista: string;
  elemento: string;
}

export const logOperation = async ({
  utente,
  tipoOperazione,
  lista,
  elemento,
}: LogOperationParams): Promise<{ success: boolean; error?: any }> => {
  const dataOperazione = getCurrentOperationDateTime();

  const { error } = await supabase.from('Logs').insert({
    utente,
    dataOperazione,
    tipoOperazione,
    lista,
    elemento,
  });

  if (error) {
    return { success: false, error };
  }

  return { success: true };
};
