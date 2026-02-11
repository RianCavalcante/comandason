import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff } from 'lucide-react';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';

const WEBHOOK_URL = 'https://n8n-webhook.nubuwf.easypanel.host/webhook/imagemurl';

const Scanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

        // Compress to JPEG (smaller for mobile upload)
        const imageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageBase64);

        if (flashOn) toggleFlash();
        stopCamera();

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
        sendToWebhook(imageBase64, deliveryId as number);
    };

    const sendToWebhook = async (imageBase64: string, deliveryId: number) => {
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    deliveryId: deliveryId,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                try {
                    const data = await response.json();

                    // Update delivery with webhook response data
                    await db.deliveries.update(deliveryId, {
                        amount: data.valor ?? data.value ?? data.amount ?? 0,
                        clientName: data.clientName || data.cliente || data.nome || '',
                        address: data.address || data.endereco || '',
                        rawText: data.rawText || data.texto || JSON.stringify(data),
                        status: 'pending' // Move to pending after processing
                    });
                } catch {
                    // Response wasn't JSON - mark as pending anyway
                    await db.deliveries.update(deliveryId, { status: 'pending' });
                }
            } else {
                // Webhook error - mark as pending so user can edit manually
                await db.deliveries.update(deliveryId, { status: 'pending' });
            }
        } catch (err) {
            console.error("Webhook Error:", err);
            // Network error - mark as pending
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
                    <button onClick={captureImage} className="btn-capture" disabled={!isStreamActive}>
                        <div className="capture-inner" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Scanner;
