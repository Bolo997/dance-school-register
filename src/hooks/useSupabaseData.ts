import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { createCreatoModificato } from '../utils/helpers';

interface UseSupabaseDataOptions {
  userName?: string;
}

interface UseSupabaseDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (item: Partial<T>) => Promise<{ success: boolean; error?: any }>;
  update: (id: string, item: Partial<T>) => Promise<{ success: boolean; error?: any }>;
  remove: (id: string) => Promise<{ success: boolean; error?: any }>;
  removeAll?: () => Promise<{ success: boolean; error?: any }>;
}

const TABLES_WITHOUT_TIMESTAMPS = ['Users', 'Role', 'InfoSito', 'TipoIscrizione'];

export function useSupabaseData<T extends { id: string }>(
  tableName: string,
  options: UseSupabaseDataOptions = {},
  orderBy: { column: string; ascending: boolean } | null = null
): UseSupabaseDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userName = 'Unknown' } = options;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase.from(tableName).select('*');
    
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }
    
    const { data: result, error: fetchError } = await query;
    
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setData(result || []);
    }
    
    setLoading(false);
  }, [tableName, orderBy]);

  const create = useCallback(async (item: Partial<T>): Promise<{ success: boolean; error?: any }> => {
    const itemToInsert = { ...item };
    
    if (!TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
      (itemToInsert as any).creato = createCreatoModificato(userName);
    }
    
    const { error: insertError } = await supabase.from(tableName).insert(itemToInsert);
    
    if (insertError) return { success: false, error: insertError };
    
    await reload();
    return { success: true };
  }, [tableName, userName, reload]);

  const update = useCallback(async (id: string, item: Partial<T>): Promise<{ success: boolean; error?: any }> => {
    const itemToUpdate = { ...item };
    
    if (!TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
      (itemToUpdate as any).modificato = createCreatoModificato(userName);
    }
    
    const { error: updateError } = await supabase.from(tableName).update(itemToUpdate).eq('id', id);
    
    if (updateError) return { success: false, error: updateError };
    
    await reload();
    return { success: true };
  }, [tableName, userName, reload]);

  const remove = useCallback(async (id: string): Promise<{ success: boolean; error?: any }> => {
    const { error: deleteError } = await supabase.from(tableName).delete().eq('id', id);
    
    if (deleteError) return { success: false, error: deleteError };
    
    await reload();
    return { success: true };
  }, [tableName, reload]);

  const removeAll = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    // Supabase/Postgres richiede una WHERE, usiamo gt('id', 0) per eliminare tutti
    const { error: deleteError } = await supabase.from(tableName).delete().gt('id', 0);
    if (deleteError) return { success: false, error: deleteError };
    await reload();
    return { success: true };
  }, [tableName, reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, create, update, remove, removeAll };
}
