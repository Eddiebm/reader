export type PdfExtractResult = {
  text: string;
  pageCount: number;
  isScannedLikely: boolean;
};

type PdfJsLike = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: { str?: string }[] }>;
      }>;
    }>;
  };
};

/**
 * Loads pdf.js from CDN on demand (not bundled). Flags image-only PDFs heuristically.
 */
export async function extractPdfText(file: File): Promise<PdfExtractResult> {
  const pdfjsVersion = "4.0.379";
  const moduleUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.mjs`;
  const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.mjs`;

  const pdfjsLib = (await import(/* webpackIgnore: true */ moduleUrl)) as PdfJsLike;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageCount = pdf.numPages;

  let full = "";
  let nonemptyPages = 0;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items.map((item) => item.str ?? "").join(" ")
      .replace(/\s+/g, " ")
      .trim();
    full += line + "\n\n";
    if (line.length >= 20) nonemptyPages++;
  }

  const text = full.trim();
  const isScannedLikely = pageCount > 0 && nonemptyPages === 0;

  return { text, pageCount, isScannedLikely };
}
