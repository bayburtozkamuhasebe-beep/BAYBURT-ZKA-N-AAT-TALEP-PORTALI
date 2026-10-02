export type SiteId =
  | 'arnavutkoy'
  | 'mamak_ankara'
  | 'senbay_ozka'
  | 'merkez_ozka'
  | 'msb_ozka'
  | 'seka'
  | 'diger';

export interface SiteConfig {
  id: SiteId;
  name: string;
  tableName: string;
  code: string;
  badgeColor: string;
  nameColor?: string;
}

export interface TalepRecord {
  id?: string | number;
  firma_unvani?: string;
  firma_adi?: string;
  iban_no?: string;
  iban?: string;
  aciklama?: string;
  odenecek_tutar?: number | string;
  tutar?: number | string;
  cari_bakiye?: number | string | null;
  talep_eden?: string;
  durumu?: string;
  durum?: string;
  created_at?: string;
  [key: string]: any;
}

export type StatusType = 'Beklemede' | 'Onaylandı' | 'Ödendi' | 'Reddedildi' | 'İşlemde';
