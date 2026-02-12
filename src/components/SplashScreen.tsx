import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [animData, setAnimData] = useState<any>(null);
    const [fadeOut, setFadeOut] = useState(false);
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        fetch('/lottie-splash.json')
            .then(r => r.json())
            .then(setAnimData)
            .catch(() => onFinish());
    }, [onFinish]);

    const handleAnimComplete = () => {
        setShowButton(true);
    };

    const handleStart = () => {
        setFadeOut(true);
        setTimeout(onFinish, 600);
    };

    if (!animData) return null;

    return (
        <div className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}>
            <div className="splash-content">
                <Lottie
                    animationData={animData}
                    loop={false}
                    autoplay
                    onComplete={handleAnimComplete}
                    style={{ width: '80%', maxWidth: 400 }}
                />
                <h1 className="splash-title">ComandaSon</h1>
                <p className="splash-subtitle">Gestão de entregas</p>
                <button
                    className={`splash-btn ${showButton ? 'splash-btn-visible' : ''}`}
                    onClick={handleStart}
                >
                    Iniciar
                </button>
            </div>
        </div>
    );
};

export default SplashScreen;
