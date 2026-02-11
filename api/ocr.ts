import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { image } = req.body; // base64 image string

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em ler comandas de entrega e notas fiscais de restaurantes brasileiros. 
Extraia as seguintes informações da imagem:
- valor: o valor monetário da entrega/taxa de entrega (número decimal, ex: 8.50)
- clientName: o nome do cliente
- address: o endereço de entrega completo

REGRAS:
1. Se não conseguir identificar um campo, retorne string vazia "" para textos ou null para valor.
2. Para o valor, priorize: "taxa de entrega", "frete", "motoboy", "entrega". Se não encontrar, use o "total".
3. Retorne APENAS um JSON válido, sem markdown, sem explicação.
4. Formato: {"valor": 8.50, "clientName": "João Silva", "address": "Rua das Flores, 123", "rawText": "todo o texto legível na imagem"}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia os dados desta comanda/nota de entrega. Retorne APENAS o JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1 // Low temperature for accuracy
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json({ error: 'OpenAI API error', details: errorData });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse the JSON from the response
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return raw text
      parsed = { valor: null, clientName: '', address: '', rawText: content };
    }

    return res.status(200).json({
      value: parsed.valor ?? null,
      clientName: parsed.clientName || '',
      address: parsed.address || parsed.endereco || '',
      rawText: parsed.rawText || content,
      confidence: parsed.valor !== null ? 'high' : 'none'
    });

  } catch (error: any) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
