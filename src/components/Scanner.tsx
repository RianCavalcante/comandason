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
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

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
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreamActive(true);
            }

            // Check for flashlight capability
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            // @ts-ignore - torch is not in standard types sometimes but works
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
            stream.getTracks().forEach(track => {
                track.stop();
            });
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
                const imageUrl = canvasRef.current.toDataURL('image/png');
                setCapturedImage(imageUrl);

                // Turn off flash if on
                if (flashOn) toggleFlash();

                stopCamera();
                processImage(imageUrl);
            }
        }
    };

    const processImage = async (imageUrl: string) => {
        setIsProcessing(true);
        try {
            const result = await Tesseract.recognize(
                imageUrl,
                'eng',
                { logger: m => console.log(m) }
            );

            const { data: { text } } = result;
            console.log("OCR Text:", text);
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
            status: 'pending', // Default status
            date: new Date(),
            rawText: 'scanned',
            createdAt: new Date()
        });
        setModalOpen(false);
        navigate('/');
    };

    const handleCancel = () => {
        setModalOpen(false);
        setCapturedImage(null);
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

                {isProcessing && <div className="processing-indicator">Processando...</div>}
            </div>

            <ConfirmModal
                isOpen={modalOpen}
                initialData={scannedData}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default Scanner;
