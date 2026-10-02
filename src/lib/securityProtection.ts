/**
 * Kurumsal Güvenlik ve Kaynak Koruma Modülü
 * - F12 (Geliştirici Araçları) tuşunu engeller
 * - Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (İncele / Konsol) engeller
 * - Ctrl+U (Sayfa Kaynağını Görüntüle) engeller
 * - Ctrl+S (Sayfayı ve İndeksi Farklı Kaydet) engeller
 * - Sağ Tık (Context Menu - İncele Menüsü) engeller
 * - Tarayıcı geliştirici araçları açıldığında konsolu temizler
 */

export function initSecurityProtection() {
  if (typeof window === 'undefined') return;

  // 1. Sağ Tık (Context Menu) Engelleme
  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Sağ tık ve kaynak inceleme bu sistemde devre dışı bırakılmıştır.');
      return false;
    },
    { capture: true }
  );

  // 2. Klavye Kısayolları Engelleme (F12, Ctrl+U, Ctrl+Shift+I/J/C, Ctrl+S)
  document.addEventListener(
    'keydown',
    (e) => {
      // F12 tuşu
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Geliştirici araçları (F12) güvenlik sebebiyle engellenmiştir.');
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey; // Windows Ctrl veya Mac Command

      // Ctrl + U (Kaynak Kod Görüntüleme)
      if (isCtrlOrMeta && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Sayfa kaynağını görüntüleme (Ctrl+U) devre dışıdır.');
        return false;
      }

      // Ctrl + S (Sayfayı ve İndeksi Kaydetme)
      if (isCtrlOrMeta && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Sayfayı kaydetme işlemi güvenlik sebebiyle engellenmiştir.');
        return false;
      }

      // Ctrl + Shift + I / J / C (Geliştirici Konsolu ve Öğeyi Denetle)
      if (
        isCtrlOrMeta &&
        e.shiftKey &&
        ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Öğe denetimi ve geliştirici konsolu engellenmiştir.');
        return false;
      }

      // Mac için: Cmd + Option + I / J / C / U
      if (e.metaKey && e.altKey && ['i', 'I', 'j', 'J', 'c', 'C', 'u', 'U'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning('Geliştirici araçları engellenmiştir.');
        return false;
      }
    },
    { capture: true }
  );

  // 3. Konsolu Temiz Tutma & Bilgilendirme
  try {
    setInterval(() => {
      if (window.console) {
        // Konsol çıktısını temizle
        console.clear();
      }
    }, 2000);
  } catch {
    // ignore
  }

  // 4. Görsellerin ve bağlantıların sürüklenerek indirilmesini engelleme
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });
}

// Güvenlik uyarısı gösterme fonksiyonu (Kullanıcıyı bilgilendirir)
let toastTimer: any = null;
function showSecurityWarning(message: string) {
  try {
    const existing = document.getElementById('sec-warning-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'sec-warning-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#0f172a';
    toast.style.color = '#f87171';
    toast.style.border = '1px solid #ef4444';
    toast.style.padding = '10px 18px';
    toast.style.borderRadius = '12px';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
    toast.style.zIndex = '9999999';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.pointerEvents = 'none';
    toast.style.transition = 'all 0.3s ease';
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  } catch {
    // ignore
  }
}
