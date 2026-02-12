import { db } from '../db';

const WEBHOOK_URL = 'https://n8n-webhook.nubuwf.easypanel.host/webhook/imagemurl';

/**
 * Sends an image to the n8n webhook and updates the delivery when done.
 * This function runs independently of any React component lifecycle.
 */
export async function sendToWebhook(imageBlob: Blob, deliveryId: number): Promise<{ success: boolean; message?: string }> {
    console.log('[Webhook] Iniciando envio, deliveryId:', deliveryId);
    try {
        const formData = new FormData();
        formData.append('image', imageBlob, 'comanda.jpg');
        formData.append('deliveryId', String(deliveryId));
        formData.append('timestamp', new Date().toISOString());

        let response: Response;
        try {
            response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });
        } catch (corsErr) {
            console.warn('[Webhook] CORS bloqueou, tentando no-cors...', corsErr);
            // In no-cors opacity, we can't know if it succeeded, but we assume it sent.
            // However, for critical OCR, we might want to treat this differently.
            // For now, adhering to previous logic but returning true as "sent".
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                mode: 'no-cors'
            });
            console.log('[Webhook] Enviado via no-cors, marcando como pending');
            await db.deliveries.update(deliveryId, { status: 'pending' });
            return { success: true, message: 'Enviado (no-cors)' };
        }

        console.log('[Webhook] Response status:', response.status);

        if (response.ok) {
            const text = await response.text();
            console.log('[Webhook] Response body:', text);

            try {
                const data = JSON.parse(text);
                console.log('[Webhook] Dados parseados:', data);

                await db.deliveries.update(deliveryId, {
                    amount: Number(data.valor ?? data.value ?? data.amount ?? 0),
                    clientName: data.clientName || data.cliente || data.nome || '',
                    address: data.address || data.endereco || '',
                    rawText: data.rawText || data.texto || text,
                    status: 'pending'
                });
                console.log('[Webhook] ✅ Delivery atualizado com dados do n8n');
                return { success: true };
            } catch {
                console.warn('[Webhook] Response não é JSON válido');
                await db.deliveries.update(deliveryId, { status: 'pending' });
                // Even if JSON parse fails, we received an OK from server, so we might count as success 
                // OR failure depending on strictness. Returning false to allow retry if OCR failed.
                return { success: false, message: 'Erro ao interpretar resposta do servidor.' };
            }
        } else {
            console.warn('[Webhook] Response não ok:', response.status);
            await db.deliveries.update(deliveryId, { status: 'pending' }); // Or delete?
            return { success: false, message: `Erro no servidor: ${response.status}` };
        }
    } catch (err) {
        console.error('[Webhook] Erro fatal:', err);
        await db.deliveries.update(deliveryId, { status: 'pending' }); // Or delete?
        return { success: false, message: 'Erro de conexão ou rede.' };
    }
}
