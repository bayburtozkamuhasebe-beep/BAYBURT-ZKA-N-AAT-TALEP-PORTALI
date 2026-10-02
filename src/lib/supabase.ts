import { createClient } from '@supabase/supabase-js';
import { SiteConfig, TalepRecord } from '../types';

export const SUPABASE_URL = 'https://gboathwmaanqxuwsryud.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_XAJvSuJtLj6_b0HDWBUUCA_2M-2dDQ7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SiteColorTheme {
  nameColor: string;
  nameColorHover: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  cardBorderHover: string;
  btnBg: string;
  hex: string;
}

export const SITE_COLOR_MAP: Record<string, SiteColorTheme> = {
  arnavutkoy: {
    nameColor: 'text-sky-400',
    nameColorHover: 'group-hover:text-sky-300',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/40',
    badgeText: 'text-sky-300',
    dotColor: 'bg-sky-400',
    cardBorderHover: 'hover:border-sky-400',
    btnBg: 'from-sky-600 to-blue-700',
    hex: '#38bdf8',
  },
  mamak_ankara: {
    nameColor: 'text-emerald-400',
    nameColorHover: 'group-hover:text-emerald-300',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-300',
    dotColor: 'bg-emerald-400',
    cardBorderHover: 'hover:border-emerald-400',
    btnBg: 'from-emerald-600 to-teal-700',
    hex: '#34d399',
  },
  senbay_ozka: {
    nameColor: 'text-amber-400',
    nameColorHover: 'group-hover:text-amber-300',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-300',
    dotColor: 'bg-amber-400',
    cardBorderHover: 'hover:border-amber-400',
    btnBg: 'from-amber-600 to-yellow-700',
    hex: '#fbbf24',
  },
  merkez_ozka: {
    nameColor: 'text-purple-400',
    nameColorHover: 'group-hover:text-purple-300',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-300',
    dotColor: 'bg-purple-400',
    cardBorderHover: 'hover:border-purple-400',
    btnBg: 'from-purple-600 to-indigo-700',
    hex: '#c084fc',
  },
  msb_ozka: {
    nameColor: 'text-rose-400',
    nameColorHover: 'group-hover:text-rose-300',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-300',
    dotColor: 'bg-rose-400',
    cardBorderHover: 'hover:border-rose-400',
    btnBg: 'from-rose-600 to-pink-700',
    hex: '#fb7185',
  },
  seka: {
    nameColor: 'text-teal-300',
    nameColorHover: 'group-hover:text-teal-200',
    badgeBg: 'bg-teal-500/15',
    badgeBorder: 'border-teal-500/40',
    badgeText: 'text-teal-300',
    dotColor: 'bg-teal-400',
    cardBorderHover: 'hover:border-teal-400',
    btnBg: 'from-teal-600 to-emerald-700',
    hex: '#2dd4bf',
  },
  diger: {
    nameColor: 'text-orange-400',
    nameColorHover: 'group-hover:text-orange-300',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/40',
    badgeText: 'text-orange-300',
    dotColor: 'bg-orange-400',
    cardBorderHover: 'hover:border-orange-400',
    btnBg: 'from-orange-600 to-amber-700',
    hex: '#fb923c',
  },
};

export const getSiteColor = (siteId: string): SiteColorTheme => {
  return (
    SITE_COLOR_MAP[siteId] || {
      nameColor: 'text-sky-400',
      nameColorHover: 'group-hover:text-sky-300',
      badgeBg: 'bg-sky-500/15',
      badgeBorder: 'border-sky-500/40',
      badgeText: 'text-sky-300',
      dotColor: 'bg-sky-400',
      cardBorderHover: 'hover:border-sky-400',
      btnBg: 'from-sky-600 to-blue-700',
      hex: '#38bdf8',
    }
  );
};

export const SITES: SiteConfig[] = [
  {
    id: 'arnavutkoy',
    name: 'ARNAVUTKÖY',
    tableName: 'arnavutkoy_talep',
    code: 'ARN',
    badgeColor: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    nameColor: 'text-sky-400',
  },
  {
    id: 'mamak_ankara',
    name: 'MAMAK-ANKARA',
    tableName: 'mamak_talep',
    code: 'MMK',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    nameColor: 'text-emerald-400',
  },
  {
    id: 'senbay_ozka',
    name: 'ŞENBAY-ÖZKA',
    tableName: 'senbay_ozka_talep',
    code: 'SNB',
    badgeColor: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    nameColor: 'text-amber-400',
  },
  {
    id: 'merkez_ozka',
    name: 'MERKEZ ÖZKA',
    tableName: 'merkez_ozka_talep',
    code: 'MRK',
    badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    nameColor: 'text-purple-400',
  },
  {
    id: 'msb_ozka',
    name: 'MSB ÖZKA',
    tableName: 'msb_ozka_talep',
    code: 'MSB',
    badgeColor: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    nameColor: 'text-rose-400',
  },
  {
    id: 'seka',
    name: 'SEKA',
    tableName: 'seka_talep',
    code: 'SKA',
    badgeColor: 'border-teal-500/40 bg-teal-500/15 text-teal-300',
    nameColor: 'text-teal-300',
  },
  {
    id: 'diger',
    name: 'DİĞER',
    tableName: 'diger_talep',
    code: 'DGR',
    badgeColor: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    nameColor: 'text-orange-400',
  },
];

export const ODENENLER_SITES: SiteConfig[] = [
  {
    id: 'arnavutkoy',
    name: 'ARNAVUTKÖY',
    tableName: 'arnavutkoy_odenenler',
    code: 'ARN',
    badgeColor: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    nameColor: 'text-sky-400',
  },
  {
    id: 'mamak_ankara',
    name: 'MAMAK-ANKARA',
    tableName: 'mamak_odenenler',
    code: 'MMK',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    nameColor: 'text-emerald-400',
  },
  {
    id: 'senbay_ozka',
    name: 'ŞENBAY-ÖZKA',
    tableName: 'senbay_ozka_odenenler',
    code: 'SNB',
    badgeColor: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    nameColor: 'text-amber-400',
  },
  {
    id: 'merkez_ozka',
    name: 'MERKEZ ÖZKA',
    tableName: 'merkez_ozka_odenenler',
    code: 'MRK',
    badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    nameColor: 'text-purple-400',
  },
  {
    id: 'msb_ozka',
    name: 'MSB ÖZKA',
    tableName: 'msb_ozka_odenenler',
    code: 'MSB',
    badgeColor: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    nameColor: 'text-rose-400',
  },
  {
    id: 'seka',
    name: 'SEKA',
    tableName: 'seka_odenenler',
    code: 'SKA',
    badgeColor: 'border-teal-500/40 bg-teal-500/15 text-teal-300',
    nameColor: 'text-teal-300',
  },
  {
    id: 'diger',
    name: 'DİĞER',
    tableName: 'diger_odenenler',
    code: 'DGR',
    badgeColor: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    nameColor: 'text-orange-400',
  },
];

export async function fetchTalepRecords(tableName: string): Promise<{ data: TalepRecord[] | null; error: any }> {
  try {
    let targetTable = tableName;
    let { data, error } = await supabase
      .from(targetTable)
      .select('*')
      .order('id', { ascending: false });

    // Handle possible underscore variation for MSB odenenler
    if (error && (targetTable === 'msb_ozka_odenenler' || targetTable === 'msb__ozka_odenenler')) {
      const altTable = targetTable === 'msb_ozka_odenenler' ? 'msb__ozka_odenenler' : 'msb_ozka_odenenler';
      const altRes = await supabase.from(altTable).select('*').order('id', { ascending: false });
      if (!altRes.error) {
        return { data: altRes.data, error: null };
      }
    }

    if (error) {
      // Fallback try without ordering if 'id' doesn't exist
      const fallback = await supabase.from(targetTable).select('*');
      if (fallback.error && (targetTable === 'msb_ozka_odenenler' || targetTable === 'msb__ozka_odenenler')) {
        const altTable = targetTable === 'msb_ozka_odenenler' ? 'msb__ozka_odenenler' : 'msb_ozka_odenenler';
        const altFallback = await supabase.from(altTable).select('*');
        if (!altFallback.error) return { data: altFallback.data, error: null };
      }
      if (fallback.error) {
        return { data: null, error: fallback.error };
      }
      return { data: fallback.data, error: null };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function insertTalepRecord(
  tableName: string,
  formData: {
    firma_unvani: string;
    iban_no: string;
    aciklama: string;
    odenecek_tutar: number;
    talep_eden: string;
    durumu: string;
  }
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Primary column naming mapped to the Supabase database schema
    const payload: Record<string, any> = {
      firma_unvani: formData.firma_unvani.trim(),
      iban_no: formData.iban_no.trim(),
      aciklama: formData.aciklama.trim(),
      tutar: formData.odenecek_tutar,
      talep_eden: formData.talep_eden.trim(),
      durum: formData.durumu?.trim() || 'Beklemede',
    };

    const { data, error } = await supabase.from(tableName).insert([payload]).select();

    if (error) {
      console.warn(`Primary insert on ${tableName} returned error:`, error.message);
      
      // Fallback for tables with 'odenecek_tutar' and 'durumu' column variations
      const altPayload: Record<string, any> = {
        firma_unvani: formData.firma_unvani.trim(),
        iban_no: formData.iban_no.trim(),
        aciklama: formData.aciklama.trim(),
        odenecek_tutar: formData.odenecek_tutar,
        talep_eden: formData.talep_eden.trim(),
        durumu: formData.durumu?.trim() || 'Beklemede',
      };

      const fallback = await supabase.from(tableName).insert([altPayload]).select();
      if (fallback.error) {
        return { success: false, error: fallback.error };
      }
      return { success: true, data: fallback.data };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

export async function updateTalepFullRecord(
  tableName: string,
  id: string | number,
  formData: {
    firma_unvani: string;
    iban_no: string;
    aciklama: string;
    odenecek_tutar: number;
    talep_eden: string;
    durumu: string;
    cari_bakiye?: number | string | null;
  }
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const primaryPayload: Record<string, any> = {
      firma_unvani: formData.firma_unvani.trim(),
      iban_no: formData.iban_no.trim(),
      aciklama: formData.aciklama.trim(),
      tutar: formData.odenecek_tutar,
      talep_eden: formData.talep_eden.trim(),
      durum: formData.durumu?.trim() || 'Beklemede',
    };

    if (formData.cari_bakiye !== undefined) {
      primaryPayload.cari_bakiye = formData.cari_bakiye;
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(primaryPayload)
      .eq('id', id)
      .select();

    if (error) {
      console.warn(`Primary update on ${tableName} failed:`, error.message);
      // Fallback with alternate column names if table uses odenecek_tutar / durumu
      const altPayload: Record<string, any> = {
        firma_unvani: formData.firma_unvani.trim(),
        iban_no: formData.iban_no.trim(),
        aciklama: formData.aciklama.trim(),
        odenecek_tutar: formData.odenecek_tutar,
        talep_eden: formData.talep_eden.trim(),
        durumu: formData.durumu?.trim() || 'Beklemede',
      };

      if (formData.cari_bakiye !== undefined) {
        altPayload.cari_bakiye = formData.cari_bakiye;
      }

      const fallback = await supabase
        .from(tableName)
        .update(altPayload)
        .eq('id', id)
        .select();

      if (fallback.error) {
        return { success: false, error: fallback.error };
      }
      return { success: true, data: fallback.data };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err };
  }
}

export async function deleteTalepRecord(tableName: string, id: string | number): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) return { success: false, error };
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

export async function updateTalepStatus(
  tableName: string,
  id: string | number,
  newStatus: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // Try updating 'durum' first (primary column in Supabase)
    const { error } = await supabase
      .from(tableName)
      .update({ durum: newStatus })
      .eq('id', id);

    if (error) {
      // Fallback try 'durumu' column
      const fallback = await supabase
        .from(tableName)
        .update({ durumu: newStatus })
        .eq('id', id);
      if (fallback.error) return { success: false, error: fallback.error };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
}

export interface CariTransaction extends TalepRecord {
  siteName: string;
  sourceType: 'aktif_talep' | 'gecmis_odeme';
  tableName: string;
}

export async function fetchAllCariRecords(firmaQuery?: string): Promise<CariTransaction[]> {
  const allTables = [
    ...SITES.map((s) => ({ site: s, type: 'aktif_talep' as const })),
    ...ODENENLER_SITES.map((s) => ({ site: s, type: 'gecmis_odeme' as const })),
  ];

  const results = await Promise.allSettled(
    allTables.map(async ({ site, type }) => {
      const { data } = await fetchTalepRecords(site.tableName);
      if (!data) return [];
      return data.map((rec) => ({
        ...rec,
        siteName: site.name,
        sourceType: type,
        tableName: site.tableName,
      }));
    })
  );

  const flatList: CariTransaction[] = [];
  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      flatList.push(...res.value);
    }
  });

  if (!firmaQuery || !firmaQuery.trim()) {
    return flatList;
  }

  const queryNormalized = firmaQuery
    .toLocaleLowerCase('tr-TR')
    .replace(/[.,\-_/\s]+/g, ' ')
    .trim();

  return flatList.filter((item) => {
    const firma = (item.firma_unvani || item.firma_adi || item.firma || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[.,\-_/\s]+/g, ' ')
      .trim();
    return firma.includes(queryNormalized);
  });
}

export interface OdenenlerTableDefinition {
  tableName: string;
  tableLabel: string;
  siteName: string;
  siteCode: string;
  dashboardUrl: string;
  badgeColor: string;
}

export const ODENENLER_PRIORITY_TABLES: OdenenlerTableDefinition[] = [
  {
    tableName: 'arnavutkoy_odenenler',
    tableLabel: 'Arnavutköy Ödenenler',
    siteName: 'ARNAVUTKÖY',
    siteCode: 'ARN',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18194?schema=public/arnavutkoy_odenenler',
    badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  },
  {
    tableName: 'mamak_odenenler',
    tableLabel: 'Mamak Ödenenler',
    siteName: 'MAMAK-ANKARA',
    siteCode: 'MMK',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18194?schema=public/mamak_odenenler',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  {
    tableName: 'senbay_ozka_odenenler',
    tableLabel: 'Şenbay-Özka Ödenenler',
    siteName: 'ŞENBAY-ÖZKA',
    siteCode: 'SNB',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18194?schema=public/senbay_ozka_odenenler',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  },
  {
    tableName: 'merkez_ozka_odenenler',
    tableLabel: 'Merkez Özka Ödenenler',
    siteName: 'MERKEZ ÖZKA',
    siteCode: 'MRK',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18194?schema=public/merkez_ozka_odenenler',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  {
    tableName: 'msb_ozka_odenenler',
    tableLabel: 'MSB Özka Ödenenler',
    siteName: 'MSB ÖZKA',
    siteCode: 'MSB',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/editor/18194?schema=public/msb_ozka_odenenler',
    badgeColor: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  },
];

export interface FirmaOdenenlerMatch {
  record: TalepRecord;
  table: OdenenlerTableDefinition;
  firma_unvani: string;
  iban_no: string;
  tutar?: number | string;
  created_at?: string;
  aciklama?: string;
  matchIndex: number;
}

export interface FirmaOdenenlerSearchResult {
  searchedQuery: string;
  firstMatch: FirmaOdenenlerMatch | null;
  allMatchesByTable: Array<{
    table: OdenenlerTableDefinition;
    matches: TalepRecord[];
    primaryIban: string;
    primaryFirma: string;
    recordCount: number;
  }>;
  totalMatchCount: number;
}

export function normalizeTurkishText(str: string): string {
  return (str || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kullanıcının girdiği Firma Ünvanını 5 öncelikli ödenenler tablosunda sırasıyla sorgular.
 * Sıra:
 * 1. arnavutkoy_odenenler
 * 2. mamak_odenenler
 * 3. senbay_ozka_odenenler
 * 4. merkez_ozka_odenenler
 * 5. msb_ozka_odenenler
 *
 * İlk bulduğu tablodaki eşleşen firma ünvanı ve İBAN numarasını 'firstMatch' olarak döner.
 */
export async function searchFirmaInOdenenlerTables(
  firmaQuery: string
): Promise<FirmaOdenenlerSearchResult> {
  const normQuery = normalizeTurkishText(firmaQuery);

  if (!normQuery || normQuery.length < 2) {
    return {
      searchedQuery: firmaQuery,
      firstMatch: null,
      allMatchesByTable: [],
      totalMatchCount: 0,
    };
  }

  const queryWords = normQuery.split(' ').filter((w) => w.length >= 2);
  let firstMatch: FirmaOdenenlerMatch | null = null;
  const allMatchesByTable: FirmaOdenenlerSearchResult['allMatchesByTable'] = [];
  let totalMatchCount = 0;

  // 5 Tabloyu sırayla tara (Order: Arnavutköy -> Mamak -> Şenbay -> Merkez -> MSB)
  for (let i = 0; i < ODENENLER_PRIORITY_TABLES.length; i++) {
    const tableDef = ODENENLER_PRIORITY_TABLES[i];
    const { data } = await fetchTalepRecords(tableDef.tableName);

    if (!data || data.length === 0) continue;

    const matchedRecords = data.filter((row) => {
      const fNorm = normalizeTurkishText(row.firma_unvani || row.firma_adi || row.firma || '');
      if (!fNorm) return false;

      // Tam eşitlik
      if (fNorm === normQuery) return true;

      // Alt dize / içerik kontrolü
      if (normQuery.length >= 3 && (fNorm.includes(normQuery) || normQuery.includes(fNorm))) {
        return true;
      }

      // Kelime bazlı kontrol (örn: 'HARUN RESIT' için 'HARUN RESIT DONMEZ')
      if (queryWords.length > 1 && queryWords.every((w) => fNorm.includes(w))) {
        return true;
      }

      return false;
    });

    if (matchedRecords.length > 0) {
      totalMatchCount += matchedRecords.length;

      // İBAN'ı dolu olan ilk veya en güncel kaydı seç
      const bestRecord =
        matchedRecords.find((r) => r.iban_no && r.iban_no.trim().length > 5) || matchedRecords[0];

      const cleanIban = (bestRecord.iban_no || bestRecord.iban || '').trim();
      const firmaName = (bestRecord.firma_unvani || bestRecord.firma_adi || bestRecord.firma || '').trim();

      const tableMatchInfo = {
        table: tableDef,
        matches: matchedRecords,
        primaryIban: cleanIban,
        primaryFirma: firmaName,
        recordCount: matchedRecords.length,
      };

      allMatchesByTable.push(tableMatchInfo);

      // Eğer henüz ilk eşleşme atanmadıysa ve bu tabloda İBAN'lı kayıt varsa, İLK BULUNAN olarak ata
      if (!firstMatch && cleanIban.length > 0) {
        firstMatch = {
          record: bestRecord,
          table: tableDef,
          firma_unvani: firmaName,
          iban_no: cleanIban,
          tutar:
            typeof bestRecord.odenecek_tutar === 'number'
              ? bestRecord.odenecek_tutar
              : bestRecord.tutar,
          created_at: bestRecord.odeme_tarihi || bestRecord.created_at,
          aciklama: bestRecord.aciklama,
          matchIndex: i + 1,
        };
      }
    }
  }

  // Eğer İBAN'lı bulunamadıysa ama herhangi bir eşleşme varsa ilk eşleşmeyi ata
  if (!firstMatch && allMatchesByTable.length > 0) {
    const firstTab = allMatchesByTable[0];
    const rec = firstTab.matches[0];
    firstMatch = {
      record: rec,
      table: firstTab.table,
      firma_unvani: firstTab.primaryFirma,
      iban_no: firstTab.primaryIban,
      tutar: typeof rec.odenecek_tutar === 'number' ? rec.odenecek_tutar : rec.tutar,
      created_at: rec.odeme_tarihi || rec.created_at,
      aciklama: rec.aciklama,
      matchIndex: 1,
    };
  }

  return {
    searchedQuery: firmaQuery,
    firstMatch,
    allMatchesByTable,
    totalMatchCount,
  };
}

export function getOdenenlerTableForSite(site?: SiteConfig): OdenenlerTableDefinition {
  if (!site) return ODENENLER_PRIORITY_TABLES[0];
  const targetId = (site.id || '').toLowerCase();
  const targetName = (site.name || '').toLowerCase();
  const targetTable = (site.tableName || '').toLowerCase();

  const found = ODENENLER_PRIORITY_TABLES.find((t) => {
    const tName = t.tableName.toLowerCase();
    const sName = t.siteName.toLowerCase();
    return (
      tName === targetTable ||
      tName === targetTable.replace('_talep', '_odenenler') ||
      tName.replace('_odenenler', '') === targetId ||
      sName === targetName ||
      targetName.includes(sName) ||
      sName.includes(targetName)
    );
  });

  return found || ODENENLER_PRIORITY_TABLES[0];
}

export interface SiteMuavinConfig {
  siteId: string;
  siteName: string;
  bucket: string;
  folder: string;
  dashboardUrl: string;
  fallbackFile?: string;
}

export const MUAVIN_SITE_MAPPINGS: Record<string, SiteMuavinConfig> = {
  arnavutkoy: {
    siteId: 'arnavutkoy',
    siteName: 'ARNAVUTKÖY',
    bucket: 'MUAVINLER',
    folder: 'ARNAVUTKOY',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/ARNAVUTKOY',
    fallbackFile: 'arnavutkoymuavin.pdf',
  },
  mamak_ankara: {
    siteId: 'mamak_ankara',
    siteName: 'MAMAK-ANKARA',
    bucket: 'MUAVINLER',
    folder: 'MAMAK',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/MAMAK',
    fallbackFile: 'mamakmuavin.pdf',
  },
  senbay_ozka: {
    siteId: 'senbay_ozka',
    siteName: 'ŞENBAY-ÖZKA',
    bucket: 'MUAVINLER',
    folder: 'SENBAY',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/SENBAY',
    fallbackFile: 'bursamuavin.pdf',
  },
  merkez_ozka: {
    siteId: 'merkez_ozka',
    siteName: 'MERKEZ ÖZKA',
    bucket: 'MUAVINLER',
    folder: 'OZKA',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/OZKA',
    fallbackFile: 'ozkamuavin.pdf',
  },
  msb_ozka: {
    siteId: 'msb_ozka',
    siteName: 'MSB ÖZKA',
    bucket: 'MUAVINLER',
    folder: 'MSB',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/MSB',
  },
  seka: {
    siteId: 'seka',
    siteName: 'SEKA',
    bucket: 'MUAVINLER',
    folder: 'SEKA',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/SEKA',
  },
  diger: {
    siteId: 'diger',
    siteName: 'DİĞER',
    bucket: 'MUAVINLER',
    folder: 'DİGER',
    dashboardUrl: 'https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/DİGER',
  },
};

export async function getMuavinPdfInfo(siteId: string): Promise<{
  url: string | null;
  fileName: string | null;
  folder: string;
  bucket: string;
  error?: string;
}> {
  const mapping = MUAVIN_SITE_MAPPINGS[siteId] || MUAVIN_SITE_MAPPINGS['arnavutkoy'];
  const { bucket, folder } = mapping;

  try {
    // 1. Try listing folder in MUAVINLER
    let { data: files } = await supabase.storage.from(bucket).list(folder);

    // If folder was DİGER and nothing found, also try ASCII 'DIGER'
    if ((!files || files.length === 0) && (folder === 'DİGER' || folder === 'DIGER')) {
      const altFolder = folder === 'DİGER' ? 'DIGER' : 'DİGER';
      const altRes = await supabase.storage.from(bucket).list(altFolder);
      if (altRes.data && altRes.data.length > 0) {
        files = altRes.data;
      }
    }

    // Filter for .pdf files
    const pdfFiles = files?.filter((f) => f.name.toLowerCase().endsWith('.pdf')) || [];

    if (pdfFiles.length > 0) {
      const chosenFile = pdfFiles[0];
      const { data: pubData } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${folder}/${chosenFile.name}`);
      return {
        url: pubData.publicUrl,
        fileName: chosenFile.name,
        folder,
        bucket,
      };
    }

    // If fallbackFile is configured and known
    if (mapping.fallbackFile) {
      const { data: pubData } = supabase.storage
        .from(bucket)
        .getPublicUrl(`${folder}/${mapping.fallbackFile}`);
      return {
        url: pubData.publicUrl,
        fileName: mapping.fallbackFile,
        folder,
        bucket,
      };
    }

    return {
      url: null,
      fileName: null,
      folder,
      bucket,
      error: `MUAVINLER/${folder} klasöründe PDF dosyası bulunamadı.`,
    };
  } catch (err: any) {
    return {
      url: null,
      fileName: null,
      folder,
      bucket,
      error: err.message || 'Storage bağlantı hatası',
    };
  }
}

// -------------------------------------------------------------
// FATURA STORAGE & FILE UPLOAD ENTEGRASYONU (Supabase mgtunrfpzbyfnmeloeeq)
// -------------------------------------------------------------
export const FATURA_STORAGE_PROJECT_ID = 'mgtunrfpzbyfnmeloeeq';
export const FATURA_SUPABASE_URL = 'https://mgtunrfpzbyfnmeloeeq.supabase.co';
export const FATURA_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndHVucmZwemJ5Zm5tZWxvZWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNDUwMjgsImV4cCI6MjEwNDcyMTAyOH0.HcdwZbO-oHXQxytE-G221_62irBwuv0-8e3P_ux4a7k';
export const FATURA_STORAGE_BUCKET = 'CARIFATURALAR';

export const faturaSupabase = createClient(FATURA_SUPABASE_URL, FATURA_SUPABASE_ANON_KEY);

/**
 * Türkçe karakterleri (İ, Ş, Ç, Ğ, Ü, Ö, ı vb.) birebir İngilizce ASCII karakterlerine dönüştürür.
 */
export function turkishToEnglish(text: string): string {
  if (!text) return '';
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'I', 'I': 'I',
    'i': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
    'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I',
    'û': 'u', 'Û': 'U',
  };
  return text.replace(/[çÇğĞıIiİöÖşŞüÜâÂîÎûÛ]/g, (match) => charMap[match] || match);
}

/**
 * Firma ünvanını dosya adı için temizler ve büyük harfli İngilizce karaktere çevirir.
 */
export function sanitizeFirmaFileName(firmaUnvani: string): string {
  const converted = turkishToEnglish(firmaUnvani || 'FATURA').trim();
  // Geçersiz dosya adı karakterlerini kaldır (/ \ : * ? " < > | # % & { } $ ! @ + = ` ')
  const cleaned = converted.replace(/[/\\:*?"<>|#%&{}$!@+=`']/g, '');
  // Fazla boşlukları tek boşluğa indir
  const normalized = cleaned.replace(/\s+/g, ' ').trim();
  return normalized.toUpperCase() || 'FATURA';
}

/**
 * Şantiyelerin Supabase Storage içindeki hedef klasör eşleştirmesi
 */
export const SITE_FATURA_STORAGE_FOLDERS: Record<string, string> = {
  arnavutkoy: '',
  mamak_ankara: '',
  senbay_ozka: '',
  merkez_ozka: '',
  msb_ozka: '',
  seka: '',
  diger: '',
};

/**
 * CARIFATURALAR bucket'ında aynı isimde dosya olup olmadığını kontrol eder.
 * Varsa sonuna 1, 2, 3... ekleyerek benzersiz bir dosya adı üretir.
 */
export async function resolveNextFaturaFileName(
  folder: string,
  firmaUnvani: string,
  originalFileNameOrExt: string,
  bucketName: string = FATURA_STORAGE_BUCKET
): Promise<{ resolvedFileName: string; hasDuplicate: boolean; sequenceNumber: number | null }> {
  // Uzantıyı belirle (örn: .pdf, .jpg, .png)
  let ext = '';
  const lastDot = originalFileNameOrExt.lastIndexOf('.');
  if (lastDot !== -1) {
    ext = originalFileNameOrExt.substring(lastDot).toLowerCase();
  } else if (originalFileNameOrExt.startsWith('.')) {
    ext = originalFileNameOrExt.toLowerCase();
  } else {
    ext = originalFileNameOrExt ? `.${originalFileNameOrExt.toLowerCase()}` : '.pdf';
  }

  const baseName = sanitizeFirmaFileName(firmaUnvani);

  try {
    // CARIFATURALAR bucket'ında listele
    const { data: files } = await faturaSupabase.storage
      .from(bucketName)
      .list(folder || '', { limit: 500 });

    if (!files) {
      return { resolvedFileName: `${baseName}${ext}`, hasDuplicate: false, sequenceNumber: null };
    }

    const existingNames = new Set(files.map((f) => f.name.toLowerCase()));

    const directName = `${baseName}${ext}`;
    if (!existingNames.has(directName.toLowerCase())) {
      return { resolvedFileName: directName, hasDuplicate: false, sequenceNumber: null };
    }

    // Aynı isimde dosya var, sonuna 1, 2, 3... ekle
    let counter = 1;
    while (counter < 1000) {
      const candidateSpace = `${baseName} ${counter}${ext}`;
      const candidateUnderscore = `${baseName}_${counter}${ext}`;

      if (
        !existingNames.has(candidateSpace.toLowerCase()) &&
        !existingNames.has(candidateUnderscore.toLowerCase())
      ) {
        return {
          resolvedFileName: candidateSpace,
          hasDuplicate: true,
          sequenceNumber: counter,
        };
      }
      counter++;
    }

    return { resolvedFileName: `${baseName} ${counter}${ext}`, hasDuplicate: true, sequenceNumber: counter };
  } catch (err) {
    console.error('resolveNextFaturaFileName error:', err);
    return { resolvedFileName: `${baseName}${ext}`, hasDuplicate: false, sequenceNumber: null };
  }
}

export const CARIFATURALAR_RLS_SQL = `-- CARIFATURALAR bucket için dosya yükleme (INSERT) ve okuma (SELECT) izinleri
CREATE POLICY "CARIFATURALAR_anon_insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'CARIFATURALAR');

CREATE POLICY "CARIFATURALAR_anon_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'CARIFATURALAR');

CREATE POLICY "CARIFATURALAR_anon_update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'CARIFATURALAR');`;

/**
 * Bucket yükleme iznini (RLS) anlık olarak kontrol eder
 */
export async function testBucketUpload(bucketName: string = FATURA_STORAGE_BUCKET): Promise<{
  ok: boolean;
  error?: string;
  isRlsError?: boolean;
}> {
  try {
    const testPath = `.probe_${Date.now()}.txt`;
    const { error } = await faturaSupabase.storage
      .from(bucketName)
      .upload(testPath, new Blob(['probe']), { upsert: true });

    if (!error) {
      await faturaSupabase.storage.from(bucketName).remove([testPath]);
      return { ok: true };
    }

    const isRls =
      error.message?.toLowerCase().includes('row-level security') ||
      (error as any)?.statusCode === '403' ||
      (error as any)?.code === 'AccessDenied';

    return {
      ok: false,
      isRlsError: !!isRls,
      error: error.message,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

/**
 * Fatura dosyasını Supabase Storage CARIFATURALAR bucket'ına yükler.
 */
export async function uploadFaturaFile(
  file: File,
  folder: string,
  targetFileName: string,
  targetBucket: string = FATURA_STORAGE_BUCKET
): Promise<{
  success: boolean;
  fileName: string;
  fullPath: string;
  publicUrl: string;
  bucket: string;
  isRlsError?: boolean;
  error?: string;
}> {
  const cleanPath = folder ? `${folder.replace(/\/$/, '')}/${targetFileName}` : targetFileName;

  try {
    const { data, error } = await faturaSupabase.storage
      .from(targetBucket)
      .upload(cleanPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (!error && data) {
      const { data: pubData } = faturaSupabase.storage
        .from(targetBucket)
        .getPublicUrl(cleanPath);

      return {
        success: true,
        fileName: targetFileName,
        fullPath: data.fullPath || `${targetBucket}/${cleanPath}`,
        publicUrl: pubData.publicUrl,
        bucket: targetBucket,
      };
    }

    const isRls =
      error &&
      (error.message?.toLowerCase().includes('row-level security') ||
        (error as any)?.statusCode === '403' ||
        (error as any)?.code === 'AccessDenied');

    return {
      success: false,
      fileName: targetFileName,
      fullPath: cleanPath,
      publicUrl: '',
      bucket: targetBucket,
      isRlsError: !!isRls,
      error: isRls
        ? `Supabase RLS Hatası: '${targetBucket}' bucket'ında anonim yükleme (INSERT) izni henüz tanımlanmamış. Lütfen Supabase SQL Editöründe gerekli policy'yi çalıştırın.`
        : error?.message || 'Yükleme başarısız oldu.',
    };
  } catch (err: any) {
    return {
      success: false,
      fileName: targetFileName,
      fullPath: cleanPath,
      publicUrl: '',
      bucket: targetBucket,
      error: err?.message || 'Beklenmeyen bir hata oluştu.',
    };
  }
}

// -------------------------------------------------------------
// TALEP DOSYA VE FATURA EŞLEŞTİRME YÖNETİMİ
// -------------------------------------------------------------
const TALEP_FILES_STORAGE_KEY = 'ozka_talep_fatura_files_map';

export interface TalepFileInfo {
  dosyaAdi: string;
  dosyaUrl: string;
  fullPath?: string;
  bucket?: string;
  uploadedAt?: string;
}

/**
 * Kaydedilmiş dosya / fatura eşleştirmelerini yerel depolamadan döner
 */
export function getSavedTalepFiles(): Record<string, TalepFileInfo> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(TALEP_FILES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Bir talep kaydına ait yüklenen CARIFATURALAR dosyasını eşleştirir
 */
export function saveTalepFileMapping(
  tableName: string,
  recordId: string | number,
  dosyaAdi: string,
  dosyaUrl: string,
  fullPath?: string
) {
  try {
    if (typeof window === 'undefined' || !recordId) return;
    const current = getSavedTalepFiles();
    const info: TalepFileInfo = {
      dosyaAdi,
      dosyaUrl,
      fullPath: fullPath || `CARIFATURALAR/${dosyaAdi}`,
      bucket: FATURA_STORAGE_BUCKET,
      uploadedAt: new Date().toISOString(),
    };
    // Hem tabloAdı_id hem de direkt id olarak kaydet
    current[`${tableName}_${recordId}`] = info;
    current[`${recordId}`] = info;
    localStorage.setItem(TALEP_FILES_STORAGE_KEY, JSON.stringify(current));
    invalidateCariFaturalarCache();
  } catch (err) {
    console.error('saveTalepFileMapping error:', err);
  }
}

/**
 * Belirli bir talep kaydına ait bayat/hatalı dosya eşleştirmesini siler
 */
export function deleteTalepFileMapping(recordId: string | number, tableName?: string) {
  try {
    if (typeof window === 'undefined' || !recordId) return;
    const current = getSavedTalepFiles();
    let changed = false;

    const idStr = String(recordId);
    if (current[idStr]) {
      delete current[idStr];
      changed = true;
    }
    if (tableName && current[`${tableName}_${recordId}`]) {
      delete current[`${tableName}_${recordId}`];
      changed = true;
    }
    // Tüm anahtarları tara ve recordId ile eşleşenleri sil
    Object.keys(current).forEach((k) => {
      if (k === idStr || k.endsWith(`_${idStr}`)) {
        delete current[k];
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(TALEP_FILES_STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.error('deleteTalepFileMapping error:', err);
  }
}

/**
 * Storage bucket'ında GERÇEKTE BULUNMAYAN tüm sahte/bayat yerel eşleştirmeleri temizler
 */
export function pruneStaleTalepFiles(validFiles: Array<{ name: string }>) {
  try {
    if (typeof window === 'undefined') return;
    const current = getSavedTalepFiles();
    const validNames = new Set(validFiles.map((f) => f.name.toLowerCase().trim()));
    let changed = false;

    Object.keys(current).forEach((key) => {
      const item = current[key];
      if (!item || !item.dosyaAdi || !validNames.has(item.dosyaAdi.toLowerCase().trim())) {
        delete current[key];
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(TALEP_FILES_STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.error('pruneStaleTalepFiles error:', err);
  }
}

// -------------------------------------------------------------
// CARIFATURALAR STORAGE BUCKET DOSYA LİSTESİ VE VARLIK KONTROLÜ
// -------------------------------------------------------------
// CARIFATURALAR STORAGE BUCKET DOSYA LİSTESİ VE VARLIK KONTROLÜ
// -------------------------------------------------------------
export interface CariFaturalarFileItem {
  name: string;
  fullPath: string;
  bucket: string;
  publicUrl: string;
}

let cachedCariFaturalarFiles: Array<CariFaturalarFileItem> | null = null;
let lastCariFaturalarFetchTime = 0;
const CACHE_TTL_MS = 8000; // 8 saniye önbellek

/**
 * CARIFATURALAR dosya önbelleğini sıfırlar
 */
export function invalidateCariFaturalarCache() {
  cachedCariFaturalarFiles = null;
  lastCariFaturalarFetchTime = 0;
}

/**
 * Supabase CARIFATURALAR bucket'ındaki ve DOSYALAR/CARIFATURALAR altındaki tüm dosyaları listeler
 */
export async function getCariFaturalarFileList(
  forceRefresh: boolean = false
): Promise<Array<CariFaturalarFileItem>> {
  const now = Date.now();
  if (!forceRefresh && cachedCariFaturalarFiles && now - lastCariFaturalarFetchTime < CACHE_TTL_MS) {
    return cachedCariFaturalarFiles;
  }

  try {
    const allFiles: Array<CariFaturalarFileItem> = [];
    const seenNames = new Set<string>();

    const addFile = (name: string, folderOrSub: string, bucketName: string) => {
      if (!name || name.startsWith('.probe') || name === '.emptyFolderPlaceholder') return;
      const lower = name.toLowerCase().trim();
      if (seenNames.has(lower)) return;
      seenNames.add(lower);

      const filePath = folderOrSub ? `${folderOrSub}/${name}` : name;
      const { data: pubData } = faturaSupabase.storage.from(bucketName).getPublicUrl(filePath);

      allFiles.push({
        name,
        fullPath: `${bucketName}/${filePath}`,
        bucket: bucketName,
        publicUrl: pubData?.publicUrl || '',
      });
    };

    // 1. CARIFATURALAR bucket (Kök dizin ve alt klasörler)
    try {
      const { data: rootItems, error: rErr } = await faturaSupabase.storage
        .from('CARIFATURALAR')
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

      if (!rErr && rootItems) {
        for (const item of rootItems) {
          if (!item.name || item.name.startsWith('.probe') || item.name === '.emptyFolderPlaceholder') continue;
          if (item.id || (item.metadata && Object.keys(item.metadata).length > 0) || item.name.includes('.')) {
            addFile(item.name, '', 'CARIFATURALAR');
          } else {
            // Alt klasör olabilir
            try {
              const { data: subItems } = await faturaSupabase.storage
                .from('CARIFATURALAR')
                .list(item.name, { limit: 500 });
              if (subItems) {
                for (const sub of subItems) {
                  addFile(sub.name, item.name, 'CARIFATURALAR');
                }
              }
            } catch {
              // Alt klasör listeleme hatasını geç
            }
          }
        }
      }
    } catch (err) {
      console.warn('CARIFATURALAR bucket list warn:', err);
    }

    cachedCariFaturalarFiles = allFiles;
    lastCariFaturalarFetchTime = now;
    // Yerel depolamadaki sahte/silinmiş veya yüklenmemiş bayat kayıtları temizle
    pruneStaleTalepFiles(allFiles);
    return allFiles;
  } catch (err) {
    console.error('getCariFaturalarFileList error:', err);
    return cachedCariFaturalarFiles || [];
  }
}

export interface FirmaEvrakCheckResult {
  exists: boolean;
  matchedFileName?: string;
  matchedFileUrl?: string;
  matchStage?: 'exact' | 'first20' | 'first15' | 'first10' | 'first5' | 'token' | 'saved';
  confidence: number;
}

/**
 * Firma Ünvanına göre CARIFATURALAR bucket'ında evrak olup olmadığını kontrol eder.
 * Kullanıcı Talebi Gereksinimi:
 * 1. Önce firmanın TAM ÜNVANIYLA ara
 * 2. Bulunamazsa sırasıyla 20, 15, 10, 5 KARAKTERLE arama yap.
 * Evrak varsa Yeşil, yoksa Kırmızı/Farklı renkte buton gösterilir.
 * DİKKAT: Storage bucket'ında (CARIFATURALAR) GERÇEKTE BULUNMAYAN hiçbir dosya için "var" (Yeşil) denilmez!
 */
export function isFirmaEvrakExisting(
  firmaUnvani: string,
  fileList: Array<{ name: string; publicUrl?: string }>,
  recordId?: string | number,
  recordData?: any
): FirmaEvrakCheckResult {
  if (!firmaUnvani || !firmaUnvani.trim()) {
    return { exists: false, confidence: 0 };
  }

  // Storage'dan dosya listesi henüz yüklenmediyse veya bucket boşsa KESİNLİKLE "evrak var" deme!
  if (!fileList || fileList.length === 0) {
    return { exists: false, confidence: 0 };
  }

  // Türkçe ve Unicode normalizasyonu (birleşik diakritikleri siler)
  const normalize = (text: string): string => {
    return (text || '')
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'I')
      .replace(/i/g, 'I')
      .replace(/ğ/g, 'G').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'U').replace(/Ü/g, 'U')
      .replace(/ş/g, 'S').replace(/Ş/g, 'S')
      .replace(/ö/g, 'O').replace(/Ö/g, 'O')
      .replace(/ç/g, 'C').replace(/Ç/g, 'C')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 0. Aday dosya kontrolü: Eğer kayıtta veya yerelde bir fatura dosya adı / url varsa,
  // bunun GERÇEKTEN storage fileList listesinde bulunup bulunmadığını DOĞRULA.
  // Storage'da bulunmayan sahte/silinmiş/oluşmamış dosyaları (örneğin SUMNULU 404 hatası) ASLA "var" sayma!
  const candidateNames: string[] = [];
  if (recordData?.fatura_dosya_adi) {
    candidateNames.push(recordData.fatura_dosya_adi);
  }
  if (recordData?.fatura_dosya_url) {
    try {
      const decoded = decodeURIComponent(recordData.fatura_dosya_url);
      const urlFileName = decoded.split('/').pop()?.split('?')[0];
      if (urlFileName) candidateNames.push(urlFileName);
    } catch {}
  }
  if (recordId) {
    const saved = getSavedTalepFiles();
    const hit =
      saved[String(recordId)] ||
      (recordData?.tableName ? saved[`${recordData.tableName}_${recordId}`] : undefined);
    if (hit?.dosyaAdi) candidateNames.push(hit.dosyaAdi);
  }

  // Aday dosyalardan en az biri GERÇEK storage fileList içinde var mı ve bu firmaya ait mi?
  for (const cand of candidateNames) {
    if (!cand || cand === 'Fatura Dosyası' || cand === 'Fatura') continue;
    const candNorm = normalize(cand);
    const matched = fileList.find((f) => {
      if (f.name.toLowerCase() === cand.toLowerCase()) return true;
      if (normalize(f.name) === candNorm) return true;
      return false;
    });
    // Bulunan dosyanın aynı zamanda aranan firmaya ait olduğunu (TAM ADDA) doğrula
    if (matched && isExactFullFirmaMatch(firmaUnvani, matched.name)) {
      return {
        exists: true,
        matchedFileName: matched.name,
        matchedFileUrl: matched.publicUrl,
        matchStage: 'saved',
        confidence: 100,
      };
    }
  }

  // Eğer candidateNames listesinde dosya vardı fakat hiçbiri storage'da yoksa veya firmaya uymuyorsa,
  // bayat yerel kaydı temizle!
  if (recordId && candidateNames.length > 0) {
    deleteTalepFileMapping(recordId, recordData?.tableName);
  }

  // =========================================================================
  // CARIFATURALAR STORAGE BUCKET: CARİ/FİRMA ÜNVANI İLE TAM ADDA ARAMA
  // Kullanıcı Talebi: "CARİ/FİRMA ÜNVANI ADINDA EVRAK VARSA TAM ADDA OLACAK GÖSTER"
  // Sadece firmanın tam ünvanı ile eşleşen evraklar kabul edilir.
  // =========================================================================
  for (const file of fileList) {
    if (!file || !file.name || file.name.startsWith('.')) continue;
    if (isExactFullFirmaMatch(firmaUnvani, file.name)) {
      return {
        exists: true,
        matchedFileName: file.name,
        matchedFileUrl: file.publicUrl,
        matchStage: 'exact',
        confidence: 100,
      };
    }
  }

  return { exists: false, confidence: 0 };
}

/**
 * Türkçe ve kurumsal ünvan eşitlemeli TAM AD karşılaştırması.
 * Kullanıcı Gereksinimi: "CARİ/FİRMA ÜNVANI ADINDA EVRAK VARSA TAM ADDA OLACAK GÖSTER"
 * Dosya adı ile firma ünvanının tam olarak eşleştiğini doğrular.
 */
export function isExactFullFirmaMatch(firmaUnvani: string, rawFileName: string): boolean {
  if (!firmaUnvani || !rawFileName) return false;

  // Dosya uzantısını ve sıra numarasını temizle (ör: .pdf, " 3.pdf", "_1.pdf", "-2.pdf")
  const extIdx = rawFileName.lastIndexOf('.');
  const nameWithoutExt = extIdx !== -1 ? rawFileName.substring(0, extIdx) : rawFileName;
  const baseName = nameWithoutExt.replace(/[\s_-]+\d+$/, '').trim();

  const normalize = (text: string): string => {
    return (text || '')
      .replace(/İ/g, 'I')
      .replace(/ı/g, 'I')
      .replace(/i/g, 'I')
      .replace(/ğ/g, 'G').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'U').replace(/Ü/g, 'U')
      .replace(/ş/g, 'S').replace(/Ş/g, 'S')
      .replace(/ö/g, 'O').replace(/Ö/g, 'O')
      .replace(/ç/g, 'C').replace(/Ç/g, 'C')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const canonicalize = (text: string): string => {
    return normalize(text)
      .replace(/\b(SANAYI|SANAYII)\b/g, 'SAN')
      .replace(/\b(TICARET|TICARETI)\b/g, 'TIC')
      .replace(/\b(LIMITED|LTDSTI)\b/g, 'LTD')
      .replace(/\b(SIRKETI|SIRKETLERI)\b/g, 'STI')
      .replace(/\b(ANONIM)\b/g, 'AS')
      .replace(/\b(INSAAT|INSAATI)\b/g, 'INS')
      .replace(/\b(NAKLIYE|NAKLIYAT|NAKLIYECILIK)\b/g, 'NAK')
      .replace(/\b(MADENCILIK|MADEN)\b/g, 'MAD')
      .replace(/\b(HIZMETLERI|HIZMET)\b/g, 'HIZ')
      .replace(/\b(MUHENDISLIK)\b/g, 'MUH')
      .replace(/\b(FATURA|FATURASI|E-FATURA|EFATURA|IRSALIYE|DEKONT|MAKBUZ)\b/g, ' ')
      .replace(/\bVE\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const firmaNorm = normalize(firmaUnvani);
  const firmaCompact = firmaNorm.replace(/\s+/g, '');
  const fileNorm = normalize(baseName);
  const fileCompact = fileNorm.replace(/\s+/g, '');

  if (firmaCompact.length < 2 || fileCompact.length < 2) return false;

  // 1. Doğrudan tam normalize eşleşme
  if (firmaCompact === fileCompact || firmaNorm === fileNorm) return true;

  // 2. Kanonik (şirket türü kısaltmaları standartlaştırılmış) tam eşleşme
  const firmaCanon = canonicalize(firmaUnvani);
  const firmaCanonCompact = firmaCanon.replace(/\s+/g, '');
  const fileCanon = canonicalize(baseName);
  const fileCanonCompact = fileCanon.replace(/\s+/g, '');

  if (firmaCanonCompact.length >= 3 && fileCanonCompact.length >= 3) {
    if (firmaCanonCompact === fileCanonCompact || firmaCanon === fileCanon) return true;
  }

  // 3. Dosya adında veya ünvanında sadece son kurumsal ekler (ör: A.Ş. veya LTD. ŞTİ.) eksik/fazla ise
  // Core kelimelerin tamamının birebir eşleşmesi şartıyla tam ad kabul edilir:
  const firmaWords = firmaCanon.split(' ').filter((w) => w.length >= 2);
  const fileWords = fileCanon.split(' ').filter((w) => w.length >= 2);

  if (firmaWords.length >= 2 && fileWords.length >= 2) {
    const longer = firmaWords.length >= fileWords.length ? firmaWords : fileWords;
    const shorter = firmaWords.length < fileWords.length ? firmaWords : fileWords;
    const allShorterInLonger = shorter.every((w) => longer.includes(w));
    if (allShorterInLonger && longer.length - shorter.length <= 2) {
      return true;
    }
  }

  return false;
}

export interface UserAuthRecord {
  id: string;
  kullanici_adi: string;
  parola?: string; // Güvenlik gereği istemciye parola asla iletilmez
  ad_soyad?: string | null;
  unvan?: string | null;
  aktif?: boolean | null;
  olusturulma_tarihi?: string | null;
  son_giris_tarihi?: string | null;
  tablo_adi: 'personelsifre' | 'kullanicilar' | 'misafirsifre';
}

export interface MisafirSifreRecord {
  id: string;
  kullanici_adi: string;
  parola?: string;
  ad_soyad?: string | null;
  unvan?: string | null;
  aktif?: boolean | null;
  olusturulma_tarihi?: string | null;
  son_giris_tarihi?: string | null;
}

/**
 * %100 GÜVENLİ SUNUCU TARAFLI DOĞRULAMA (RPC / SECURITY DEFINER)
 * Tarayıcı asla personelsifre, kullanicilar veya misafirsifre tablolarını doğrudan çekmez.
 * F12 Ağ sekmesinde veya istemci belleğinde parola sütunları kesinlikle yer almaz.
 * Doğrulama tamamen PostgreSQL sunucusu içinde 'sistem_giris_yap' fonksiyonunda yapılır.
 */
export async function checkAllUserPassword(parola: string): Promise<{
  success: boolean;
  kullanici_adi?: string;
  tablo_adi?: 'personelsifre' | 'kullanicilar' | 'misafirsifre';
  record?: UserAuthRecord;
  error?: string;
}> {
  try {
    const cleanPassword = (parola || '').trim();
    if (!cleanPassword) {
      return { success: false, error: 'Parola boş olamaz.' };
    }

    // 1. Sunucu Taraflı Güvenli RPC Çağrısı
    const { data: rpcData, error: rpcError } = await supabase.rpc('sistem_giris_yap', {
      p_parola: cleanPassword,
    });

    if (rpcError) {
      console.error('Sunucu kimlik doğrulama hatası:', rpcError.message);
      return {
        success: false,
        error: 'Kimlik doğrulama sunucusuna erişilemedi. Lütfen tekrar deneyiniz.',
      };
    }

    if (rpcData && typeof rpcData === 'object') {
      const res = rpcData as {
        success?: boolean;
        kullanici_adi?: string;
        tablo_adi?: 'personelsifre' | 'kullanicilar' | 'misafirsifre';
        ad_soyad?: string;
        unvan?: string;
        id?: number | string;
        error?: string;
      };

      if (res.success && res.kullanici_adi) {
        const matchedTablo = (res.tablo_adi || 'personelsifre') as
          | 'personelsifre'
          | 'kullanicilar'
          | 'misafirsifre';

        return {
          success: true,
          kullanici_adi: res.kullanici_adi,
          tablo_adi: matchedTablo,
          record: {
            id: String(res.id || '1'),
            kullanici_adi: res.kullanici_adi,
            parola: '', // Parola istemciye asla geri verilmez
            ad_soyad: res.ad_soyad || res.kullanici_adi,
            unvan: res.unvan || '',
            aktif: true,
            tablo_adi: matchedTablo,
          },
        };
      } else {
        return {
          success: false,
          error: res.error || 'Hatalı parola! Lütfen tekrar deneyiniz.',
        };
      }
    }

    return {
      success: false,
      error: 'Hatalı parola! Aktif kullanıcı bulunamadı.',
    };
  } catch (err: any) {
    console.error('checkAllUserPassword hatası:', err);
    return { success: false, error: err?.message || 'Bilinmeyen sistem hatası' };
  }
}

/**
 * misafirsifre kontrolü için güvenli RPC fonksiyonunu çağırır.
 */
export async function checkMisafirSifre(parola: string): Promise<{
  success: boolean;
  kullanici_adi?: string;
  record?: MisafirSifreRecord;
  error?: string;
}> {
  return checkAllUserPassword(parola);
}

/**
 * Veritabanındaki 'talep_eden' sütunu ile sisteme giriş yapan kullanıcı adını
 * Türkçe karakter, harf büyüklüğü ve boşluk duyarsız olarak karşılaştırır.
 * Böylece kullanıcı sadece kendi talep ettiği kayıtları görür.
 */
export function isUserRecordMatch(recordTalepEden: any, currentUserName?: string): boolean {
  if (!currentUserName || !currentUserName.trim()) return true;
  if (!recordTalepEden) return false;

  const rec = String(recordTalepEden).trim().toLocaleLowerCase('tr-TR');
  const user = String(currentUserName).trim().toLocaleLowerCase('tr-TR');

  if (rec === user) return true;
  if (rec.replace(/\s+/g, '') === user.replace(/\s+/g, '')) return true;
  if (rec.includes(user) || user.includes(rec)) return true;

  return false;
}

/**
 * Verilen kullanıcı adının 'kullanicilar' tablosunda aktif bir tam yetkili
 * kullanıcı olup olmadığını SUNUCU TARAFLI RPC ile güvenle kontrol eder.
 * Tablolar doğrudan istemciye açılmaz.
 */
export async function isUserTamYetkili(userName?: string): Promise<boolean> {
  if (!userName || !userName.trim()) return false;
  const cleanUser = userName.trim();

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('kullanici_tam_yetki_kontrol', {
      p_kullanici: cleanUser,
    });
    if (!rpcError && typeof rpcData === 'boolean') {
      return rpcData;
    }
  } catch (err) {
    console.warn('Tam yetki kontrol hatası:', err);
  }

  return false;
}


