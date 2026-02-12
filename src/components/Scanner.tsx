import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff, ImagePlus } from 'lucide-react';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';

const WEBHOOK_URL = 'https://n8n-webhook.nubuwf.easypanel.host/webhook/imagemurl';

const Scanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // Flashlight state
    const [hasFlash, setHasFlash] = useState(false);
    const [flashOn, setFlashOn] = useState(false);

    const navigate = useNavigate();

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreamActive(true);
            }

            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            // @ts-ignore
            if (capabilities.torch) {
                setHasFlash(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Erro ao acessar a câmera. Verifique as permissões.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setIsStreamActive(false);
        }
    };

    const toggleFlash = async () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            try {
                await track.applyConstraints({
                    advanced: [{ torch: !flashOn } as any]
                });
                setFlashOn(!flashOn);
            } catch (err) {
                console.error("Error toggling flash:", err);
            }
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const context = canvasRef.current.getContext('2d');
        if (!context) return;

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        // Convert canvas to blob (binary, ~33% smaller than base64)
        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return;
            const previewUrl = URL.createObjectURL(blob);
            setCapturedImage(previewUrl);

            if (flashOn) toggleFlash();
            stopCamera();

            await processAndSend(blob);
        }, 'image/jpeg', 0.7);
    };

    const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setCapturedImage(previewUrl);
        stopCamera();
        processAndSend(file);
    };

    const processAndSend = async (imageBlob: Blob) => {
        // 1. Save delivery immediately as "processing"
        const deliveryId = await db.deliveries.add({
            amount: 0,
            clientName: '',
            address: '',
            status: 'processing',
            date: new Date(),
            rawText: '',
            createdAt: new Date()
        });

        // 2. Navigate to dashboard INSTANTLY
        navigate('/');

        // 3. Send to webhook in background (fire and forget)
        // Fire webhook in background - use setTimeout to ensure it runs
        // even after component unmounts
        const id = deliveryId as number;
        setTimeout(() => sendToWebhook(imageBlob, id), 0);
    };

    const sendToWebhook = async (imageBlob: Blob, deliveryId: number) => {
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
                // CORS blocks the response - try no-cors mode (fire and forget)
                console.warn('[Webhook] CORS bloqueou, tentando no-cors...', corsErr);
                await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    body: formData,
                    mode: 'no-cors'
                });
                // Can't read response in no-cors, just mark as pending
                console.log('[Webhook] Enviado via no-cors, marcando como pending');
                await db.deliveries.update(deliveryId, { status: 'pending' });
                return;
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
                } catch {
                    console.warn('[Webhook] Response não é JSON válido');
                    await db.deliveries.update(deliveryId, { status: 'pending' });
                }
            } else {
                console.warn('[Webhook] Response não ok:', response.status);
                await db.deliveries.update(deliveryId, { status: 'pending' });
            }
        } catch (err) {
            console.error('[Webhook] Erro fatal:', err);
            await db.deliveries.update(deliveryId, { status: 'pending' });
        }
    };

    return (
        <div className="scanner-container">
            {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="captured-image" />
            ) : (
                <video ref={videoRef} autoPlay playsInline className="camera-feed" />
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="scanner-controls">
                <button onClick={() => navigate('/')} className="btn-icon">
                    <X size={24} />
                </button>

                {!capturedImage && hasFlash && (
                    <button
                        onClick={toggleFlash}
                        className="btn-icon"
                        style={{
                            top: '20px',
                            right: '20px',
                            left: 'auto',
                            background: flashOn ? 'rgba(255, 255, 0, 0.3)' : 'rgba(0,0,0,0.5)',
                            color: flashOn ? '#ffeb3b' : 'white'
                        }}
                    >
                        {flashOn ? <Zap size={24} /> : <ZapOff size={24} />}
                    </button>
                )}

                {!capturedImage && (
                    <>
                        <button onClick={() => fileInputRef.current?.click()} className="btn-gallery">
                            <ImagePlus size={22} />
                        </button>
                        <button onClick={captureImage} className="btn-capture" disabled={!isStreamActive}>
                            <div className="capture-inner" />
                        </button>
                    </>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleGalleryPick}
                />
            </div>
        </div>
    );
};

export default Scanner;
