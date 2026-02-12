import React, { useRef, useState, useEffect } from 'react';
import { X, Zap, ZapOff, ImagePlus } from 'lucide-react';
import { db } from '../db';
import { sendToWebhook } from '../utils/webhookService';
import { useNavigate } from 'react-router-dom';

const Scanner: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isStreamActive, setIsStreamActive] = useState(false);

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

        // Convert canvas to blob (binary)
        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return;
            if (flashOn) toggleFlash();
            stopCamera();
            await processAndSend(blob);
        }, 'image/jpeg', 0.7);
    };

    const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
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

        // 3. Fire webhook in background (runs in separate module, survives unmount)
        sendToWebhook(imageBlob, deliveryId as number);
    };

    return (
        <div className="scanner-container">
            <video ref={videoRef} autoPlay playsInline className="camera-feed" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Top Bar: Close and Flash */}
            <div className="scanner-top-bar">
                <button onClick={() => navigate('/')} className="btn-scanner-action">
                    <X size={24} />
                </button>

                {hasFlash && (
                    <button
                        onClick={toggleFlash}
                        className="btn-scanner-action"
                        style={{
                            color: flashOn ? '#ffeb3b' : 'white',
                            borderColor: flashOn ? 'rgba(255, 235, 59, 0.4)' : 'rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        {flashOn ? <Zap size={24} /> : <ZapOff size={24} />}
                    </button>
                )}
            </div>

            {/* Scanning Frame / Center Guide */}
            <div className="scanner-frame-container">
                <div className="scanner-frame">
                    <div className="scanner-corner-tl" />
                    <div className="scanner-corner-br" />
                    <div className="scanning-text">Enquadre a comanda</div>
                </div>
            </div>

            {/* Bottom Bar: Gallery and Shutter */}
            <div className="scanner-bottom-bar">
                <button onClick={() => fileInputRef.current?.click()} className="btn-scanner-action">
                    <ImagePlus size={24} />
                </button>

                <button
                    onClick={captureImage}
                    className="btn-capture-premium"
                    disabled={!isStreamActive}
                >
                    <div className="btn-capture-inner" />
                </button>

                {/* Empty spacer for balance or could put another action here */}
                <div style={{ width: 54 }} />
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleGalleryPick}
            />
        </div>
    );
};

export default Scanner;
