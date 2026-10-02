import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDF_CMAPS_URL, initPdfWorker } from '../lib/pdfWorker';
import {
  SITES,
  MUAVIN_SITE_MAPPINGS,
  getMuavinPdfInfo,
  supabase,
} from '../lib/supabase';
import { SiteConfig } from '../types';
import { CariKontrolModal } from './CariKontrolModal';
import {
  ArrowLeft,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Layers,
  UploadCloud,
  FileSpreadsheet,
  Building,
  Sparkles,
  Zap,
} from 'lucide-react';

// Configure PDF.js worker safely
initPdfWorker();

interface CariMuavinPdfViewProps {
  initialSite: SiteConfig;
  initialFirma?: string;
  onBackToTalepler: () => void;
  onBackToSantiyeListesi?: () => void;
  onOpenCariModal?: (firma: string) => void;
}

// 1. Turkish character-aware normalization (keeps Turkish lowercasing)
function normalizeTurkish(text: string): string {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşıöç]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. ASCII-folded normalization (strips all Turkish diacritics for accounting PDF fonts)
function normalizeAscii(text: string): string {
  if (!text) return '';
  return text
    .replace(/[İıI]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 3. Compacted alphanumeric normalization (for hyphenated or spaced abbreviations like OZ-KA vs OZKA)
function normalizeCompacted(text: string): string {
  return normalizeAscii(text).replace(/\s+/g, '');
}

// Levenshtein distance calculation for typo/fuzzy tolerance
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if token `t` (from query) matches or fuzzy-matches word `w` (from PDF)
function isTokenFuzzyMatch(t: string, w: string): boolean {
  if (!t || !w) return false;
  if (t === w) return true;

  // Substring inclusion if word has reasonable length (>= 3)
  if (t.length >= 3 && (w.includes(t) || t.includes(w))) {
    return true;
  }

  // Prefix / Stem match: e.g. "kaya" vs "kayalar", "demir" vs "demirkol", "ozka" vs "ozkaya"
  const minLen = Math.min(t.length, w.length);
  if (minLen >= 3 && t.slice(0, minLen) === w.slice(0, minLen)) {
    return true;
  }

  // Typo tolerance: Levenshtein distance (e.g. "baybur" vs "bayburt", "kayan" vs "kaya")
  if (t.length >= 4 && w.length >= 4 && Math.abs(t.length - w.length) <= 2) {
    const maxDist = t.length >= 7 ? 2 : 1;
    if (levenshteinDistance(t, w) <= maxDist) {
      return true;
    }
  }

  return false;
}

// Common Turkish company suffix words that users may type or omit
const COMPANY_STOP_WORDS = new Set([
  'ltd',
  'sti',
  'as',
  'san',
  'tic',
  'ins',
  'sirketi',
  'limited',
  'anonim',
  'sanayi',
  'ticaret',
  'insaat',
  'nakliyat',
  'nak',
  'taahhut',
  'taah',
  've',
  'gida',
  'petrol',
  'oto',
  'otomotiv',
  'turizm',
  'muhendislik',
  'madencilik',
  'pazarlama',
  'ithalat',
  'ihracat',
  'lojistik',
  'servis',
  'hizmetleri',
]);

export type MatchType = 'exact' | 'first20' | 'first15' | 'first10' | 'first5' | 'partial' | 'fuzzy' | 'none';

export interface PageMatchEvaluation {
  isMatch: boolean;
  score: number;
  matchType: MatchType;
  matchedWords: string[];
}

// Check if target substring matches text in page (supports Turkish, ASCII-folded, and compacted)
export function checkStringInPage(target: string, pageText: string): boolean {
  if (!target || !pageText) return false;
  const cleanTargetTr = normalizeTurkish(target);
  const cleanTargetAscii = normalizeAscii(target);
  const cleanTargetCompacted = normalizeCompacted(target);

  if (cleanTargetTr.length < 2) return false;

  const pageTr = normalizeTurkish(pageText);
  const pageAscii = normalizeAscii(pageText);
  const pageCompacted = normalizeCompacted(pageText);

  if (pageTr.includes(cleanTargetTr) || pageAscii.includes(cleanTargetAscii)) {
    return true;
  }
  if (cleanTargetCompacted.length >= 4 && pageCompacted.includes(cleanTargetCompacted)) {
    return true;
  }
  return false;
}

// Fallback token evaluator if neither full title, nor 20 chars, nor 15 chars matched
export function evaluatePageTokens(queryText: string, pageStr: string): PageMatchEvaluation {
  const cleanTr = normalizeTurkish(queryText);
  const cleanAscii = normalizeAscii(queryText);
  const cleanCompacted = normalizeCompacted(queryText);

  if (!cleanTr || cleanTr.length < 2) {
    return { isMatch: false, score: 0, matchType: 'none', matchedWords: [] };
  }

  const pageTr = normalizeTurkish(pageStr);
  const pageAscii = normalizeAscii(pageStr);
  const pageCompacted = normalizeCompacted(pageStr);

  // Split query into tokens
  const wordsTr = cleanTr.split(' ').filter((w) => w.length >= 2);
  const wordsAscii = cleanAscii.split(' ').filter((w) => w.length >= 2);

  // Core distinctive tokens (filtering out company stop words, unless all words are stop words)
  let coreTokensTr = wordsTr.filter((w) => !COMPANY_STOP_WORDS.has(w) && w.length >= 2);
  let coreTokensAscii = wordsAscii.filter((w) => !COMPANY_STOP_WORDS.has(w) && w.length >= 2);

  if (coreTokensTr.length === 0) {
    coreTokensTr = wordsTr;
    coreTokensAscii = wordsAscii;
  }

  // Extract page word lists for token-level checks
  const pageWordsTr = pageTr.split(/\s+/).filter((w) => w.length >= 2);
  const pageWordsAscii = pageAscii.split(/\s+/).filter((w) => w.length >= 2);

  const matchedWords: string[] = [];
  let totalScore = 0;
  let exactTokenMatches = 0;
  let partialOrFuzzyMatches = 0;

  for (let i = 0; i < coreTokensTr.length; i++) {
    const tTr = coreTokensTr[i];
    const tAscii = coreTokensAscii[i] || tTr;

    // Check direct inclusion on page
    const directIncluded = pageTr.includes(tTr) || pageAscii.includes(tAscii);
    if (directIncluded) {
      matchedWords.push(tTr.toUpperCase());
      exactTokenMatches++;
      totalScore += 35;
      continue;
    }

    // Check fuzzy or prefix match against any page word
    let wordFuzzyFound = false;
    for (const pw of pageWordsTr) {
      if (isTokenFuzzyMatch(tTr, pw)) {
        matchedWords.push(pw.toUpperCase());
        wordFuzzyFound = true;
        break;
      }
    }

    if (!wordFuzzyFound) {
      for (const pw of pageWordsAscii) {
        if (isTokenFuzzyMatch(tAscii, pw)) {
          matchedWords.push(pw.toUpperCase());
          wordFuzzyFound = true;
          break;
        }
      }
    }

    if (wordFuzzyFound) {
      partialOrFuzzyMatches++;
      totalScore += 25;
    }
  }

  const totalMatchedTokens = exactTokenMatches + partialOrFuzzyMatches;

  if (totalMatchedTokens >= coreTokensTr.length && coreTokensTr.length > 0) {
    return {
      isMatch: true,
      score: 85 + exactTokenMatches * 2,
      matchType: exactTokenMatches === coreTokensTr.length ? 'exact' : 'partial',
      matchedWords,
    };
  }

  if (totalMatchedTokens >= 1) {
    const hasLongToken = coreTokensTr.some(
      (w, idx) =>
        (w.length >= 3 || /\d/.test(w)) &&
        (pageTr.includes(w) ||
          pageAscii.includes(coreTokensAscii[idx] || w) ||
          pageWordsTr.some((pw) => isTokenFuzzyMatch(w, pw)))
    );

    if (hasLongToken) {
      const isFuzzy = partialOrFuzzyMatches > 0 && exactTokenMatches === 0;
      return {
        isMatch: true,
        score: (isFuzzy ? 50 : 65) + totalMatchedTokens * 10,
        matchType: isFuzzy ? 'fuzzy' : 'partial',
        matchedWords,
      };
    }
  }

  for (const token of coreTokensAscii) {
    if (token.length >= 4 && pageCompacted.includes(token)) {
      return {
        isMatch: true,
        score: 55,
        matchType: 'partial',
        matchedWords: [token.toUpperCase()],
      };
    }
  }

  return { isMatch: false, score: 0, matchType: 'none', matchedWords: [] };
}

export const CariMuavinPdfView: React.FC<CariMuavinPdfViewProps> = ({
  initialSite,
  initialFirma = '',
  onBackToTalepler,
  onBackToSantiyeListesi,
  onOpenCariModal,
}) => {
  // Current active site for PDF
  const [activeSite, setActiveSite] = useState<SiteConfig>(initialSite);

  // Search query (firma ünvanı from textbox)
  const [searchQuery, setSearchQuery] = useState<string>(initialFirma);
  const [submittedQuery, setSubmittedQuery] = useState<string>(initialFirma);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialFirma !== undefined) {
      setSearchQuery(initialFirma);
      setSubmittedQuery(initialFirma);
    }
  }, [initialFirma]);

  useEffect(() => {
    if (initialSite) {
      setActiveSite(initialSite);
    }
  }, [initialSite]);

  // PDF Document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>('1');

  // Zoom scale: Default 200% as requested ("PDF İ %200 YAKINLAŞTI")
  const [scale, setScale] = useState<number>(2.0);

  // PDF Source information
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);

  // Search & Match states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [matchedPages, setMatchedPages] = useState<number[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [matchInfo, setMatchInfo] = useState<PageMatchEvaluation | null>(null);

  // Fullscreen container
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cariModalOpen, setCariModalOpen] = useState<boolean>(false);

  // Canvas rendering refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRenderTaskRef = useRef<any>(null);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);

  // Local file upload for fallback if bucket empty
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced auto-search when user types into the Firma Ünvanı textbox
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== submittedQuery.trim()) {
        setSubmittedQuery(searchQuery.trim());
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, submittedQuery]);

  // 1. Fetch PDF URL when activeSite changes
  useEffect(() => {
    let isMounted = true;

    async function loadPdf() {
      setIsLoadingPdf(true);
      setStorageError(null);
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      setPageInputValue('1');
      setMatchedPages([]);
      setHasSearched(false);
      setMatchInfo(null);

      try {
        const info = await getMuavinPdfInfo(activeSite.id);
        if (!isMounted) return;

        if (info.url) {
          setPdfUrl(info.url);
          setFileName(info.fileName || 'muavin.pdf');
        } else {
          setPdfUrl(null);
          setStorageError(info.error || 'PDF dosyası bulunamadı.');
          setIsLoadingPdf(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStorageError(err.message || 'PDF bilgisi alınırken hata oluştu.');
        setIsLoadingPdf(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [activeSite]);

  const pageTextsCacheRef = useRef<Map<number, string>>(new Map());

  // 2. Load PDF document into pdfjs
  useEffect(() => {
    if (!pdfUrl) return;

    let isMounted = true;
    setIsLoadingPdf(true);
    pageTextsCacheRef.current.clear();

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: PDF_CMAPS_URL,
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInputValue('1');
        setIsLoadingPdf(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('PDF yükleme hatası:', err);
        setStorageError(`PDF belgesi yüklenemedi: ${err.message || err}`);
        setIsLoadingPdf(false);
      });

    return () => {
      isMounted = false;
      try {
        loadingTask.destroy();
      } catch {
        // ignore
      }
    };
  }, [pdfUrl]);

  // 3. Sequential 3-Stage Search inside PDF as requested by user:
  // "CARİ KOTROL ET BUTONUNA TIKLANDIĞINDA PDF DE FİRMA ÜNVANI ARAMASINI ÖNCE FİRMANIN TAM ÜNVANIYLA ARA,
  // CARİ ÜNVAN BULUNMAZSA İLK 20 SONRA 15 KARAKTERLE ARAMA YAP"
  const executeSearch = useCallback(
    async (queryText: string, doc: pdfjsLib.PDFDocumentProxy) => {
      const rawQuery = queryText.trim();
      const cleanTr = normalizeTurkish(rawQuery);
      if (!cleanTr || cleanTr.length < 2) {
        setMatchedPages([]);
        setHasSearched(false);
        setMatchInfo(null);
        return;
      }

      setIsSearching(true);
      setSearchProgress(0);
      setHasSearched(true);

      const total = doc.numPages;
      const allPageTexts: { page: number; text: string }[] = [];

      // Step 0: Extract or fetch cached page texts in batches
      const batchSize = 25;
      for (let b = 1; b <= total; b += batchSize) {
        const batchEnd = Math.min(b + batchSize - 1, total);
        const promises = [];

        for (let p = b; p <= batchEnd; p++) {
          if (pageTextsCacheRef.current.has(p)) {
            allPageTexts.push({ page: p, text: pageTextsCacheRef.current.get(p)! });
          } else {
            promises.push(
              doc.getPage(p).then(async (page) => {
                try {
                  const textContent = await page.getTextContent();
                  const pageStr = textContent.items
                    .map((item: any) => item.str || '')
                    .join(' ');
                  pageTextsCacheRef.current.set(p, pageStr);
                  return { page: p, text: pageStr };
                } catch (e) {
                  return { page: p, text: '' };
                }
              })
            );
          }
        }

        if (promises.length > 0) {
          const batchResults = await Promise.all(promises);
          for (const res of batchResults) {
            allPageTexts.push(res);
          }
        }

        setSearchProgress(Math.min(85, Math.round((batchEnd / total) * 85)));
      }

      allPageTexts.sort((a, b) => a.page - b.page);

      // =========================================================================
      // AŞAMA 1: ÖNCE FİRMANIN TAM ÜNVANIYLA ARA
      // =========================================================================
      const stage1Matches: number[] = [];
      for (const item of allPageTexts) {
        if (checkStringInPage(rawQuery, item.text)) {
          stage1Matches.push(item.page);
        }
      }

      if (stage1Matches.length > 0) {
        setMatchedPages(stage1Matches);
        setMatchInfo({
          isMatch: true,
          score: 100,
          matchType: 'exact',
          matchedWords: [rawQuery],
        });
        setIsSearching(false);
        setSearchProgress(100);

        const targetPage = stage1Matches[0];
        setCurrentPage(targetPage);
        setPageInputValue(String(targetPage));
        setCurrentMatchIndex(0);

        setTimeout(() => {
          canvasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
        return;
      }

      // =========================================================================
      // AŞAMA 2: CARİ ÜNVAN BULUNMAZSA İLK 20 KARAKTERLE ARAMA YAP
      // =========================================================================
      const rawFirst20 = rawQuery.slice(0, 20).trim();
      const first20Tr = cleanTr.slice(0, 20).trim();

      if (first20Tr.length >= 3) {
        const stage2Matches: number[] = [];
        for (const item of allPageTexts) {
          if (checkStringInPage(rawFirst20, item.text)) {
            stage2Matches.push(item.page);
          }
        }

        if (stage2Matches.length > 0) {
          setMatchedPages(stage2Matches);
          setMatchInfo({
            isMatch: true,
            score: 95,
            matchType: 'first20',
            matchedWords: [rawFirst20],
          });
          setIsSearching(false);
          setSearchProgress(100);

          const targetPage = stage2Matches[0];
          setCurrentPage(targetPage);
          setPageInputValue(String(targetPage));
          setCurrentMatchIndex(0);

          setTimeout(() => {
            canvasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 150);
          return;
        }
      }

      // =========================================================================
      // AŞAMA 3: İLK 20 İLE DE BULUNMAZSA SONRA 15 KARAKTERLE ARAMA YAP
      // =========================================================================
      const rawFirst15 = rawQuery.slice(0, 15).trim();
      const first15Tr = cleanTr.slice(0, 15).trim();

      if (first15Tr.length >= 3) {
        const stage3Matches: number[] = [];
        for (const item of allPageTexts) {
          if (checkStringInPage(rawFirst15, item.text)) {
            stage3Matches.push(item.page);
          }
        }

        if (stage3Matches.length > 0) {
          setMatchedPages(stage3Matches);
          setMatchInfo({
            isMatch: true,
            score: 90,
            matchType: 'first15',
            matchedWords: [rawFirst15],
          });
          setIsSearching(false);
          setSearchProgress(100);

          const targetPage = stage3Matches[0];
          setCurrentPage(targetPage);
          setPageInputValue(String(targetPage));
          setCurrentMatchIndex(0);

          setTimeout(() => {
            canvasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 150);
          return;
        }
      }

      // =========================================================================
      // AŞAMA 4: İLK 15 İLE DE BULUNMAZSA SONRA 10 KARAKTERLE ARAMA YAP
      // =========================================================================
      const rawFirst10 = rawQuery.slice(0, 10).trim();
      const first10Tr = cleanTr.slice(0, 10).trim();

      if (first10Tr.length >= 3) {
        const stage4Matches: number[] = [];
        for (const item of allPageTexts) {
          if (checkStringInPage(rawFirst10, item.text)) {
            stage4Matches.push(item.page);
          }
        }

        if (stage4Matches.length > 0) {
          setMatchedPages(stage4Matches);
          setMatchInfo({
            isMatch: true,
            score: 85,
            matchType: 'first10',
            matchedWords: [rawFirst10],
          });
          setIsSearching(false);
          setSearchProgress(100);

          const targetPage = stage4Matches[0];
          setCurrentPage(targetPage);
          setPageInputValue(String(targetPage));
          setCurrentMatchIndex(0);

          setTimeout(() => {
            canvasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 150);
          return;
        }
      }

      // =========================================================================
      // AŞAMA 5: İLK 10 İLE DE BULUNMAZSA SONRA 5 KARAKTERLE ARAMA YAP
      // =========================================================================
      const rawFirst5 = rawQuery.slice(0, 5).trim();
      const first5Tr = cleanTr.slice(0, 5).trim();

      if (first5Tr.length >= 3) {
        const stage5Matches: number[] = [];
        for (const item of allPageTexts) {
          if (checkStringInPage(rawFirst5, item.text)) {
            stage5Matches.push(item.page);
          }
        }

        if (stage5Matches.length > 0) {
          setMatchedPages(stage5Matches);
          setMatchInfo({
            isMatch: true,
            score: 80,
            matchType: 'first5',
            matchedWords: [rawFirst5],
          });
          setIsSearching(false);
          setSearchProgress(100);

          const targetPage = stage5Matches[0];
          setCurrentPage(targetPage);
          setPageInputValue(String(targetPage));
          setCurrentMatchIndex(0);

          setTimeout(() => {
            canvasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 150);
          return;
        }
      }

      // =========================================================================
      // AŞAMA 6: DESTEKLEYİCİ KELİME TABANLI ARAMA (FALLBACK)
      // =========================================================================
      const stageFallbackMatches: { page: number; score: number; matchedWords: string[] }[] = [];
      for (const item of allPageTexts) {
        const evaluation = evaluatePageTokens(rawQuery, item.text);
        if (evaluation.isMatch) {
          stageFallbackMatches.push({
            page: item.page,
            score: evaluation.score,
            matchedWords: evaluation.matchedWords,
          });
        }
      }

      if (stageFallbackMatches.length > 0) {
        stageFallbackMatches.sort((a, b) => b.score - a.score || a.page - b.page);
        const matchedPageNumbers = stageFallbackMatches.map((m) => m.page);
        setMatchedPages(matchedPageNumbers);
        setMatchInfo({
          isMatch: true,
          score: stageFallbackMatches[0].score,
          matchType: 'partial',
          matchedWords: stageFallbackMatches[0].matchedWords,
        });
        setIsSearching(false);
        setSearchProgress(100);

        const targetPage = matchedPageNumbers[0];
        setCurrentPage(targetPage);
        setPageInputValue(String(targetPage));
        setCurrentMatchIndex(0);

        setTimeout(() => {
          canvasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
        return;
      }

      // =========================================================================
      // AŞAMA 5: HİÇBİR AŞAMADA BULUNAMADI
      // =========================================================================
      setMatchedPages([]);
      setMatchInfo(null);
      setIsSearching(false);
      setSearchProgress(100);
    },
    []
  );

  // Trigger search when PDF loads or query changes
  useEffect(() => {
    if (pdfDoc && submittedQuery && submittedQuery.trim()) {
      executeSearch(submittedQuery, pdfDoc);
    }
  }, [pdfDoc, submittedQuery, executeSearch]);

  // 4. Render active page on canvas at current scale (200% default) + Highlight matching Firma
  useEffect(() => {
    if (!pdfDoc || currentPage < 1 || currentPage > numPages) return;

    let isMounted = true;
    setIsRenderingPage(true);

    // Cancel any ongoing render
    if (currentRenderTaskRef.current) {
      currentRenderTaskRef.current.cancel();
      currentRenderTaskRef.current = null;
    }

    pdfDoc
      .getPage(currentPage)
      .then(async (page) => {
        if (!isMounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale: scale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform,
        };

        const renderTask = page.render(renderContext);
        currentRenderTaskRef.current = renderTask;

        await renderTask.promise;

        // Highlight matching text on canvas if a query exists (with partial & fuzzy support)
        if (isMounted && submittedQuery && submittedQuery.trim().length >= 2) {
          try {
            const textContent = await page.getTextContent();
            const items = textContent.items as any[];
            const cleanTr = normalizeTurkish(submittedQuery);
            const cleanAscii = normalizeAscii(submittedQuery);
            const cleanCompacted = normalizeCompacted(submittedQuery);

            const first20Tr = cleanTr.slice(0, 20).trim();
            const first20Ascii = cleanAscii.slice(0, 20).trim();
            const first20Compacted = cleanCompacted.slice(0, 20);

            const first15Tr = cleanTr.slice(0, 15).trim();
            const first15Ascii = cleanAscii.slice(0, 15).trim();
            const first15Compacted = cleanCompacted.slice(0, 15);

            const first10Tr = cleanTr.slice(0, 10).trim();
            const first10Ascii = cleanAscii.slice(0, 10).trim();
            const first10Compacted = cleanCompacted.slice(0, 10);

            const first5Tr = cleanTr.slice(0, 5).trim();
            const first5Ascii = cleanAscii.slice(0, 5).trim();
            const first5Compacted = cleanCompacted.slice(0, 5);

            const queryWordsTr = cleanTr.split(' ').filter((w) => w.length >= 2);
            const queryWordsAscii = cleanAscii.split(' ').filter((w) => w.length >= 2);
            const coreTokensTr = queryWordsTr.filter((w) => !COMPANY_STOP_WORDS.has(w));
            const activeTokens = coreTokensTr.length > 0 ? coreTokensTr : queryWordsTr;

            context.save();
            const s = outputScale;

            for (const item of items) {
              const itemStr = item.str || '';
              if (!itemStr.trim()) continue;

              const itemTr = normalizeTurkish(itemStr);
              const itemAscii = normalizeAscii(itemStr);
              const itemCompacted = normalizeCompacted(itemStr);

              // 1. Exact phrase or compacted match
              const isExact =
                itemTr.includes(cleanTr) ||
                itemAscii.includes(cleanAscii) ||
                (cleanCompacted.length >= 4 && itemCompacted.includes(cleanCompacted));

              // 2. First 20 characters match
              const isFirst20 =
                first20Tr.length >= 3 &&
                (itemTr.includes(first20Tr) ||
                  itemAscii.includes(first20Ascii) ||
                  (first20Compacted.length >= 3 && itemCompacted.includes(first20Compacted)));

              // 3. First 15 characters match
              const isFirst15 =
                first15Tr.length >= 3 &&
                (itemTr.includes(first15Tr) ||
                  itemAscii.includes(first15Ascii) ||
                  (first15Compacted.length >= 3 && itemCompacted.includes(first15Compacted)));

              // 4. First 10 characters match
              const isFirst10 =
                first10Tr.length >= 3 &&
                (itemTr.includes(first10Tr) ||
                  itemAscii.includes(first10Ascii) ||
                  (first10Compacted.length >= 3 && itemCompacted.includes(first10Compacted)));

              // 5. First 5 characters match
              const isFirst5 =
                first5Tr.length >= 3 &&
                (itemTr.includes(first5Tr) ||
                  itemAscii.includes(first5Ascii) ||
                  (first5Compacted.length >= 3 && itemCompacted.includes(first5Compacted)));

              // 6. Token, stem, or fuzzy match
              let isTokenMatch = false;
              if (!isExact && !isFirst20 && !isFirst15 && !isFirst10 && !isFirst5) {
                for (let i = 0; i < activeTokens.length; i++) {
                  const tTr = activeTokens[i];
                  const tAsc = queryWordsAscii[i] || tTr;
                  if (itemTr.includes(tTr) || itemAscii.includes(tAsc)) {
                    isTokenMatch = true;
                    break;
                  }
                  const itemWords = itemTr.split(/\s+/);
                  for (const iw of itemWords) {
                    if (isTokenFuzzyMatch(tTr, iw)) {
                      isTokenMatch = true;
                      break;
                    }
                  }
                  if (isTokenMatch) break;
                }
              }

              const isMatch = isExact || isFirst20 || isFirst15 || isFirst10 || isFirst5 || isTokenMatch;

              if (isMatch && item.transform) {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                const itemWidth = (item.width || 45) * scale;
                const itemHeight = (item.height || 14) * scale;

                // Color distinction based on match level
                if (isExact) {
                  context.fillStyle = 'rgba(250, 204, 21, 0.60)';
                  context.strokeStyle = 'rgba(217, 119, 6, 0.95)';
                  context.lineWidth = 2.5 * s;
                } else if (isFirst20) {
                  context.fillStyle = 'rgba(56, 189, 248, 0.50)';
                  context.strokeStyle = 'rgba(2, 132, 199, 0.95)';
                  context.lineWidth = 2.5 * s;
                } else if (isFirst15) {
                  context.fillStyle = 'rgba(251, 146, 60, 0.50)';
                  context.strokeStyle = 'rgba(234, 88, 12, 0.95)';
                  context.lineWidth = 2.5 * s;
                } else if (isFirst10) {
                  context.fillStyle = 'rgba(249, 115, 22, 0.50)';
                  context.strokeStyle = 'rgba(194, 65, 12, 0.95)';
                  context.lineWidth = 2.5 * s;
                } else if (isFirst5) {
                  context.fillStyle = 'rgba(168, 85, 247, 0.45)';
                  context.strokeStyle = 'rgba(126, 34, 206, 0.95)';
                  context.lineWidth = 2.5 * s;
                } else {
                  context.fillStyle = 'rgba(251, 191, 36, 0.38)';
                  context.strokeStyle = 'rgba(217, 119, 6, 0.85)';
                  context.lineWidth = 2 * s;
                }

                context.fillRect(
                  vx * s - 2 * s,
                  (vy - itemHeight) * s,
                  itemWidth * s + 4 * s,
                  itemHeight * s + 2 * s
                );
                context.strokeRect(
                  vx * s - 2 * s,
                  (vy - itemHeight) * s,
                  itemWidth * s + 4 * s,
                  itemHeight * s + 2 * s
                );
              }
            }
            context.restore();
          } catch (hlErr) {
            // ignore highlight errors
          }
        }
      })
      .then(() => {
        if (isMounted) {
          setIsRenderingPage(false);
          currentRenderTaskRef.current = null;
        }
      })
      .catch((err) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Sayfa render hatası:', err);
        }
        if (isMounted) {
          setIsRenderingPage(false);
        }
      });

    return () => {
      isMounted = false;
      if (currentRenderTaskRef.current) {
        currentRenderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale, numPages, submittedQuery]);

  // Page input change & commit
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputValue, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setPageInputValue(String(currentPage));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const nextP = currentPage - 1;
      setCurrentPage(nextP);
      setPageInputValue(String(nextP));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      setPageInputValue(String(nextP));
    }
  };

  // Match navigation
  const handlePrevMatch = () => {
    if (matchedPages.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchedPages.length) % matchedPages.length;
    setCurrentMatchIndex(prevIdx);
    const targetPage = matchedPages[prevIdx];
    setCurrentPage(targetPage);
    setPageInputValue(String(targetPage));
  };

  const handleNextMatch = () => {
    if (matchedPages.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedPages.length;
    setCurrentMatchIndex(nextIdx);
    const targetPage = matchedPages[nextIdx];
    setCurrentPage(targetPage);
    setPageInputValue(String(targetPage));
  };

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom200 = () => setScale(2.0); // 200% reset

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Custom local file selection for testing/viewing
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const objectUrl = URL.createObjectURL(file);
      setPdfUrl(objectUrl);
      setFileName(file.name);
      setStorageError(null);
    }
  };

  const activeMapping = MUAVIN_SITE_MAPPINGS[activeSite.id] || MUAVIN_SITE_MAPPINGS['arnavutkoy'];

  // Check if current page is one of the matched pages
  const isCurrentPageMatched = matchedPages.includes(currentPage);

  return (
    <div
      ref={containerRef}
      id="cari-muavin-pdf-page"
      className="min-h-screen bg-[#050c1e] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* 1. TOP HEADER BAR (Dark Blue, Koyu Mavi) */}
      <header className="sticky top-0 z-40 bg-[#071329] border-b border-blue-900/80 shadow-2xl backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3">
          {/* Upper row: Return button + Title + Site tabs + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Prominent Return button requested by user */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="btn-return-talep-listesi"
                onClick={onBackToTalepler}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-950/60 border border-blue-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4 text-white shrink-0" />
                <span className="tracking-wide">TALEPLERE DÖN</span>
              </button>

              {onBackToSantiyeListesi && (
                <button
                  id="btn-return-santiye-listesi"
                  onClick={onBackToSantiyeListesi}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white font-bold text-xs shadow-md border border-blue-600/50 cursor-pointer transition-all"
                  title="Şantiye & Birim Listesi Sayfasına Dön"
                >
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>ŞANTİYE LİSTESİ</span>
                </button>
              )}

              <div className="h-7 w-px bg-blue-800/60 hidden md:block" />

              <div className="hidden sm:flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <FileText className="w-4 h-4" />
                </span>
                <div>
                  <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>CARİ MUAVİN PDF İNCELEME</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700/60 text-blue-300 text-xs font-mono font-bold">
                      {activeSite.name}
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-400">
                    Supabase: <code className="text-sky-300">MUAVINLER/{activeMapping.folder}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Quick actions (Cari Hesap Hareketleri modal, Download, New tab, Fullscreen) */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                id="btn-open-database-cari"
                onClick={() => setCariModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0d2247] hover:bg-[#122e60] text-sky-200 border border-sky-500/40 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Veritabanı kayıtlarında cari hareketlerini ve İBAN listesini göster"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">Cari Hareketleri & İBAN</span>
              </button>

              {pdfUrl && (
                <>
                  <a
                    id="btn-download-pdf"
                    href={pdfUrl}
                    download={fileName || 'muavin.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b1b36] hover:bg-[#10274f] text-slate-300 hover:text-white border border-blue-900 text-xs font-semibold transition-all cursor-pointer"
                    title="PDF İndir"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden lg:inline">İndir</span>
                  </a>

                  <a
                    id="btn-open-external-pdf"
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b1b36] hover:bg-[#10274f] text-slate-300 hover:text-white border border-blue-900 text-xs font-semibold transition-all cursor-pointer"
                    title="Yeni Sekmede Aç"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden lg:inline">Yeni Sekme</span>
                  </a>
                </>
              )}

              <button
                id="btn-toggle-fullscreen"
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl bg-[#0b1b36] hover:bg-[#10274f] text-slate-300 hover:text-white border border-blue-900 transition-all cursor-pointer"
                title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 7 Site Tabs:
              ARNAVUTKÖY, MAMAK-ANKARA, ŞENBAY-ÖZKA, MERKEZ-ÖZKA, MSB ÖZKA, SEKA, DİĞER */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-blue-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>ŞANTİYE MUAVİNLERİ:</span>
            </span>
            {SITES.map((site) => {
              const isSelected = site.id === activeSite.id;
              const mapping = MUAVIN_SITE_MAPPINGS[site.id];
              return (
                <button
                  key={site.id}
                  id={`btn-pdf-site-${site.id}`}
                  onClick={() => setActiveSite(site)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-950/80 ring-2 ring-blue-500/40'
                      : 'bg-[#0a1730] text-slate-300 hover:text-white hover:bg-[#11244a] border-blue-950'
                  }`}
                >
                  <span>{site.name}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({mapping?.folder || site.code})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary Search & Firma Ünvanı Control Bar */}
          <div className="bg-[#091834] border border-blue-900/60 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3">
            {/* Dedicated "FİRMA ÜNVANI" search form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedQuery(searchQuery.trim());
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-[320px] max-w-2xl"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2.5 py-1.5 rounded-lg bg-blue-950 border border-blue-600/70 text-sky-200 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 shadow-sm">
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  <span>FİRMA ÜNVANI:</span>
                </span>
              </div>

              <div className="relative flex-1">
                <Search className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="input-pdf-search-firma"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Firma Ünvanı / Cari Adı yazınız (tam veya ilk 10 karakter ile otomatik bulur)..."
                  className="w-full bg-[#050f24] border-2 border-blue-700 focus:border-sky-400 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-semibold transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSubmittedQuery('');
                      setMatchedPages([]);
                      setHasSearched(false);
                      setMatchInfo(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold px-1"
                    title="Temizle"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* İlk 20 Karakterle Hızlı Sorgula */}
              {searchQuery.trim().length > 20 && (
                <button
                  type="button"
                  id="btn-quick-search-first20"
                  onClick={() => {
                    const first20 = searchQuery.trim().slice(0, 20);
                    setSearchQuery(first20);
                    setSubmittedQuery(first20);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-500/70 text-sky-200 text-xs font-bold flex items-center gap-1 shadow transition-all shrink-0 cursor-pointer"
                  title={`"${searchQuery.trim().slice(0, 20)}" ilk 20 karakteri ile sorgula`}
                >
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>İlk 20 Krk</span>
                </button>
              )}

              {/* İlk 15 Karakterle Hızlı Sorgula */}
              {searchQuery.trim().length > 15 && (
                <button
                  type="button"
                  id="btn-quick-search-first15"
                  onClick={() => {
                    const first15 = searchQuery.trim().slice(0, 15);
                    setSearchQuery(first15);
                    setSubmittedQuery(first15);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-500/70 text-amber-200 text-xs font-bold flex items-center gap-1 shadow transition-all shrink-0 cursor-pointer"
                  title={`"${searchQuery.trim().slice(0, 15)}" ilk 15 karakteri ile sorgula`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>İlk 15 Krk</span>
                </button>
              )}

              <button
                type="submit"
                id="btn-search-pdf"
                disabled={isSearching}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Aranıyor (%{searchProgress})</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Cari Görüntüle</span>
                  </>
                )}
              </button>
            </form>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                id="btn-prev-page"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isRenderingPage}
                className="p-1.5 rounded-lg bg-[#071329] border border-blue-900 text-slate-300 hover:text-white hover:bg-blue-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Önceki Sayfa"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Sayfa</span>
                <input
                  id="input-page-number"
                  type="text"
                  value={pageInputValue}
                  onChange={(e) => setPageInputValue(e.target.value)}
                  className="w-12 bg-[#050f24] border border-blue-800 text-center rounded px-1 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-400 font-mono">/ {numPages || 1}</span>
              </form>

              <button
                id="btn-next-page"
                onClick={handleNextPage}
                disabled={currentPage >= numPages || isRenderingPage}
                className="p-1.5 rounded-lg bg-[#071329] border border-blue-900 text-slate-300 hover:text-white hover:bg-blue-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Sonraki Sayfa"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls: Default 200% as requested ("PDF İ %200 YAKINLAŞTI") */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 hidden xl:inline">Yakınlaştırma:</span>
              <button
                id="btn-zoom-out"
                onClick={handleZoomOut}
                disabled={scale <= 0.75}
                className="p-1.5 rounded-lg bg-[#071329] border border-blue-900 text-slate-300 hover:text-white hover:bg-blue-900/40 disabled:opacity-30 transition-all cursor-pointer"
                title="Uzaklaştır (%25)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {/* 200% Zoom Reset Button */}
              <button
                id="btn-zoom-200"
                onClick={handleResetZoom200}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                  Math.round(scale * 100) === 200
                    ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/40'
                    : 'bg-[#071329] text-sky-300 border-blue-900 hover:bg-blue-900/40'
                }`}
                title="%200 Varsayılan Yakınlaştırma"
              >
                %{Math.round(scale * 100)}
                {Math.round(scale * 100) === 200 && ' (200%)'}
              </button>

              <button
                id="btn-zoom-in"
                onClick={handleZoomIn}
                disabled={scale >= 4.0}
                className="p-1.5 rounded-lg bg-[#071329] border border-blue-900 text-slate-300 hover:text-white hover:bg-blue-900/40 disabled:opacity-30 transition-all cursor-pointer"
                title="Yakınlaştır (%25)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Preset buttons */}
              <div className="hidden lg:flex items-center gap-1 ml-1">
                {[1.0, 1.5, 2.0, 2.5].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setScale(preset)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-all border ${
                      scale === preset
                        ? 'bg-blue-600 text-white border-blue-400 font-bold'
                        : 'bg-[#050f24] text-slate-400 hover:text-white border-blue-950'
                    }`}
                  >
                    %{preset * 100}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. SEARCH RESULT BANNER (Prominent user requirement:
          "SAYFA AÇILDIĞINDA KONTROL EDİLEN TALEP CARİSİ FİRMA ÜNVANINI PDF DOSYASI İÇERİSİNDE BUL VE O SAYFAYA GİT"
          "FİRMA ÜNVANI İSİMLİ CARİ DOSYADA YOKSA CARİ BULUNMAMAKTADIR BİLGİSİNİ VERSİN") */}
      {hasSearched && submittedQuery && (
        <div className="max-w-[1920px] mx-auto w-full px-3 sm:px-6 pt-3">
          {matchedPages.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                    <span>CARİ FİRMA BULUNDU VE SAYFA GÖRÜNTÜLENDİ!</span>
                    <span className="px-2 py-0.5 bg-emerald-900 text-emerald-300 rounded font-mono text-xs border border-emerald-700">
                      {matchedPages.length} Sayfada Geçiyor
                    </span>
                    {matchInfo?.matchType === 'exact' ? (
                      <span className="px-2 py-0.5 bg-emerald-800/90 text-white rounded font-bold text-[11px] border border-emerald-500 shadow-sm flex items-center gap-1">
                        <span>✓ TAM ÜNVAN EŞLEŞTİ</span>
                      </span>
                    ) : matchInfo?.matchType === 'first20' ? (
                      <span className="px-2 py-0.5 bg-sky-800 text-white rounded font-bold text-[11px] border border-sky-400 shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 text-sky-200" />
                        <span>⚡ İLK 20 KARAKTER İLE BULUNDU</span>
                      </span>
                    ) : matchInfo?.matchType === 'first15' ? (
                      <span className="px-2 py-0.5 bg-amber-700 text-white rounded font-bold text-[11px] border border-amber-400 shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-200" />
                        <span>⚡ İLK 15 KARAKTER İLE BULUNDU</span>
                      </span>
                    ) : matchInfo?.matchType === 'first10' ? (
                      <span className="px-2 py-0.5 bg-orange-700 text-white rounded font-bold text-[11px] border border-orange-400 shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 text-orange-200" />
                        <span>⚡ İLK 10 KARAKTER İLE BULUNDU</span>
                      </span>
                    ) : matchInfo?.matchType === 'first5' ? (
                      <span className="px-2 py-0.5 bg-purple-700 text-white rounded font-bold text-[11px] border border-purple-400 shadow-sm flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-200" />
                        <span>⚡ İLK 5 KARAKTER İLE BULUNDU</span>
                      </span>
                    ) : matchInfo?.matchType === 'fuzzy' ? (
                      <span className="px-2 py-0.5 bg-amber-800/90 text-amber-100 rounded font-bold text-[11px] border border-amber-500 shadow-sm">
                        ≈ YAZIM TOLERANSLI EŞLEŞME
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-sky-800/90 text-sky-100 rounded font-bold text-[11px] border border-sky-400 shadow-sm">
                        ⚲ KISMİ / KELİME EŞLEŞMESİ
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-300 mt-1 flex flex-wrap items-center gap-2">
                    <span>
                      <strong>"{submittedQuery}"</strong> carisi{' '}
                      <span className="underline font-bold text-white">Sayfa {currentPage}</span>{' '}
                      üzerinde görüntülendi.
                    </span>
                    {matchInfo?.matchType === 'first20' && matchInfo?.matchedWords?.[0] && (
                      <span className="bg-sky-950/90 border border-sky-500/80 text-sky-200 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-sky-400" />
                        <span>Tam ünvan bulunamadı, ilk 20 karakter ("<strong>{matchInfo.matchedWords[0]}</strong>") ile bulundu.</span>
                      </span>
                    )}
                    {matchInfo?.matchType === 'first15' && matchInfo?.matchedWords?.[0] && (
                      <span className="bg-amber-950/90 border border-amber-500/80 text-amber-200 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>İlk 20 karakterde bulunamadı, ilk 15 karakter ("<strong>{matchInfo.matchedWords[0]}</strong>") ile bulundu.</span>
                      </span>
                    )}
                    {matchInfo?.matchType === 'first10' && matchInfo?.matchedWords?.[0] && (
                      <span className="bg-orange-950/90 border border-orange-500/80 text-orange-200 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-orange-400" />
                        <span>İlk 15 karakterde bulunamadı, ilk 10 karakter ("<strong>{matchInfo.matchedWords[0]}</strong>") ile bulundu.</span>
                      </span>
                    )}
                    {matchInfo?.matchType === 'first5' && matchInfo?.matchedWords?.[0] && (
                      <span className="bg-purple-950/90 border border-purple-500/80 text-purple-200 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-400" />
                        <span>İlk 10 karakterde bulunamadı, ilk 5 karakter ("<strong>{matchInfo.matchedWords[0]}</strong>") ile bulundu.</span>
                      </span>
                    )}
                    {matchInfo?.matchedWords && matchInfo.matchedWords.length > 0 && matchInfo.matchType !== 'exact' && matchInfo.matchType !== 'first20' && matchInfo.matchType !== 'first15' && matchInfo.matchType !== 'first10' && matchInfo.matchType !== 'first5' && (
                      <span className="bg-emerald-900/90 border border-emerald-600/80 text-emerald-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        Tespit Edilen Kelimeler: <strong>{matchInfo.matchedWords.join(', ')}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Match selector */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handlePrevMatch}
                  disabled={matchedPages.length <= 1}
                  className="px-2.5 py-1 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-100 text-xs font-semibold flex items-center gap-1 border border-emerald-700/60 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Önceki Eşleşme</span>
                </button>
                <span className="text-xs font-mono text-emerald-200 px-1">
                  {currentMatchIndex + 1} / {matchedPages.length}
                </span>
                <button
                  onClick={handleNextMatch}
                  disabled={matchedPages.length <= 1}
                  className="px-2.5 py-1 rounded bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-100 text-xs font-semibold flex items-center gap-1 border border-emerald-700/60 cursor-pointer"
                >
                  <span>Sonraki Eşleşme</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Quick page pills */}
                <div className="hidden md:flex items-center gap-1 ml-2 max-w-xs overflow-x-auto">
                  {matchedPages.slice(0, 8).map((pg, idx) => (
                    <button
                      key={pg}
                      onClick={() => {
                        setCurrentPage(pg);
                        setPageInputValue(String(pg));
                        setCurrentMatchIndex(idx);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-all ${
                        currentPage === pg
                          ? 'bg-emerald-500 text-black shadow'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                      }`}
                    >
                      S.{pg}
                    </button>
                  ))}
                  {matchedPages.length > 8 && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      +{matchedPages.length - 8}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Prominent requirement:
               "FİRMA ÜNVANI İSİMLİ CARİ DOSYADA YOKSA CARİ BULUNMAMAKTADIR BİLGİSİNİ VERSİN" */
            <div
              id="alert-cari-bulunmamaktadir"
              className="p-4 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-shake"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-900/80 border border-rose-600 text-rose-300 shrink-0 mt-0.5">
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-rose-200 tracking-wide uppercase flex items-center gap-2">
                    <span>CARİ BULUNMAMAKTADIR</span>
                    <span className="px-2 py-0.5 rounded bg-rose-900/90 border border-rose-700 text-xs font-mono">
                      {activeSite.name}
                    </span>
                  </h2>
                  <p className="text-sm text-rose-200/95 mt-1">
                    <strong>"{submittedQuery}"</strong> isimli cari{' '}
                    <strong>{activeSite.name}</strong> şantiyesinin muavin PDF dosyasında
                    bulunmamaktadır. (Önce tam ünvan, ardından ilk 20 ve ilk 15 karakterle arandı fakat eşleşme tespit edilemedi.)
                  </p>
                  {/* Quick site switch suggestions */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-rose-200/80">
                    <span className="text-[11px] font-semibold text-rose-300">
                      Diğer Şantiyelerde Arayabilirsiniz:
                    </span>
                    {SITES.filter((s) => s.id !== activeSite.id).slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSite(s)}
                        className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-100 font-bold border border-rose-700/60 cursor-pointer"
                      >
                        {s.name} PDF'inde Ara
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
                <button
                  onClick={() => setCariModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-bold border border-rose-600 shadow cursor-pointer transition-all"
                >
                  Veritabanında Ara
                </button>
                <button
                  onClick={() => {
                    setSubmittedQuery('');
                    setHasSearched(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800 cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MAIN PDF VIEWPORT */}
      <main className="flex-1 p-3 sm:p-6 flex flex-col items-center justify-start overflow-auto">
        {/* Loading state */}
        {isLoadingPdf && (
          <div className="my-auto flex flex-col items-center justify-center p-12 bg-[#09152b] border border-blue-900/60 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white">PDF Belgesi Yükleniyor...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Supabase Storage: <code className="text-sky-300">MUAVINLER/{activeMapping.folder}</code>
            </p>
            <div className="mt-4 w-full bg-blue-950 rounded-full h-2 overflow-hidden border border-blue-900">
              <div className="bg-sky-500 h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {/* Storage Error or missing PDF for MSB/SEKA/DİĞER */}
        {!isLoadingPdf && storageError && !pdfDoc && (
          <div className="my-auto max-w-xl w-full p-6 sm:p-8 rounded-2xl bg-[#09152b] border border-blue-800/80 shadow-2xl text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                {activeSite.name} Muavin Dosyası
              </h3>
              <p className="text-sm text-slate-300 mt-2">{storageError}</p>
              <p className="text-xs text-slate-400 mt-1">
                Supabase Storage Konumu:{' '}
                <span className="font-mono text-sky-300">MUAVINLER/{activeMapping.folder}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#050f24] border border-blue-900/60 text-left space-y-2 text-xs text-slate-300">
              <div className="font-bold text-sky-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Yüklü Şantiyeleri Seçebilirsiniz:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {['arnavutkoy', 'mamak_ankara', 'senbay_ozka', 'merkez_ozka'].map((sId) => {
                  const s = SITES.find((x) => x.id === sId);
                  if (!s) return null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSite(s)}
                      className="px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-white font-bold border border-blue-600/60 cursor-pointer"
                    >
                      {s.name} PDF'ini Aç
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={activeMapping.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Supabase Storage'da Klasörü Aç</span>
              </a>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#0d2247] hover:bg-[#122e60] text-sky-200 font-bold text-xs border border-sky-500/40 flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-sky-400" />
                <span>Bilgisayardan PDF Seç</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleLocalFileSelect}
              />
            </div>
          </div>
        )}

        {/* Canvas Display Container (Scaled at 200% default) */}
        {!isLoadingPdf && pdfDoc && (
          <div
            ref={canvasContainerRef}
            className="relative w-full flex flex-col items-center justify-center"
          >
            {/* Rendering spinner overlay */}
            {isRenderingPage && (
              <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-[#09152b]/90 border border-blue-700 text-sky-300 text-xs font-bold flex items-center gap-2 shadow-xl backdrop-blur">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sayfa %{Math.round(scale * 100)} yakınlaştırılıyor...</span>
              </div>
            )}

            {/* Matched page confirmation badge */}
            {isCurrentPageMatched && submittedQuery && (
              <div className="mb-2 px-4 py-1.5 rounded-full bg-emerald-900/90 border border-emerald-400/80 text-emerald-100 text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>
                  "{submittedQuery}" carisi bu sayfada (Sayfa {currentPage}) bulundu ve görüntülendi (%200 Zoom)
                </span>
              </div>
            )}

            {/* Document wrapper with scroll & border */}
            <div className="p-2 sm:p-4 rounded-2xl bg-[#071329] border border-blue-900/80 shadow-2xl overflow-auto max-w-full">
              <div className="relative inline-block bg-white shadow-2xl rounded-sm overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="block shadow-xl max-w-none"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>

            {/* Bottom Floating Nav Bar */}
            <div className="sticky bottom-4 z-30 mt-4 px-4 py-2 rounded-2xl bg-[#08152e]/95 border border-blue-800/80 shadow-2xl backdrop-blur-md flex items-center gap-3">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 disabled:opacity-30 text-white font-bold cursor-pointer"
                title="Önceki Sayfa"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-xs font-mono text-slate-300">
                Sayfa <strong className="text-white text-sm">{currentPage}</strong> / {numPages}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 disabled:opacity-30 text-white font-bold cursor-pointer"
                title="Sonraki Sayfa"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-blue-800" />

              <div className="text-xs font-mono font-bold text-sky-400">
                %{Math.round(scale * 100)} Zoom
              </div>

              <button
                onClick={handleResetZoom200}
                className="p-1 rounded bg-blue-950 hover:bg-blue-900 text-slate-300 hover:text-white text-[11px] cursor-pointer"
                title="%200 Zoom Sıfırla"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Cari Kontrol & Veritabanı Geçmişi Modal */}
      <CariKontrolModal
        isOpen={cariModalOpen}
        onClose={() => setCariModalOpen(false)}
        initialFirma={submittedQuery || searchQuery || initialFirma}
        onSelectFirma={(f) => {
          setSearchQuery(f);
          setSubmittedQuery(f);
          setCariModalOpen(false);
        }}
      />
    </div>
  );
};
