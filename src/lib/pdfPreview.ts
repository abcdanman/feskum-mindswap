'use client';

/**
 * Rasterizes a jsPDF document's pages to <canvas> elements for an in-app
 * preview. An <iframe src="data:application/pdf;..."> looks like the
 * obvious shortcut, but native PDF-viewer support for data: URIs is
 * inconsistent across browsers (and generally absent on mobile), so we
 * render with pdf.js instead — the same engine Firefox uses — which works
 * identically everywhere.
 */

import type { jsPDF } from 'jspdf';

let pdfjsReady: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfjs() {
  if (!pdfjsReady) {
    pdfjsReady = import('pdfjs-dist').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      return pdfjs;
    });
  }
  return pdfjsReady;
}

export async function renderPdfPagesToCanvases(doc: jsPDF, scale = 1.5): Promise<HTMLCanvasElement[]> {
  const pdfjs = await loadPdfjs();
  const bytes = doc.output('arraybuffer');
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const canvases: HTMLCanvasElement[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    }
    canvases.push(canvas);
  }
  return canvases;
}
