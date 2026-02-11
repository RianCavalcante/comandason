import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';

const Scanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [rawText, setRawText] = useState('');

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

                // Use JPEG for smaller file size (faster upload)
                const imageUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
                setCapturedImage(imageUrl);

                if (flashOn) toggleFlash();
                stopCamera();
                processImage(imageUrl);
            }
        }
    };

    const processImage = async (imageUrl: string) => {
        setIsProcessing(true);
        try {
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageUrl })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Erro na API');
            }

            const data = await response.json();
            console.log("OCR Result:", data);

            setRawText(data.rawText || '');
            setScannedData({
                amount: data.value,
                clientName: data.clientName || '',
                address: data.address || ''
            });
            setModalOpen(true);
        } catch (err: any) {
            console.error("OCR Error:", err);
            alert("Erro ao processar imagem: " + err.message);
            setCapturedImage(null);
            startCamera();
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
                            <span>🤖 IA lendo comanda...</span>
                        </div>
                        <div className="progress-bar-bg">
                            <div className="progress-bar-fill progress-bar-animated" />
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
