import * as pdfjsLib from 'pdfjs-dist';

// CDN URL for pdf.worker matching pdfjs-dist@3.11.174 (with CORS & no proxy requirement)
export const PDF_WORKER_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export const PDF_CMAPS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/';

// Initialize PDF.js worker settings safely
export function initPdfWorker() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Primary worker URL: Public high-availability CDN with CORS headers
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    // 2. Prepare fake worker fallback on window.pdfjsWorker
    // If Web Worker creation fails (due to iframe sandboxing, CSP, or proxy auth returning HTML),
    // PDF.js falls back to window.pdfjsWorker.WorkerMessageHandler instead of failing or injecting
    // a script that returns HTML and crashes with "Unexpected token '<'".
    if (!(window as any).pdfjsWorker) {
      import('pdfjs-dist/legacy/build/pdf.worker.entry.js')
        .then(() => {
          // Successfully armed fallback fake worker
        })
        .catch((err) => {
          console.warn('PDF.js fake worker fallback initialization notice:', err);
        });
    }
  } catch (err) {
    console.warn('Could not initialize pdfjs workerSrc:', err);
  }
}

// Auto-run on module load
initPdfWorker();
