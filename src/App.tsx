import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { SantiyeBirimListesiPanel } from './components/SantiyeBirimListesiPanel';
import { Header } from './components/Header';
import { TalepForm, TalepUploadedFileInfo } from './components/TalepForm';
import { TalepTable } from './components/TalepTable';
import { GecmisOdemelerView } from './components/GecmisOdemelerView';
import { CariMuavinPdfView } from './components/CariMuavinPdfView';
import { BottomMuavinPdfViewer } from './components/BottomMuavinPdfViewer';
import { SantiyeBirimSecimSayfasi } from './components/SantiyeBirimSecimSayfasi';
import { SirketIbanlarSayfasi } from './components/SirketIbanlarSayfasi';
import { SessionTimeoutModal } from './components/SessionTimeoutModal';
import {
  SITES,
  ODENENLER_SITES,
  fetchTalepRecords,
  insertTalepRecord,
  deleteTalepRecord,
  updateTalepStatus,
  updateTalepFullRecord,
  saveTalepFileMapping,
  getSavedTalepFiles,
  deleteTalepFileMapping,
  getCariFaturalarFileList,
  isUserRecordMatch,
  isUserTamYetkili,
} from './lib/supabase';
import { SiteConfig, TalepRecord } from './types';
import { Menu, X, AlertTriangle, CheckCircle2, History, ClipboardList, Layers, LogOut, CreditCard } from 'lucide-react';
import { LogoIcon } from './components/Logo';
import {
  LoginScreen,
  AUTH_STORAGE_KEY,
  AUTH_USER_KEY,
  AUTH_IS_ADMIN_KEY,
  AUTH_USER_DETAILS_KEY,
} from './components/LoginScreen';

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 saat (3.600.000 ms)
const SESSION_START_KEY = 'ozka_talep_session_start_time';

export default function App() {
  // Authentication State (Sadece Parola ile Giriş)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(
      localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY)
    );
  });

  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY) || '';
  });

  // Tam Yetkili Yönetici Durumu (kullanicilar tablosu)
  const [isTamYetkili, setIsTamYetkili] = useState<boolean>(() => {
    const adminSaved =
      localStorage.getItem(AUTH_IS_ADMIN_KEY) || sessionStorage.getItem(AUTH_IS_ADMIN_KEY);
    if (adminSaved === 'true') return true;
    const detailsStr =
      localStorage.getItem(AUTH_USER_DETAILS_KEY) || sessionStorage.getItem(AUTH_USER_DETAILS_KEY);
    if (detailsStr) {
      try {
        const details = JSON.parse(detailsStr);
        if (details.tablo_adi === 'kullanicilar') return true;
      } catch {}
    }
    return false;
  });

  // 1 Saatlik Oturum Süresi & Zaman Aşımı Takibi
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    const saved = sessionStorage.getItem(SESSION_START_KEY) || localStorage.getItem(SESSION_START_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const now = Date.now();
    sessionStorage.setItem(SESSION_START_KEY, String(now));
    return now;
  });

  const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState<boolean>(false);

  // Kullanıcı adı değişiminde veya sayfa açılışında kullanicilar tablosundaki yetkisini senkronize et
  useEffect(() => {
    if (currentUser) {
      isUserTamYetkili(currentUser).then((tamYetkili) => {
        if (tamYetkili) {
          setIsTamYetkili(true);
          localStorage.setItem(AUTH_IS_ADMIN_KEY, 'true');
        }
      });
    }
  }, [currentUser]);

  // 1 saatlik oturum süresi kontrolü (her 5 saniyede bir kontrol)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      if (elapsed >= ONE_HOUR_MS) {
        setIsTimeoutModalOpen(true);
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [isAuthenticated, sessionStartTime]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_IS_ADMIN_KEY);
    localStorage.removeItem(AUTH_USER_DETAILS_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_IS_ADMIN_KEY);
    sessionStorage.removeItem(AUTH_USER_DETAILS_KEY);
    sessionStorage.removeItem(SESSION_START_KEY);
    setIsAuthenticated(false);
    setCurrentUser('');
    setIsTamYetkili(false);
    setIsTimeoutModalOpen(false);
    setCurrentView('santiye_listesi');
  }, []);

  const handleExtendSession = useCallback(() => {
    const now = Date.now();
    setSessionStartTime(now);
    sessionStorage.setItem(SESSION_START_KEY, String(now));
    localStorage.setItem(SESSION_START_KEY, String(now));
    setIsTimeoutModalOpen(false);
  }, []);

  const handleTimeoutLogout = useCallback(() => {
    setIsTimeoutModalOpen(false);
    sessionStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    handleLogout();
  }, [handleLogout]);

  const handleTriggerTestTimeout = useCallback(() => {
    setIsTimeoutModalOpen(true);
  }, []);

  const handleLoginSuccess = (kullaniciAdi?: string, adminStatus?: boolean) => {
    if (kullaniciAdi) {
      setCurrentUser(kullaniciAdi);
    }
    if (typeof adminStatus === 'boolean') {
      setIsTamYetkili(adminStatus);
    }
    const now = Date.now();
    setSessionStartTime(now);
    sessionStorage.setItem(SESSION_START_KEY, String(now));
    localStorage.setItem(SESSION_START_KEY, String(now));
    setIsTimeoutModalOpen(false);
    setIsAuthenticated(true);
    setCurrentView('santiye_listesi');
  };

  // Navigation View: 'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar'
  const [currentView, setCurrentView] = useState<
    'santiye_listesi' | 'talepler' | 'gecmis_odemeler' | 'cari_muavin_pdf' | 'sirket_ibanlar'
  >('santiye_listesi');
  const [muavinPdfSite, setMuavinPdfSite] = useState<SiteConfig>(SITES[0]);
  const [muavinPdfFirma, setMuavinPdfFirma] = useState<string>('');
  const [bottomPdfQuery, setBottomPdfQuery] = useState<string>('');

  // Handler to open the Şirket IBAN ve Banka Hesap Numaraları full-screen page
  const handleNavigateToSirketIbanlar = useCallback(() => {
    setCurrentView('sirket_ibanlar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Active sites
  const [activeSite, setActiveSite] = useState<SiteConfig>(SITES[0]);
  const [activeGecmisSite, setActiveGecmisSite] = useState<SiteConfig>(ODENENLER_SITES[0]);

  // Handler to open the Cari Muavin PDF full-screen page
  const handleOpenMuavinPdf = (site: SiteConfig, firmaUnvani?: string) => {
    const matchedSite = SITES.find((s) => s.id === site.id) || site;
    setMuavinPdfSite(matchedSite);
    setMuavinPdfFirma(firmaUnvani || '');
    setCurrentView('cari_muavin_pdf');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler when clicking "Cari Görüntüle" in form or table:
  // Smoothly scrolls down to the bottom embedded PDF viewer and searches for that firma!
  const handleScrollToBottomPdf = (site: SiteConfig, firmaUnvani?: string) => {
    if (site.id !== activeSite.id) {
      setActiveSite(site);
    }
    setBottomPdfQuery(firmaUnvani || '');
    setTimeout(() => {
      const el = document.getElementById('bottom-muavin-pdf-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        const input = document.getElementById('bottom-pdf-search-input') as HTMLInputElement;
        if (input) input.focus();
      }
    }, 150);
  };

  // Talepler state
  const [records, setRecords] = useState<TalepRecord[]>([]);
  const [siteCounts, setSiteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Geçmiş Ödemeler state
  const [gecmisRecords, setGecmisRecords] = useState<TalepRecord[]>([]);
  const [gecmisSiteCounts, setGecmisSiteCounts] = useState<Record<string, number>>({});
  const [isGecmisLoading, setIsGecmisLoading] = useState<boolean>(false);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Global toast/alert state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Load active site records (Talepler)
  const loadActiveSiteRecords = useCallback(async (site: SiteConfig) => {
    setIsLoading(true);
    try {
      const { data, error } = await fetchTalepRecords(site.tableName);
      if (error) {
        console.warn(`Tablo verisi alınamadı (${site.tableName}):`, error);
        setRecords([]);
      } else {
        const rawData = data || [];
        // Kullanıcı filtrelemesi: Tam yetkili yönetici (kullanicilar tablosu) bütün verileri görür.
        // Standart kullanıcılar ise sadece kendi talep ettiği verileri görür (talep_eden sütunu).
        const userFiltered = !isTamYetkili && currentUser && currentUser.trim()
          ? rawData.filter((r) => isUserRecordMatch(r.talep_eden || r.requester || r.talepEden, currentUser))
          : rawData;

        const validFiles = await getCariFaturalarFileList();
        const validNames = new Set(validFiles.map((f) => f.name.toLowerCase().trim()));
        const savedFiles = getSavedTalepFiles();
        const enriched = userFiltered.map((r) => {
          const fileInfo = savedFiles[`${site.tableName}_${r.id}`] || savedFiles[r.id];
          const isValid = fileInfo?.dosyaAdi && validNames.has(fileInfo.dosyaAdi.toLowerCase().trim());
          if (fileInfo && !isValid) {
            deleteTalepFileMapping(r.id, site.tableName);
          }
          return {
            ...r,
            fatura_dosya_adi: isValid ? fileInfo?.dosyaAdi : undefined,
            fatura_dosya_url: isValid ? fileInfo?.dosyaUrl : undefined,
          };
        });
        setRecords(enriched);
        setSiteCounts((prev) => ({
          ...prev,
          [site.tableName]: userFiltered.length,
          [site.id]: userFiltered.length,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isTamYetkili]);

  // 2. Fetch counts for all 7 sites (Talepler)
  const loadAllSiteCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const site of SITES) {
      try {
        const { data } = await fetchTalepRecords(site.tableName);
        if (data) {
          const count = !isTamYetkili && currentUser && currentUser.trim()
            ? data.filter((r) => isUserRecordMatch(r.talep_eden || r.requester || r.talepEden, currentUser)).length
            : data.length;
          counts[site.tableName] = count;
          counts[site.id] = count;
        }
      } catch {
        counts[site.tableName] = 0;
        counts[site.id] = 0;
      }
    }
    setSiteCounts(counts);
  }, [currentUser, isTamYetkili]);

  // 3. Load past payments records (Geçmiş Ödemeler)
  const loadGecmisRecords = useCallback(async (site: SiteConfig) => {
    setIsGecmisLoading(true);
    try {
      const { data, error } = await fetchTalepRecords(site.tableName);
      if (error) {
        console.warn(`Geçmiş ödemeler tablosu alınamadı (${site.tableName}):`, error);
        setGecmisRecords([]);
      } else {
        const rawData = data || [];
        // Kullanıcı filtrelemesi: Tam yetkili yönetici (kullanicilar tablosu) bütün verileri görür.
        const userFiltered = !isTamYetkili && currentUser && currentUser.trim()
          ? rawData.filter((r) => isUserRecordMatch(r.talep_eden || r.requester || r.talepEden, currentUser))
          : rawData;

        const validFiles = await getCariFaturalarFileList();
        const validNames = new Set(validFiles.map((f) => f.name.toLowerCase().trim()));
        const savedFiles = getSavedTalepFiles();
        const enriched = userFiltered.map((r) => {
          const fileInfo = savedFiles[`${site.tableName}_${r.id}`] || savedFiles[r.id];
          const isValid = fileInfo?.dosyaAdi && validNames.has(fileInfo.dosyaAdi.toLowerCase().trim());
          if (fileInfo && !isValid) {
            deleteTalepFileMapping(r.id, site.tableName);
          }
          return {
            ...r,
            fatura_dosya_adi: isValid ? fileInfo?.dosyaAdi : undefined,
            fatura_dosya_url: isValid ? fileInfo?.dosyaUrl : undefined,
          };
        });
        setGecmisRecords(enriched);
        setGecmisSiteCounts((prev) => ({
          ...prev,
          [site.tableName]: userFiltered.length,
          [site.id]: userFiltered.length,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setGecmisRecords([]);
    } finally {
      setIsGecmisLoading(false);
    }
  }, [currentUser, isTamYetkili]);

  // 4. Fetch counts for all 7 past payment sites
  const loadAllGecmisCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const site of ODENENLER_SITES) {
      try {
        const { data } = await fetchTalepRecords(site.tableName);
        if (data) {
          const count = !isTamYetkili && currentUser && currentUser.trim()
            ? data.filter((r) => isUserRecordMatch(r.talep_eden || r.requester || r.talepEden, currentUser)).length
            : data.length;
          counts[site.tableName] = count;
          counts[site.id] = count;
        }
      } catch {
        counts[site.tableName] = 0;
        counts[site.id] = 0;
      }
    }
    setGecmisSiteCounts(counts);
  }, [currentUser, isTamYetkili]);

  // Effects for Talepler
  useEffect(() => {
    loadActiveSiteRecords(activeSite);
  }, [activeSite, loadActiveSiteRecords]);

  useEffect(() => {
    loadAllSiteCounts();
  }, [loadAllSiteCounts]);

  // Effects for Geçmiş Ödemeler
  useEffect(() => {
    if (currentView === 'gecmis_odemeler') {
      loadGecmisRecords(activeGecmisSite);
    }
  }, [currentView, activeGecmisSite, loadGecmisRecords]);

  useEffect(() => {
    loadAllGecmisCounts();
  }, [loadAllGecmisCounts]);

  // Navigation handlers
  const handleNavigateToGecmis = () => {
    // When entering the page, ARNAVUTKÖY is selected by default as requested
    setActiveGecmisSite(ODENENLER_SITES[0]);
    setCurrentView('gecmis_odemeler');
    loadGecmisRecords(ODENENLER_SITES[0]);
    loadAllGecmisCounts();
    setMobileMenuOpen(false);
  };

  const handleNavigateToTalepler = () => {
    setCurrentView('talepler');
    setMobileMenuOpen(false);
  };

  const handleSelectSite = (site: SiteConfig) => {
    setActiveSite(site);
    setMobileMenuOpen(false);
  };

  const handleSelectGecmisSite = (site: SiteConfig) => {
    setActiveGecmisSite(site);
    setMobileMenuOpen(false);
  };

  // Form submission handler (Talepler)
  const handleFormSubmit = async (
    formData: {
      firma_unvani: string;
      iban_no: string;
      aciklama: string;
      odenecek_tutar: number;
      talep_eden: string;
      durumu: string;
    },
    fileInfo?: TalepUploadedFileInfo
  ): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const result = await insertTalepRecord(activeSite.tableName, formData);
      if (!result.success) {
        const errorMsg = result.error?.message || 'Kayıt sırasında veritabanı hatası oluştu.';
        showToast('error', `Veritabanına kaydedilemedi: ${errorMsg}`);
        return false;
      }

      // Eğer dosya yüklenmişse bu kayda bağla
      if (fileInfo && result.data && result.data.length > 0) {
        const newRecord = result.data[0];
        saveTalepFileMapping(
          activeSite.tableName,
          newRecord.id,
          fileInfo.dosyaAdi,
          fileInfo.dosyaUrl,
          fileInfo.fullPath
        );
      }

      const fileMsg = fileInfo
        ? ` ve dosya ("${fileInfo.dosyaAdi}") CARIFATURALAR bucket'ına`
        : '';
      showToast('success', `Talep kaydı${fileMsg} başarıyla veritabanına eklendi.`);
      await loadActiveSiteRecords(activeSite);
      loadAllSiteCounts();
      return true;
    } catch (err: any) {
      showToast('error', `Beklenmeyen bir hata oluştu: ${err.message || err}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete record handler (Talepler)
  const handleDeleteRecord = async (id: string | number) => {
    try {
      const result = await deleteTalepRecord(activeSite.tableName, id);
      if (result.success) {
        showToast('success', 'Talep kaydı veritabanından başarıyla silindi.');
        setRecords((prev) => prev.filter((r) => r.id !== id));
        setSiteCounts((prev) => ({
          ...prev,
          [activeSite.tableName]: Math.max(0, (prev[activeSite.tableName] || 1) - 1),
        }));
      } else {
        const errDesc = result.error?.message || 'Veritabanı hatası oluştu.';
        showToast('error', `Kayıt silinirken hata oluştu: ${errDesc}`);
      }
    } catch (err: any) {
      showToast('error', `Silme hatası: ${err.message || err}`);
    }
  };

  // Delete record handler (Geçmiş Ödemeler)
  const handleDeleteGecmisRecord = async (id: string | number) => {
    try {
      const result = await deleteTalepRecord(activeGecmisSite.tableName, id);
      if (result.success) {
        showToast('success', 'Geçmiş ödeme kaydı veritabanından başarıyla silindi.');
        setGecmisRecords((prev) => prev.filter((r) => r.id !== id));
        setGecmisSiteCounts((prev) => ({
          ...prev,
          [activeGecmisSite.tableName]: Math.max(0, (prev[activeGecmisSite.tableName] || 1) - 1),
        }));
      } else {
        const errDesc = result.error?.message || 'Veritabanı hatası oluştu.';
        showToast('error', `Kayıt silinirken hata oluştu: ${errDesc}`);
      }
    } catch (err: any) {
      showToast('error', `Silme hatası: ${err.message || err}`);
    }
  };

  // Update full record handler
  const handleUpdateRecord = async (
    id: string | number,
    updatedData: {
      firma_unvani: string;
      iban_no: string;
      aciklama: string;
      odenecek_tutar: number;
      talep_eden: string;
      durumu: string;
      cari_bakiye?: number | string | null;
    }
  ): Promise<boolean> => {
    try {
      const result = await updateTalepFullRecord(activeSite.tableName, id, updatedData);
      if (!result.success) {
        const errorMsg = result.error?.message || 'Güncelleme sırasında hata oluştu.';
        showToast('error', `Veritabanında güncellenemedi: ${errorMsg}`);
        return false;
      }

      showToast('success', 'Talep kaydı veritabanında başarıyla güncellendi.');
      await loadActiveSiteRecords(activeSite);
      return true;
    } catch (err: any) {
      showToast('error', `Güncelleme hatası: ${err.message || err}`);
      return false;
    }
  };

  // Update full record handler for Geçmiş Ödemeler
  const handleUpdateGecmisRecord = async (
    id: string | number,
    updatedData: {
      firma_unvani: string;
      iban_no: string;
      aciklama: string;
      odenecek_tutar: number;
      talep_eden: string;
      durumu: string;
      cari_bakiye?: number | string | null;
      fatura_no?: string;
      fatura_tarihi?: string;
      fatura_tutari?: number;
      fatura_dosya_adi?: string;
      fatura_dosya_url?: string;
    }
  ): Promise<boolean> => {
    try {
      const result = await updateTalepFullRecord(activeGecmisSite.tableName, id, updatedData);
      if (!result.success) {
        const errorMsg = result.error?.message || 'Güncelleme sırasında hata oluştu.';
        showToast('error', `Veritabanında güncellenemedi: ${errorMsg}`);
        return false;
      }

      showToast('success', 'Geçmiş ödeme kaydı başarıyla güncellendi.');
      await loadGecmisRecords(activeGecmisSite);
      return true;
    } catch (err: any) {
      showToast('error', `Güncelleme hatası: ${err.message || err}`);
      return false;
    }
  };

  // Update status handler
  const handleUpdateStatus = async (id: string | number, newStatus: string) => {
    try {
      const result = await updateTalepStatus(activeSite.tableName, id, newStatus);
      if (result.success) {
        showToast('success', `Durum "${newStatus}" olarak güncellendi.`);
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, durumu: newStatus, durum: newStatus } : r))
        );
      } else {
        showToast('error', 'Durum güncellenirken hata oluştu.');
      }
    } catch (err: any) {
      showToast('error', `Güncelleme hatası: ${err.message}`);
    }
  };

  // Calculate totals
  const totalAmount = records.reduce((sum, r) => {
    const val = r.odenecek_tutar ?? r.tutar ?? 0;
    const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    return sum + num;
  }, 0);

  const gecmisTotalAmount = gecmisRecords.reduce((sum, r) => {
    const val = r.odenecek_tutar ?? r.tutar ?? r.odenen_tutar ?? 0;
    const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    return sum + num;
  }, 0);

  const isGecmis = currentView === 'gecmis_odemeler';

  // Sadece Parola ile Giriş Ekranı (Oturum Açılmamışsa)
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // GİRİŞ YAPILDIKTAN SONRA YENİ BİR SAYFADA ŞANTİYE & BİRİM LİSTESİ BUTONLARI GÖRÜNSÜN
  if (currentView === 'santiye_listesi') {
    return (
      <>
        <SantiyeBirimSecimSayfasi
          currentUser={currentUser}
          isTamYetkili={isTamYetkili}
          siteCounts={siteCounts}
          gecmisSiteCounts={gecmisSiteCounts}
          sessionStartTime={sessionStartTime}
          onTriggerTestTimeout={handleTriggerTestTimeout}
          onNavigateToSirketIbanlar={handleNavigateToSirketIbanlar}
          onSelectSiteAndNavigate={(site, view) => {
            if (view === 'gecmis_odemeler') {
              handleSelectGecmisSite(site);
              setCurrentView('gecmis_odemeler');
            } else if (view === 'cari_muavin_pdf') {
              handleOpenMuavinPdf(site, '');
            } else {
              handleSelectSite(site);
              setCurrentView('talepler');
            }
          }}
          onLogout={handleLogout}
        />
        <SessionTimeoutModal
          isOpen={isTimeoutModalOpen}
          onContinue={handleExtendSession}
          onLogout={handleTimeoutLogout}
          countdownSeconds={60}
        />
      </>
    );
  }

  // Dedicated Cari Muavin PDF Full Page View
  if (currentView === 'cari_muavin_pdf') {
    return (
      <>
        <CariMuavinPdfView
          initialSite={muavinPdfSite}
          initialFirma={muavinPdfFirma}
          onBackToTalepler={() => setCurrentView('talepler')}
          onBackToSantiyeListesi={() => setCurrentView('santiye_listesi')}
        />
        <SessionTimeoutModal
          isOpen={isTimeoutModalOpen}
          onContinue={handleExtendSession}
          onLogout={handleTimeoutLogout}
          countdownSeconds={60}
        />
      </>
    );
  }

  // Dedicated Şirket IBAN ve Banka Hesap Numaraları Full Page View
  if (currentView === 'sirket_ibanlar') {
    return (
      <>
        <SirketIbanlarSayfasi
          onBackToTalepler={handleNavigateToTalepler}
          onBackToSantiyeListesi={() => setCurrentView('santiye_listesi')}
          currentUser={currentUser}
          isTamYetkili={isTamYetkili}
          sessionStartTime={sessionStartTime}
          onTriggerTestTimeout={handleTriggerTestTimeout}
          onLogout={handleLogout}
        />
        <SessionTimeoutModal
          isOpen={isTimeoutModalOpen}
          onContinue={handleExtendSession}
          onLogout={handleTimeoutLogout}
          countdownSeconds={60}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#081226] text-slate-100 flex flex-col antialiased">
      {/* Mobile Top Navbar */}
      <div className="lg:hidden bg-[#09152b] border-b border-blue-900/50 p-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-0.5 rounded-lg bg-blue-950 border border-blue-600/40">
            <LogoIcon size={30} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">
              {isGecmis ? 'GEÇMİŞ ÖDEMELER' : 'BAYBURT ÖZKA'}
            </div>
            <div className="text-sm font-extrabold text-white">
              {isGecmis ? activeGecmisSite.name : activeSite.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Return to Şirket IBANlar */}
          <button
            onClick={handleNavigateToSirketIbanlar}
            className="px-2 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm border border-cyan-400/40 cursor-pointer"
            title="Şirket IBAN ve Banka Hesap Numaraları"
          >
            <CreditCard className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">Şirket IBANlar</span>
            <span className="sm:hidden">IBAN</span>
          </button>

          {/* Quick Mobile View Switcher */}
          {!isGecmis ? (
            <button
              onClick={handleNavigateToGecmis}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-sm"
              title="Geçmiş Ödemeler"
            >
              <History className="w-3.5 h-3.5" />
              <span>Geçmiş</span>
            </button>
          ) : (
            <button
              onClick={handleNavigateToTalepler}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm"
              title="Taleplere Dön"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Talepler</span>
            </button>
          )}

          {/* Current User Pill for Mobile/Tablet */}
          {currentUser && (
            <span
              id="mobile-user-badge"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-blue-300 bg-blue-950/70 px-2 py-1 rounded-md border border-blue-600/40"
              title={`Giriş Yapan: ${currentUser}`}
            >
              {currentUser}
            </span>
          )}

          {/* Mobile Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:text-white"
            title="Güvenli Çıkış Yap"
            aria-label="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#0e1d38] border border-blue-800/50 text-slate-200"
            aria-label="Menü"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-4/5 max-w-xs h-full bg-[#09152b]" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              activeSiteId={isGecmis ? activeGecmisSite.id : activeSite.id}
              onSelectSite={isGecmis ? handleSelectGecmisSite : handleSelectSite}
              siteCounts={isGecmis ? gecmisSiteCounts : siteCounts}
              currentView={currentView}
              onSwitchView={(view) => {
                if (view === 'cari_muavin_pdf') {
                  handleOpenMuavinPdf(activeSite, '');
                } else if (view === 'sirket_ibanlar') {
                  handleNavigateToSirketIbanlar();
                } else {
                  setCurrentView(view);
                }
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#081226] overflow-x-hidden">
        {/* Header */}
        <Header
          activeSite={isGecmis ? activeGecmisSite : activeSite}
          totalRecords={isGecmis ? gecmisRecords.length : records.length}
          totalAmount={isGecmis ? gecmisTotalAmount : totalAmount}
          onRefresh={
            isGecmis
              ? () => loadGecmisRecords(activeGecmisSite)
              : () => loadActiveSiteRecords(activeSite)
          }
          isLoading={isGecmis ? isGecmisLoading : isLoading}
          currentView={currentView}
          onNavigateToSirketIbanlar={handleNavigateToSirketIbanlar}
          onNavigateToSantiyeListesi={() => setCurrentView('santiye_listesi')}
          onNavigateToGecmis={handleNavigateToGecmis}
          onNavigateToTalepler={handleNavigateToTalepler}
          onNavigateToPdf={() => handleOpenMuavinPdf(activeSite, '')}
          onLogout={handleLogout}
          currentUser={currentUser}
          isTamYetkili={isTamYetkili}
          sessionStartTime={sessionStartTime}
          onTriggerTestTimeout={handleTriggerTestTimeout}
        />

        {/* Global Toast Alert */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce-short">
            <div
              className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 text-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-500/60'
                  : toast.type === 'error'
                  ? 'bg-rose-950 text-rose-200 border-rose-500/60'
                  : 'bg-amber-950 text-amber-200 border-amber-500/60'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{toast.message}</div>
              <button
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Workspace Content */}
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10 space-y-6 max-w-[1920px] w-full mx-auto">
          {currentView === 'talepler' ? (
            <>
              {/* Üst Bölüm: Şantiye Birim Listesi ile Yeni Talep Kayıt Formu (Altları Eşitlenmiş) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Sol: Şantiye & Birim Listesi (7 Şantiye Butonu) */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col">
                  <SantiyeBirimListesiPanel
                    activeSiteId={activeSite.id}
                    onSelectSite={handleSelectSite}
                    siteCounts={siteCounts}
                    currentView={currentView}
                    onSwitchView={(view) => {
                      if (view === 'cari_muavin_pdf') {
                        handleOpenMuavinPdf(activeSite, '');
                      } else if (view === 'sirket_ibanlar') {
                        handleNavigateToSirketIbanlar();
                      } else {
                        setCurrentView(view);
                      }
                    }}
                  />
                </div>

                {/* Sağ: Yeni Talep Kayıt Formu (Alt Sınırı Sol Panel ile Eşit) */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
                  <TalepForm
                    activeSite={activeSite}
                    onSubmit={handleFormSubmit}
                    isSubmitting={isSubmitting}
                    onOpenMuavinPdf={handleOpenMuavinPdf}
                    currentUser={currentUser}
                  />
                </div>
              </div>

              {/* Alt Satır 1: Talep Listesi Tablosu (Sola Doğru Tam Genişletilmiş) */}
              <div className="w-full">
                <TalepTable
                  activeSite={activeSite}
                  records={records}
                  isLoading={isLoading}
                  onRefresh={() => loadActiveSiteRecords(activeSite)}
                  onDeleteRecord={handleDeleteRecord}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdateRecord={handleUpdateRecord}
                  isPastPayments={false}
                  onOpenMuavinPdf={handleOpenMuavinPdf}
                  currentUser={currentUser}
                  isTamYetkili={isTamYetkili}
                />
              </div>

              {/* Alt Satır 2: Muavin Defteri PDF Görüntüleyici (Sola Doğru Tam Genişletilmiş) */}
              <div className="w-full">
                <BottomMuavinPdfViewer
                  activeSite={activeSite}
                  initialSearchQuery={bottomPdfQuery}
                  onOpenFullScreen={(site, query) => handleOpenMuavinPdf(site, query)}
                />
              </div>
            </>
          ) : currentView === 'gecmis_odemeler' ? (
            /* Geçmiş Ödeme Kayıtları Page */
            <GecmisOdemelerView
              activeSite={activeGecmisSite}
              onSelectSite={handleSelectGecmisSite}
              records={gecmisRecords}
              isLoading={isGecmisLoading}
              onRefresh={() => loadGecmisRecords(activeGecmisSite)}
              onBackToTalepler={handleNavigateToTalepler}
              onBackToSantiyeListesi={() => setCurrentView('santiye_listesi')}
              onDeleteRecord={handleDeleteGecmisRecord}
              onUpdateRecord={handleUpdateGecmisRecord}
              siteCounts={gecmisSiteCounts}
              onOpenMuavinPdf={handleOpenMuavinPdf}
              currentUser={currentUser}
              isTamYetkili={isTamYetkili}
            />
          ) : (
            /* CARİ MUAVİN SAYFASI: Tam Ekran Cari Muavin PDF İnceleme ve Kontrolü */
            <CariMuavinPdfView
              initialSite={muavinPdfSite}
              initialFirma={muavinPdfFirma}
              onBackToTalepler={handleNavigateToTalepler}
              onBackToSantiyeListesi={() => setCurrentView('santiye_listesi')}
            />
          )}
        </div>
      </main>

      {/* 1 Saatlik Oturum Güvenlik ve Süre Sonu Uyarı Modalı */}
      <SessionTimeoutModal
        isOpen={isTimeoutModalOpen}
        onContinue={handleExtendSession}
        onLogout={handleTimeoutLogout}
        countdownSeconds={60}
      />
    </div>
  );
}
