/**
 * Parses OCR text to find the delivery fee, client name, and address.
 */
export interface OCRResult {
  value: number | null;
  clientName: string;
  address: string;
  confidence: 'high' | 'low' | 'none';
  originalText: string;
}

export function parseDeliveryFee(text: string): OCRResult {
  if (!text) return { value: null, clientName: '', address: '', confidence: 'none', originalText: '' };

  const lines = text.split('\n');
  let value: number | null = null;
  let clientName = '';
  let address = '';
  let confidence: OCRResult['confidence'] = 'none';

  // --- 1. Extract Value ---
  const currencyRegex = /(?:R\$|RS|Rs|r\$)?\s*(\d+[.,]\d{2})/i;
  const valueKeywords = ['taxa', 'entrega', 'motoboy', 'frete', 'total', 'valor'];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const match = line.match(currencyRegex);
    
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val)) {
        if (valueKeywords.some(k => lowerLine.includes(k))) {
          value = val;
          confidence = 'high';
          break; // Found the most likely fee
        } else if (value === null) {
          value = val;
          confidence = 'low';
        }
      }
    }
  }

  // --- 2. Extract Name ---
  // Look for "Cliente:", "Nome:", or lines that look like names (simple heuristic)
  const nameRegex = /(?:Cliente|Nome):\s*(.*)/i;
  for (const line of lines) {
    const match = line.match(nameRegex);
    if (match && match[1].trim()) {
      clientName = match[1].trim();
      break;
    }
  }

  // --- 3. Extract Address ---
  // Look for "Endereço:", "Rua:", "Av:", "Logradouro:"
  const addressRegex = /(?:Endereço|End|Rua|Av\.|Avenida|Logradouro):\s*(.*)/i;
  for (const line of lines) {
    const match = line.match(addressRegex);
    if (match && match[1].trim()) {
      address = match[1].trim();
      break;
    }
  }

  return { value, clientName, address, confidence, originalText: text };
}
