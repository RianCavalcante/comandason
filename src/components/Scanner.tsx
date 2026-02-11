import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';

const WEBHOOK_URL = 'https://n8n-webhook.nubuwf.easypanel.host/webhook/imagemurl';

const Scanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [rawText, setRawText] = useState('');
    const [webhookSent, setWebhookSent] = useState(false);

    // Data state
    const [scannedData, setScannedData] = useState<{ amount: number | null, clientName: string, address: string }>({
        amount: null, clientName: '', address: ''
    });

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

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                const imageUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
                setCapturedImage(imageUrl);

                if (flashOn) toggleFlash();
                stopCamera();
                sendToWebhook(imageUrl);
            }
        }
    };

    const sendToWebhook = async (imageBase64: string) => {
        setIsProcessing(true);
        setWebhookSent(false);
        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageBase64,
                    timestamp: new Date().toISOString()
                })
            });

            setWebhookSent(true);

            // If the webhook returns data, try to use it
            if (response.ok) {
                try {
                    const data = await response.json();
                    // If n8n returns parsed data, fill the modal
                    if (data && (data.valor || data.value || data.clientName || data.address)) {
                        setScannedData({
                            amount: data.valor ?? data.value ?? null,
                            clientName: data.clientName || data.cliente || '',
                            address: data.address || data.endereco || ''
                        });
                        setRawText(data.rawText || data.texto || JSON.stringify(data, null, 2));
                    }
                } catch {
                    // Response wasn't JSON — that's fine, just open manual modal
                    console.log("Webhook response wasn't JSON, opening manual entry.");
                }
            }

            setModalOpen(true);
        } catch (err: any) {
            console.error("Webhook Error:", err);
            // Even if webhook fails, allow manual entry
            setModalOpen(true);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = async (data: { amount: number, clientName: string, address: string }) => {
        await db.deliveries.add({
            amount: data.amount,
            clientName: data.clientName,
            address: data.address,
            status: 'pending',
            date: new Date(),
            rawText: rawText,
            createdAt: new Date()
        });
        setModalOpen(false);
        navigate('/');
    };

    const handleCancel = () => {
        setModalOpen(false);
        setCapturedImage(null);
        setRawText('');
        setWebhookSent(false);
        startCamera();
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

                {isProcessing && (
                    <div className="processing-indicator">
                        <div className="processing-text">
                            <span>📡 Enviando para n8n...</span>
                        </div>
                        <div className="progress-bar-bg">
                            <div className="progress-bar-fill progress-bar-animated" />
                        </div>
                    </div>
                )}

                {webhookSent && !isProcessing && !modalOpen && (
                    <div className="processing-indicator" style={{ background: 'rgba(0,180,80,0.9)' }}>
                        <div className="processing-text">
                            <span>✅ Enviado!</span>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={modalOpen}
                initialData={scannedData}
                rawText={rawText}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default Scanner;
