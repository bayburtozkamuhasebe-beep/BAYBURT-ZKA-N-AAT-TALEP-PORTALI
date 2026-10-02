/**
 * IBAN Doğrulama, Banka Tanımlama ve Sorgulama Yardımcıları
 */

export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  color?: string;
}

// Türkiye Banka Kodları Sözlüğü (TCMB Kodları)
export const TURKISH_BANKS: Record<string, { name: string; shortName: string; color: string }> = {
  '00010': { name: 'T.C. Ziraat Bankası A.Ş.', shortName: 'Ziraat Bankası', color: '#c4122f' },
  '00012': { name: 'Türkiye Halk Bankası A.Ş.', shortName: 'Halkbank', color: '#005596' },
  '00015': { name: 'Türkiye Vakıflar Bankası T.A.O.', shortName: 'VakıfBank', color: '#f7a800' },
  '00032': { name: 'Türk Ekonomi Bankası A.Ş. (TEB)', shortName: 'TEB', color: '#00843d' },
  '00046': { name: 'Akbank T.A.Ş.', shortName: 'Akbank', color: '#e30613' },
  '00059': { name: 'Şekerbank T.A.Ş.', shortName: 'Şekerbank', color: '#82b934' },
  '00062': { name: 'Türkiye Garanti Bankası A.Ş.', shortName: 'Garanti BBVA', color: '#007934' },
  '00064': { name: 'Türkiye İş Bankası A.Ş.', shortName: 'İş Bankası', color: '#004f9e' },
  '00067': { name: 'Yapı ve Kredi Bankası A.Ş.', shortName: 'Yapı Kredi', color: '#002d72' },
  '00091': { name: 'Arap Türk Bankası A.Ş.', shortName: 'Arap Türk Bankası', color: '#006d3d' },
  '00092': { name: 'Citibank A.Ş.', shortName: 'Citibank', color: '#003b70' },
  '00096': { name: 'Turkish Bank A.Ş.', shortName: 'Turkish Bank', color: '#004785' },
  '00100': { name: 'Adabank A.Ş.', shortName: 'Adabank', color: '#1a365d' },
  '00103': { name: 'Fibabanka A.Ş.', shortName: 'Fibabanka', color: '#005ba4' },
  '00108': { name: 'Turkland Bank A.Ş. (T-Bank)', shortName: 'T-Bank', color: '#ed1c24' },
  '00109': { name: 'ING Bank A.Ş.', shortName: 'ING', color: '#ff6200' },
  '00111': { name: 'QNB Finansbank A.Ş.', shortName: 'QNB', color: '#7a1954' },
  '00121': { name: 'Standard Chartered Yatırım Bankası', shortName: 'Standard Chartered', color: '#007a3e' },
  '00122': { name: 'Societe Generale (SA)', shortName: 'Societe Generale', color: '#e2001a' },
  '00123': { name: 'HSBC Bank A.Ş.', shortName: 'HSBC', color: '#db0011' },
  '00124': { name: 'Alternatifbank A.Ş.', shortName: 'Alternatif Bank', color: '#e30613' },
  '00125': { name: 'Burgan Bank A.Ş.', shortName: 'Burgan Bank', color: '#002f6c' },
  '00134': { name: 'Denizbank A.Ş.', shortName: 'Denizbank', color: '#005f9e' },
  '00135': { name: 'Anadolubank A.Ş.', shortName: 'Anadolubank', color: '#004481' },
  '00141': { name: 'Nurol Yatırım Bankası A.Ş.', shortName: 'Nurol Bank', color: '#1e3a8a' },
  '00142': { name: 'Diler Yatırım Bankası A.Ş.', shortName: 'Diler Bank', color: '#1e293b' },
  '00143': { name: 'Aktif Yatırım Bankası A.Ş. (Aktif Bank)', shortName: 'Aktif Bank', color: '#84cc16' },
  '00144': { name: 'GSD Yatırım Bankası A.Ş.', shortName: 'GSD Bank', color: '#0284c7' },
  '00145': { name: 'Merrill Lynch Yatırım Bank A.Ş.', shortName: 'Merrill Lynch', color: '#0369a1' },
  '00146': { name: 'Odea Bank A.Ş.', shortName: 'Odeabank', color: '#5b21b6' },
  '00147': { name: 'Bank of China Turkey A.Ş.', shortName: 'Bank of China', color: '#dc2626' },
  '00148': { name: 'BankPozitif Kredi ve Kalkınma Bankası', shortName: 'BankPozitif', color: '#ea580c' },
  '00203': { name: 'Albaraka Türk Katılım Bankası A.Ş.', shortName: 'Albaraka Türk', color: '#9a3412' },
  '00205': { name: 'Kuveyt Türk Katılım Bankası A.Ş.', shortName: 'Kuveyt Türk', color: '#047857' },
  '00206': { name: 'Türkiye Finans Katılım Bankası A.Ş.', shortName: 'Türkiye Finans', color: '#b91c1c' },
  '00209': { name: 'Ziraat Katılım Bankası A.Ş.', shortName: 'Ziraat Katılım', color: '#b91c1c' },
  '00210': { name: 'Vakıf Katılım Bankası A.Ş.', shortName: 'Vakıf Katılım', color: '#ca8a04' },
  '00211': { name: 'Türkiye Emlak Katılım Bankası A.Ş.', shortName: 'Emlak Katılım', color: '#0f766e' },
  '00212': { name: 'Hayat Finans Katılım Bankası A.Ş.', shortName: 'Hayat Finans', color: '#1e40af' },
  '00213': { name: 'T.O.M. Katılım Bankası A.Ş.', shortName: 'TOM Bank', color: '#7c3aed' },
  '00801': { name: 'Papara Elektronik Para A.Ş.', shortName: 'Papara', color: '#6366f1' },
  '00802': { name: 'İninal Ödeme ve Elektronik Para', shortName: 'İninal', color: '#ef4444' },
  '00803': { name: 'Paycell (Turkcell Ödeme Hizmetleri)', shortName: 'Paycell', color: '#eab308' },
  '00804': { name: 'Tosla (AkÖde Elektronik Para)', shortName: 'Tosla', color: '#f97316' },
  '00808': { name: 'Param (Turk Elektronik Para A.Ş.)', shortName: 'Param', color: '#10b981' },
};

export interface IBANValidationResult {
  raw: string;
  clean: string;
  formatted: string;
  isValidLength: boolean;
  isValidPrefix: boolean;
  isChecksumValid: boolean;
  bankCode?: string;
  bankInfo?: { name: string; shortName: string; color: string };
  errorMessage?: string;
}

/**
 * IBAN'ı analiz eder, biçimini ve bankasını kontrol eder.
 */
export function analyzeIBAN(rawIban: string): IBANValidationResult {
  const clean = (rawIban || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Format into blocks of 4
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  const formatted = parts.join(' ');

  if (!clean) {
    return {
      raw: rawIban,
      clean: '',
      formatted: '',
      isValidLength: false,
      isValidPrefix: false,
      isChecksumValid: false,
      errorMessage: 'İBAN numarası boş bırakılamaz.',
    };
  }

  const isValidPrefix = clean.startsWith('TR');
  const isValidLength = clean.length === 26;

  // Banka kodunu çıkar (TRxx [5 hane])
  let bankCode: string | undefined;
  let bankInfo: { name: string; shortName: string; color: string } | undefined;

  if (clean.length >= 9) {
    bankCode = clean.substring(4, 9);
    bankInfo = TURKISH_BANKS[bankCode] || {
      name: `Banka Kodu: ${bankCode}`,
      shortName: `Banka (${bankCode})`,
      color: '#475569',
    };
  }

  // Mod-97 checksum hesaplaması (ISO 7064)
  let isChecksumValid = false;
  if (isValidPrefix && isValidLength) {
    try {
      const rearranged = clean.slice(4) + clean.slice(0, 4);
      let numeric = '';
      for (let i = 0; i < rearranged.length; i++) {
        const char = rearranged[i];
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
          numeric += (code - 55).toString();
        } else {
          numeric += char;
        }
      }

      let remainder = 0;
      for (let i = 0; i < numeric.length; i += 7) {
        const chunk = remainder.toString() + numeric.substring(i, i + 7);
        remainder = parseInt(chunk, 10) % 97;
      }
      isChecksumValid = remainder === 1;
    } catch {
      isChecksumValid = false;
    }
  }

  let errorMessage: string | undefined;
  if (!isValidPrefix) {
    errorMessage = 'İBAN "TR" ile başlamalıdır.';
  } else if (clean.length < 26) {
    errorMessage = `Eksik karakter (${clean.length}/26). Türkiye İBAN numaraları 26 karakter olmalıdır.`;
  } else if (clean.length > 26) {
    errorMessage = `Fazla karakter (${clean.length}/26). İBAN 26 karakter olmalıdır.`;
  }

  return {
    raw: rawIban,
    clean,
    formatted,
    isValidLength,
    isValidPrefix,
    isChecksumValid,
    bankCode,
    bankInfo,
    errorMessage,
  };
}
