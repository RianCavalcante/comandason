import React, { useRef, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { X, Zap, ZapOff } from 'lucide-react';
import { parseDeliveryFee } from '../utils/ocrParser';
import ConfirmModal from './ConfirmModal';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';

const Scanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
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

            // Check for flashlight capability
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

    /**
     * Pre-process: increase contrast and convert to grayscale
     * for better OCR accuracy on thermal/printed receipts.
     */
    const preprocessImage = (canvas: HTMLCanvasElement): string => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas.toDataURL('image/png');

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Grayscale conversion (luminance method)
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

            // Increase contrast (stretch the histogram)
            const contrast = 1.5; // 1.0 = normal, >1 = more contrast
            const factor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
            let enhanced = factor * (gray - 128) + 128;
            enhanced = Math.max(0, Math.min(255, enhanced));

            // Simple threshold to binarize (black/white)
            const threshold = 140;
            const bw = enhanced > threshold ? 255 : 0;

            data[i] = bw;     // R
            data[i + 1] = bw; // G
            data[i + 2] = bw; // B
            // Alpha stays the same
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL('image/png');
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                // Show the raw capture first
                const rawImageUrl = canvasRef.current.toDataURL('image/png');
                setCapturedImage(rawImageUrl);

                // Pre-process for OCR
                const processedImageUrl = preprocessImage(canvasRef.current);

                if (flashOn) toggleFlash();
                stopCamera();
                processImage(processedImageUrl);
            }
        }
    };

    const processImage = async (imageUrl: string) => {
        setIsProcessing(true);
        setOcrProgress(0);
        try {
            const result = await Tesseract.recognize(
                imageUrl,
                'por', // Portuguese!
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            setOcrProgress(Math.round(m.progress * 100));
                        }
                    }
                }
            );

            const { data: { text } } = result;
            console.log("OCR Text:", text);
            setRawText(text);

            const parsed = parseDeliveryFee(text);

            setScannedData({
                amount: parsed.value,
                clientName: parsed.clientName,
                address: parsed.address
            });
            setModalOpen(true);
        } catch (err) {
            console.error("OCR Error:", err);
            alert("Erro ao processar imagem.");
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
            rawText: rawText, // Save actual OCR text
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

                {/* Flashlight Button */}
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
                            <span>Lendo comanda...</span>
                            <span className="progress-pct">{ocrProgress}%</span>
                        </div>
                        <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${ocrProgress}%` }} />
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
