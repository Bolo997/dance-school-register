import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { createCreatoModificato } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

type CacheEntry<T> = {
  data: T[];
  lastFetchedAt: number;
};

// Cache in-memory (per tab). Evita spinner su refetch ripetuti.
const cache = new Map<string, CacheEntry<any>>();

const getCacheKey = (tableName: string, orderBy: { column: string; ascending: boolean } | null) => {
  return `${tableName}::${orderBy ? `${orderBy.column}:${orderBy.ascending}` : 'none'}`;
};

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

const TABLES_WITHOUT_TIMESTAMPS = ['Users', 'Role', 'InfoSito', 'TipoIscrizione', 'Logs'];

export function useSupabaseData<T extends { id: string }>(
  tableName: string,
  options: UseSupabaseDataOptions = {},
  orderBy: { column: string; ascending: boolean } | null = null
): UseSupabaseDataReturn<T> {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userName = 'Unknown' } = options;

  const cacheKey = getCacheKey(tableName, orderBy);

  const reloadInternal = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    setError(null);
    
    let query = supabase.from(tableName).select('*');
    
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }
    
    const { data: result, error: fetchError } = await query;
    
    if (fetchError) {
      setError(fetchError.message);
    } else {
      const next = (result || []) as T[];
      setData(next);
      cache.set(cacheKey, { data: next, lastFetchedAt: Date.now() });
    }
    
    if (!silent) setLoading(false);
  }, [tableName, orderBy, cacheKey]);

  const reload = useCallback(async () => {
    await reloadInternal(false);
  }, [reloadInternal]);

  const reloadSilent = useCallback(async () => {
    await reloadInternal(true);
  }, [reloadInternal]);

  const create = useCallback(async (item: Partial<T>): Promise<{ success: boolean; error?: any }> => {
    const itemToInsert = { ...item };
    
    if (!TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
      (itemToInsert as any).creato = createCreatoModificato(userName);
    }
    
    const { error: insertError } = await supabase.from(tableName).insert(itemToInsert);
    
    if (insertError) return { success: false, error: insertError };
    // Ricarica i dati in background per migliorare la reattività della UI
    reloadSilent().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Errore durante il reload dopo create:', err);
    });
    return { success: true };
  }, [tableName, userName, reloadSilent]);

  const update = useCallback(async (id: string, item: Partial<T>): Promise<{ success: boolean; error?: any }> => {
    const itemToUpdate = { ...item };
    
    if (!TABLES_WITHOUT_TIMESTAMPS.includes(tableName)) {
      (itemToUpdate as any).modificato = createCreatoModificato(userName);
    }
    
    const { error: updateError } = await supabase.from(tableName).update(itemToUpdate).eq('id', id);
    
    if (updateError) return { success: false, error: updateError };
    // Ricarica i dati in background per migliorare la reattività della UI
    reloadSilent().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Errore durante il reload dopo update:', err);
    });
    return { success: true };
  }, [tableName, userName, reloadSilent]);

  const remove = useCallback(async (id: string): Promise<{ success: boolean; error?: any }> => {
    const { error: deleteError } = await supabase.from(tableName).delete().eq('id', id);
    
    if (deleteError) return { success: false, error: deleteError };
    // Ricarica i dati in background per migliorare la reattività della UI
    reloadSilent().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Errore durante il reload dopo delete:', err);
    });
    return { success: true };
  }, [tableName, reloadSilent]);

  const removeAll = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    // Supabase/Postgres richiede una WHERE, usiamo gt('id', 0) per eliminare tutti
    const { error: deleteError } = await supabase.from(tableName).delete().gt('id', 0);
    if (deleteError) return { success: false, error: deleteError };
    // Ricarica i dati in background per migliorare la reattività della UI
    reloadSilent().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Errore durante il reload dopo removeAll:', err);
    });
    return { success: true };
  }, [tableName, reloadSilent]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached?.data) {
      setData(cached.data);
      setLoading(false);
      // riallinea in background (evita spinner)
      reloadSilent().catch(() => {
        /* noop */
      });
      return;
    }

    reload();
  }, [reload, reloadSilent, user, authLoading, cacheKey]);

  return { data, loading, error, reload, create, update, remove, removeAll };
}
