import { createClient } from '@supabase/supabase-js';

// Supabase details provided by user for Şirket IBAN & Hesap Noları
export const SIRKET_IBAN_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
export const SIRKET_IBAN_SUPABASE_URL = 'https://mgtunrfpzbyfnmeloeeq.supabase.co';
export const SIRKET_IBAN_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndHVucmZwemJ5Zm5tZWxvZWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDUwMjgsImV4cCI6MjEwNDcyMTAyOH0.HcdwZbO-oHXQxytE-G221_62irBwuv0-8e3P_ux4a7k';

export const sirketIbanSupabase = createClient(
  SIRKET_IBAN_SUPABASE_URL,
  SIRKET_IBAN_SUPABASE_ANON_KEY
);

export interface SirketHesapRecord {
  id: number;
  sirketunvani: string;
  vergino: string;
  bankaadi: string;
  ibanno: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all records from 'sirkethesapnolar' table.
 * Read-only table as requested by the user.
 */
export async function fetchSirketHesaplar(): Promise<{
  data: SirketHesapRecord[] | null;
  error: any;
}> {
  try {
    const { data, error } = await sirketIbanSupabase
      .from('sirkethesapnolar')
      .select('*')
      .order('id', { ascending: true });
    return { data, error };
  } catch (err: any) {
    console.error('sirkethesapnolar fetch hatası:', err);
    return { data: null, error: err };
  }
}
