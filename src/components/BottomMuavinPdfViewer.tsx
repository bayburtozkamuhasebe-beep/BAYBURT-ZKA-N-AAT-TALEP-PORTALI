import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDF_CMAPS_URL, initPdfWorker } from '../lib/pdfWorker';
import { SiteConfig } from '../types';
import {
  MUAVIN_SITE_MAPPINGS,
  getMuavinPdfInfo,
  supabase,
} from '../lib/supabase';
import {
  Search,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
  Building,
  Sparkles,
  Layers,
  ArrowDown,
  X,
} from 'lucide-react';

// Configure PDF.js worker safely
initPdfWorker();

// 1. Turkish character-aware normalization
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

// 2. ASCII-folded normalization
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

// 3. Compacted alphanumeric normalization
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if token matches or fuzzy-matches word
function isTokenFuzzyMatch(t: string, w: string): boolean {
  if (!t || !w) return false;
  if (t === w) return true;

  if (t.length >= 3 && (w.includes(t) || t.includes(w))) {
    return true;
  }

  const minLen = Math.min(t.length, w.length);
  if (minLen >= 3 && t.slice(0, minLen) === w.slice(0, minLen)) {
    return true;
  }

  if (t.length >= 4 && w.length >= 4 && Math.abs(t.length - w.length) <= 2) {
    const maxDist = t.length >= 7 ? 2 : 1;
    if (levenshteinDistance(t, w) <= maxDist) {
      return true;
    }
  }

  return false;
}

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
]);

interface PageMatchEvaluation {
  isMatch: boolean;
  score: number;
  matchType: 'exact' | 'first20' | 'first15' | 'first10' | 'partial' | 'fuzzy' | 'none';
  matchedWords: string[];
}

function evaluatePageMatch(queryText: string, pageStr: string): PageMatchEvaluation {
  const cleanTr = normalizeTurkish(queryText);
  const cleanAscii = normalizeAscii(queryText);
  const cleanCompacted = normalizeCompacted(queryText);

  if (!cleanTr || cleanTr.length < 2) {
    return { isMatch: false, score: 0, matchType: 'none', matchedWords: [] };
  }

  const pageTr = normalizeTurkish(pageStr);
  const pageAscii = normalizeAscii(pageStr);
  const pageCompacted = normalizeCompacted(pageStr);

  // 1. Exact phrase match
  if (pageTr.includes(cleanTr) || pageAscii.includes(cleanAscii)) {
    return { isMatch: true, score: 100, matchType: 'exact', matchedWords: [queryText.trim()] };
  }

  // 2. Compacted match without whitespace
  if (cleanCompacted.length >= 4 && pageCompacted.includes(cleanCompacted)) {
    return { isMatch: true, score: 98, matchType: 'exact', matchedWords: [cleanCompacted] };
  }

  // 3. First 20 Characters Match
  const rawFirst20 = queryText.trim().slice(0, 20).trim();
  const first20Tr = cleanTr.slice(0, 20).trim();
  const first20Ascii = cleanAscii.slice(0, 20).trim();
  const first20Compacted = cleanCompacted.slice(0, 20);

  if (first20Tr.length >= 3) {
    const matchedFirst20 =
      pageTr.includes(first20Tr) ||
      pageAscii.includes(first20Ascii) ||
      (first20Compacted.length >= 3 && pageCompacted.includes(first20Compacted));

    if (matchedFirst20) {
      return {
        isMatch: true,
        score: 96,
        matchType: 'first20',
        matchedWords: [rawFirst20.toUpperCase()],
      };
    }
  }

  // 4. First 15 Characters Match
  const rawFirst15 = queryText.trim().slice(0, 15).trim();
  const first15Tr = cleanTr.slice(0, 15).trim();
  const first15Ascii = cleanAscii.slice(0, 15).trim();
  const first15Compacted = cleanCompacted.slice(0, 15);

  if (first15Tr.length >= 3) {
    const matchedFirst15 =
      pageTr.includes(first15Tr) ||
      pageAscii.includes(first15Ascii) ||
      (first15Compacted.length >= 3 && pageCompacted.includes(first15Compacted));

    if (matchedFirst15) {
      return {
        isMatch: true,
        score: 94,
        matchType: 'first15',
        matchedWords: [rawFirst15.toUpperCase()],
      };
    }
  }

  // 5. First 10 Characters Match (Fallback)
  const rawFirst10 = queryText.trim().slice(0, 10).trim();
  const first10Tr = cleanTr.slice(0, 10).trim();
  const first10Ascii = cleanAscii.slice(0, 10).trim();
  const first10Compacted = cleanCompacted.slice(0, 10);

  if (first10Tr.length >= 3) {
    const matchedFirst10 =
      pageTr.includes(first10Tr) ||
      pageAscii.includes(first10Ascii) ||
      (first10Compacted.length >= 3 && pageCompacted.includes(first10Compacted));

    if (matchedFirst10) {
      return {
        isMatch: true,
        score: 92,
        matchType: 'first10',
        matchedWords: [rawFirst10.toUpperCase()],
      };
    }
  }

  // First 10 chars of distinctive words
  const queryWordsOnly = cleanTr.split(' ').filter((w) => !COMPANY_STOP_WORDS.has(w) && w.length >= 2);
  if (queryWordsOnly.length > 0) {
    const firstDistinctive10 = queryWordsOnly.join(' ').slice(0, 10).trim();
    const firstDistinctive10Ascii = normalizeAscii(firstDistinctive10);
    if (
      firstDistinctive10.length >= 3 &&
      firstDistinctive10 !== first10Tr &&
      (pageTr.includes(firstDistinctive10) || pageAscii.includes(firstDistinctive10Ascii))
    ) {
      return {
        isMatch: true,
        score: 94,
        matchType: 'first10',
        matchedWords: [firstDistinctive10.toUpperCase()],
      };
    }
  }

  // Token level matches
  const wordsTr = cleanTr.split(' ').filter((w) => w.length >= 2);
  const wordsAscii = cleanAscii.split(' ').filter((w) => w.length >= 2);

  let coreTokensTr = wordsTr.filter((w) => !COMPANY_STOP_WORDS.has(w) && w.length >= 2);
  let coreTokensAscii = wordsAscii.filter((w) => !COMPANY_STOP_WORDS.has(w) && w.length >= 2);

  if (coreTokensTr.length === 0) {
    coreTokensTr = wordsTr;
    coreTokensAscii = wordsAscii;
  }

  const pageWordsTr = pageTr.split(/\s+/).filter((w) => w.length >= 2);
  const pageWordsAscii = pageAscii.split(/\s+/).filter((w) => w.length >= 2);

  const matchedWords: string[] = [];
  let totalScore = 0;
  let exactTokenMatches = 0;
  let partialOrFuzzyMatches = 0;

  for (let i = 0; i < coreTokensTr.length; i++) {
    const tTr = coreTokensTr[i];
    const tAscii = coreTokensAscii[i] || tTr;

    const directIncluded = pageTr.includes(tTr) || pageAscii.includes(tAscii);
    if (directIncluded) {
      matchedWords.push(tTr.toUpperCase());
      exactTokenMatches++;
      totalScore += 35;
      continue;
    }

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

  const totalCoreTokens = coreTokensTr.length;
  if (totalCoreTokens === 1 && (exactTokenMatches === 1 || partialOrFuzzyMatches === 1)) {
    return {
      isMatch: true,
      score: exactTokenMatches === 1 ? 88 : 72,
      matchType: exactTokenMatches === 1 ? 'partial' : 'fuzzy',
      matchedWords,
    };
  }

  if (totalCoreTokens > 1 && (exactTokenMatches >= 1 || partialOrFuzzyMatches >= 2)) {
    const matchRatio = (exactTokenMatches + partialOrFuzzyMatches * 0.75) / totalCoreTokens;
    if (matchRatio >= 0.45) {
      return {
        isMatch: true,
        score: Math.min(95, Math.round(matchRatio * 90)),
        matchType: exactTokenMatches >= 1 ? 'partial' : 'fuzzy',
        matchedWords,
      };
    }
  }

  return { isMatch: false, score: 0, matchType: 'none', matchedWords: [] };
}

interface BottomMuavinPdfViewerProps {
  activeSite: SiteConfig;
  initialSearchQuery?: string;
  initialPage?: number;
  onOpenFullScreen?: (site: SiteConfig, query?: string) => void;
}

export function BottomMuavinPdfViewer({
  activeSite,
  initialSearchQuery = '',
  initialPage,
  onOpenFullScreen,
}: BottomMuavinPdfViewerProps) {
  // Search query states
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [submittedQuery, setSubmittedQuery] = useState<string>(initialSearchQuery);

  // PDF Document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>('1');

  // Zoom scale: Default 1.75 for crisp readability
  const [scale, setScale] = useState<number>(1.75);

  // PDF Source information
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Search & Match states
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [matchedPages, setMatchedPages] = useState<number[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [matchInfo, setMatchInfo] = useState<PageMatchEvaluation | null>(null);

  // Canvas rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRenderTaskRef = useRef<any>(null);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const siteMapping = MUAVIN_SITE_MAPPINGS[activeSite.id] || {
    siteId: activeSite.id,
    siteName: activeSite.name,
    bucket: 'MUAVINLER',
    folder: activeSite.id.toUpperCase(),
    dashboardUrl: `https://supabase.com/dashboard/project/gboathwmaanqxuwsryud/storage/files/buckets/MUAVINLER/${activeSite.id.toUpperCase()}`,
  };

  // Sync incoming search query from parent (e.g. Cari Görüntüle click)
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== searchQuery) {
      setSearchQuery(initialSearchQuery);
      setSubmittedQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Sync incoming target page from parent (e.g. direct bakiye click)
  useEffect(() => {
    if (initialPage && initialPage >= 1 && (!numPages || initialPage <= numPages)) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, numPages]);

  // Debounced auto-search when user types into the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== submittedQuery.trim()) {
        setSubmittedQuery(searchQuery.trim());
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery, submittedQuery]);

  // 1. Fetch PDF URL when activeSite changes
  const loadPdf = useCallback(async () => {
    setIsLoadingPdf(true);
    setStorageError(null);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    setPageInputValue('1');
    setMatchedPages([]);
    setHasSearched(false);
    setMatchInfo(null);
    setUploadSuccess(null);

    try {
      const info = await getMuavinPdfInfo(activeSite.id);
      if (info.url) {
        setPdfUrl(info.url);
        setFileName(info.fileName || 'muavin.pdf');
      } else {
        setPdfUrl(null);
        setStorageError(info.error || `MUAVINLER/${siteMapping.folder} klasöründe PDF bulunamadı.`);
        setIsLoadingPdf(false);
      }
    } catch (err: any) {
      setStorageError(err.message || 'PDF bilgisi alınırken hata oluştu.');
      setIsLoadingPdf(false);
    }
  }, [activeSite.id, siteMapping.folder]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  // 2. Load PDF document into pdfjs
  useEffect(() => {
    if (!pdfUrl) return;

    let isMounted = true;
    setIsLoadingPdf(true);

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

  // 3. Search firm name inside PDF
  const executeSearch = useCallback(
    async (queryText: string, doc: pdfjsLib.PDFDocumentProxy) => {
      const cleanTr = normalizeTurkish(queryText);
      if (!cleanTr || cleanTr.length < 2) {
        setMatchedPages([]);
        setHasSearched(false);
        setMatchInfo(null);
        return;
      }

      setIsSearching(true);
      setSearchProgress(0);
      setHasSearched(true);

      const foundPages: { pageNum: number; eval: PageMatchEvaluation }[] = [];
      const total = doc.numPages;

      try {
        for (let i = 1; i <= total; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const pageStrings = textContent.items.map((item: any) => item.str || '');
          const combinedPageText = pageStrings.join(' ');

          const pageEval = evaluatePageMatch(queryText, combinedPageText);
          if (pageEval.isMatch) {
            foundPages.push({ pageNum: i, eval: pageEval });
          }

          if (i % 10 === 0 || i === total) {
            setSearchProgress(Math.round((i / total) * 100));
          }
        }

        foundPages.sort((a, b) => b.eval.score - a.eval.score);

        const pageNumbers = foundPages.map((p) => p.pageNum);
        setMatchedPages(pageNumbers);

        if (pageNumbers.length > 0) {
          setCurrentMatchIndex(0);
          const topMatch = foundPages[0];
          setCurrentPage(topMatch.pageNum);
          setPageInputValue(String(topMatch.pageNum));
          setMatchInfo(topMatch.eval);
        } else {
          setMatchInfo(null);
        }
      } catch (searchErr) {
        console.error('PDF Arama hatası:', searchErr);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!pdfDoc) return;
    if (!submittedQuery.trim()) {
      setMatchedPages([]);
      setHasSearched(false);
      setMatchInfo(null);
      return;
    }
    executeSearch(submittedQuery, pdfDoc);
  }, [pdfDoc, submittedQuery, executeSearch]);

  // 4. Render current page on canvas with yellow/amber highlight
  useEffect(() => {
    if (!pdfDoc || currentPage < 1 || currentPage > numPages) return;

    let isMounted = true;
    setIsRenderingPage(true);

    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch {
        // ignore
      }
    }

    pdfDoc
      .getPage(currentPage)
      .then(async (page) => {
        if (!isMounted) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: transform,
        };

        const renderTask = page.render(renderContext);
        currentRenderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isMounted) return;

        // Draw highlights if query exists
        if (submittedQuery.trim()) {
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

            const queryWordsTr = cleanTr.split(' ').filter((w) => w.length >= 2);
            const queryWordsAscii = cleanAscii.split(' ').filter((w) => w.length >= 2);
            let activeTokens = queryWordsTr.filter((w) => !COMPANY_STOP_WORDS.has(w) && w.length >= 2);
            if (activeTokens.length === 0) activeTokens = queryWordsTr;

            context.save();
            const s = outputScale;

            for (const item of items) {
              const itemStr = item.str || '';
              if (!itemStr.trim()) continue;

              const itemTr = normalizeTurkish(itemStr);
              const itemAscii = normalizeAscii(itemStr);
              const itemCompacted = normalizeCompacted(itemStr);

              const isExact =
                itemTr.includes(cleanTr) ||
                itemAscii.includes(cleanAscii) ||
                (cleanCompacted.length >= 4 && itemCompacted.includes(cleanCompacted));

              const isFirst20 =
                first20Tr.length >= 3 &&
                (itemTr.includes(first20Tr) ||
                  itemAscii.includes(first20Ascii) ||
                  (first20Compacted.length >= 3 && itemCompacted.includes(first20Compacted)));

              const isFirst15 =
                first15Tr.length >= 3 &&
                (itemTr.includes(first15Tr) ||
                  itemAscii.includes(first15Ascii) ||
                  (first15Compacted.length >= 3 && itemCompacted.includes(first15Compacted)));

              let isTokenMatch = false;
              if (!isExact && !isFirst20 && !isFirst15) {
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

              const isMatch = isExact || isFirst20 || isFirst15 || isTokenMatch;

              if (isMatch && item.transform) {
                const tx = item.transform[4];
                const ty = item.transform[5];
                const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
                const itemWidth = (item.width || 45) * scale;
                const itemHeight = (item.height || 14) * scale;

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
          } catch {
            // ignore highlight errors
          }
        }

        setIsRenderingPage(false);
      })
      .catch((err) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Sayfa render hatası:', err);
        }
        if (isMounted) setIsRenderingPage(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, currentPage, scale, submittedQuery, numPages]);

  // Page navigation helpers
  const goToPage = (num: number) => {
    const target = Math.max(1, Math.min(num, numPages));
    setCurrentPage(target);
    setPageInputValue(String(target));
  };

  const handleNextMatch = () => {
    if (matchedPages.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedPages.length;
    setCurrentMatchIndex(nextIdx);
    goToPage(matchedPages[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matchedPages.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchedPages.length) % matchedPages.length;
    setCurrentMatchIndex(prevIdx);
    goToPage(matchedPages[prevIdx]);
  };

  // Upload PDF directly to Supabase storage folder
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStorageError(null);
    setUploadSuccess(null);

    try {
      const folder = siteMapping.folder;
      const bucket = siteMapping.bucket || 'MUAVINLER';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${folder}/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setUploadSuccess(`"${file.name}" başarıyla ${bucket}/${folder} içine yüklendi!`);
      // Reload PDF
      setTimeout(() => {
        loadPdf();
      }, 1000);
    } catch (err: any) {
      setStorageError(`Dosya yüklenirken hata oluştu: ${err.message || err}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <section
      id="bottom-muavin-pdf-section"
      className="mt-8 mb-12 bg-[#09152b] border-2 border-blue-900/80 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* 1. Header Bar */}
      <div className="bg-gradient-to-r from-[#0d1f42] via-[#091733] to-[#0d1f42] border-b border-blue-900/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                {activeSite.name} — Muavin Defteri (PDF)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {siteMapping.folder}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Supabase Storage:{' '}
              <a
                href={siteMapping.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300 underline font-semibold inline-flex items-center gap-1"
                title="Supabase Storage Klasörünü Aç"
              >
                <span>MUAVINLER/{siteMapping.folder}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {fileName && (
                <span className="text-slate-400 ml-2">
                  (Aktif: <strong className="text-slate-200">{fileName}</strong>)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh / Re-check button */}
          <button
            onClick={loadPdf}
            disabled={isLoadingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1e3b] hover:bg-[#162e5a] border border-blue-800 text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Supabase Storage'dan Yeniden Tara"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoadingPdf ? 'animate-spin text-blue-400' : ''}`} />
            <span>Yenile</span>
          </button>

          {/* Full Screen View button */}
          {onOpenFullScreen && (
            <button
              onClick={() => onOpenFullScreen(activeSite, submittedQuery)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Ayrı Tam Ekran Sayfada Aç"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Tam Ekran Sayfası</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE SEARCH TEXTBOX (USER EXPLICIT REQUIREMENT: "BİR ADET TE ARAMA TEXBOKSU OLSUN") */}
      <div className="bg-[#0b1b38] border-b border-blue-900/60 p-4 sm:p-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                id="bottom-pdf-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSubmittedQuery(searchQuery.trim());
                    if (pdfDoc && searchQuery.trim()) {
                      executeSearch(searchQuery.trim(), pdfDoc);
                    }
                  }
                }}
                placeholder="Firma Ünvanı / Cari Adı Ara (Tam veya İlk 10 Karakter)..."
                className="w-full pl-11 pr-10 py-3 bg-white text-slate-950 font-bold placeholder-slate-400 rounded-xl border-2 border-sky-400/80 focus:border-sky-300 focus:ring-4 focus:ring-sky-500/20 text-sm sm:text-base transition-all shadow-inner"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Aramayı Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Action Button */}
            <button
              onClick={() => {
                setSubmittedQuery(searchQuery.trim());
                if (pdfDoc && searchQuery.trim()) {
                  executeSearch(searchQuery.trim(), pdfDoc);
                }
              }}
              disabled={isSearching || !pdfDoc}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 active:scale-[0.98] text-white text-sm font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Taranıyor (%{searchProgress})</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>PDF'te Ara</span>
                </>
              )}
            </button>

            {/* Quick First 20 Chars Button */}
            {searchQuery.trim().length > 20 && (
              <button
                onClick={() => {
                  const first20 = searchQuery.trim().slice(0, 20).trim();
                  setSearchQuery(first20);
                  setSubmittedQuery(first20);
                  if (pdfDoc) executeSearch(first20, pdfDoc);
                }}
                className="px-3 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
                title="İlk 20 karakteri sorgula"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>İlk 20 Krk</span>
              </button>
            )}

            {/* Quick First 15 Chars Button */}
            {searchQuery.trim().length > 15 && (
              <button
                onClick={() => {
                  const first15 = searchQuery.trim().slice(0, 15).trim();
                  setSearchQuery(first15);
                  setSubmittedQuery(first15);
                  if (pdfDoc) executeSearch(first15, pdfDoc);
                }}
                className="px-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
                title="İlk 15 karakteri sorgula"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>İlk 15 Krk</span>
              </button>
            )}
          </div>

          {/* Search Result Feedback Bar */}
          {hasSearched && (
            <div className="mt-3">
              {matchedPages.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>"{submittedQuery}"</strong> için toplam{' '}
                      <strong className="text-white underline">{matchedPages.length} sayfada</strong> eşleşme bulundu.
                      {matchInfo && (
                        <span className="ml-1 text-emerald-300">
                          (Tür:{' '}
                          {matchInfo.matchType === 'exact'
                            ? '✓ Tam Ünvan'
                            : matchInfo.matchType === 'first20'
                            ? '⚡ İlk 20 Karakter'
                            : matchInfo.matchType === 'first15'
                            ? '⚡ İlk 15 Karakter'
                            : matchInfo.matchType === 'first10'
                            ? 'İlk 10 Karakter'
                            : matchInfo.matchType === 'partial'
                            ? 'Kısmi / Parça'
                            : 'Benzer/Fuzzy'}
                          )
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Previous / Next Match Buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-300 text-[11px] font-mono mr-1">
                      Eşleşme {currentMatchIndex + 1} / {matchedPages.length} (Sayfa {currentPage})
                    </span>
                    <button
                      onClick={handlePrevMatch}
                      className="px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Önceki Eşleşmeye Git"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Önceki
                    </button>
                    <button
                      onClick={handleNextMatch}
                      className="px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Sonraki Eşleşmeye Git"
                    >
                      Sonraki <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Bu PDF'te <strong>"{submittedQuery}"</strong> carisi için eşleşen sayfa bulunamadı. (Önce firmanın tam ünvanı, ardından ilk 20 ve ilk 15 karakter arandı).
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Controls & Tools Bar */}
      {pdfDoc && (
        <div className="bg-[#0a162e] border-b border-blue-900/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 disabled:opacity-40 text-white cursor-pointer"
              title="Önceki Sayfa"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-mono font-bold text-slate-200">
              <span>Sayfa</span>
              <input
                type="number"
                min={1}
                max={numPages}
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onBlur={() => {
                  const p = parseInt(pageInputValue, 10);
                  if (!isNaN(p)) goToPage(p);
                  else setPageInputValue(String(currentPage));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(pageInputValue, 10);
                    if (!isNaN(p)) goToPage(p);
                  }
                }}
                className="w-12 px-1.5 py-0.5 bg-blue-950 border border-blue-700 rounded text-center text-white font-bold focus:outline-none focus:border-sky-400"
              />
              <span>/ {numPages}</span>
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 disabled:opacity-40 text-white cursor-pointer"
              title="Sonraki Sayfa"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {isRenderingPage && (
              <span className="flex items-center gap-1 text-[11px] text-sky-300 animate-pulse ml-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Çiziliyor...</span>
              </span>
            )}
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((prev) => Math.max(0.75, prev - 0.25))}
              className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-white cursor-pointer"
              title="Küçült"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="font-mono font-bold text-slate-200 min-w-[45px] text-center">
              %{Math.round(scale * 100)}
            </span>

            <button
              onClick={() => setScale((prev) => Math.min(3.5, prev + 0.25))}
              className="p-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-white cursor-pointer"
              title="Büyüt"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setScale(1.75)}
              className="px-2 py-1 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-sky-200 font-semibold cursor-pointer"
              title="Varsayılan Yakınlaştırma (%175)"
            >
              Sıfırla
            </button>

            {pdfUrl && (
              <a
                href={pdfUrl}
                download={fileName || `${activeSite.name}-muavin.pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-700/60 text-slate-200 hover:text-white font-semibold cursor-pointer ml-1"
                title="PDF Dosyasını İndir"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">İndir</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 4. Main PDF Canvas Area */}
      <div className="relative min-h-[500px] max-h-[750px] overflow-auto bg-[#071120] p-4 flex items-center justify-center">
        {/* Loading Spinner */}
        {isLoadingPdf && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-base font-bold text-white">
              {activeSite.name} muavin PDF belgesi Supabase Storage'dan yükleniyor...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              MUAVINLER/{siteMapping.folder} klasörü taranıyor
            </p>
          </div>
        )}

        {/* Empty / Error state (e.g. MSB, SEKA, DİĞER when no PDF is uploaded yet) */}
        {!isLoadingPdf && !pdfDoc && (
          <div className="max-w-lg mx-auto py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-white mb-1.5">
              {activeSite.name} İçin PDF Bulunamadı
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Supabase Storage üzerinde{' '}
              <strong className="text-sky-300 font-mono">MUAVINLER/{siteMapping.folder}</strong> klasöründe henüz bir PDF dosyası yer almamaktadır.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={siteMapping.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Supabase Dashboard'da Aç</span>
              </a>

              <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'Yükleniyor...' : 'Doğrudan PDF Yükle'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleUploadFile}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {uploadSuccess && (
              <p className="mt-4 text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {uploadSuccess}
              </p>
            )}

            {storageError && (
              <p className="mt-3 text-[11px] text-slate-400 font-mono">
                {storageError}
              </p>
            )}
          </div>
        )}

        {/* PDF Canvas */}
        {!isLoadingPdf && pdfDoc && (
          <div className="flex flex-col items-center justify-center my-auto">
            <div className="bg-white rounded-lg shadow-2xl p-1 border-2 border-slate-700/50">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer Info */}
      {pdfDoc && (
        <div className="bg-[#0a162e] border-t border-blue-900/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            <span>Sarı vurgulanan alanlar aradığınız cari ünvanı veya ilk 10 karakteri göstermektedir.</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Toplam {numPages} sayfa</span>
            <span>•</span>
            <span>Ölçek: %{Math.round(scale * 100)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
