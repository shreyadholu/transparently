// PDF Text Extraction Utility using pdfjs-dist
// Provides reliable PDF text extraction for resume analysis

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Extracts text content from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Promise<string> - The extracted text content
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Combine text items with proper spacing
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting PDF text with pdfjs-dist:', error);
    
    // Fallback: try reading as plain text (works for text-based PDFs)
    try {
      const text = await file.text();
      return text;
    } catch (fallbackError) {
      console.error('Fallback text extraction also failed:', fallbackError);
      return '';
    }
  }
}

/**
 * Validates if a PDF file can be processed
 * @param file - The PDF file to validate
 * @returns Promise<{valid: boolean, error?: string}>
 */
export async function validatePDF(file: File): Promise<{ valid: boolean; error?: string }> {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are allowed' };
  }
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  // Try to open the PDF to verify it's valid
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Check if PDF has pages
    if (pdf.numPages === 0) {
      return { valid: false, error: 'PDF file is empty' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid or corrupted PDF file' };
  }
}

