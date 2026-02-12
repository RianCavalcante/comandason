import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const ThankYou: React.FC = () => {
    const navigate = useNavigate();

    // Sound effect could be added here later

    return (
        <div className="thank-you-container">
            <div className="thank-you-content">
                <div className="success-icon-wrapper">
                    <div className="success-icon-ring"></div>
                    <div className="success-icon-bg">
                        <CheckCircle2 size={64} className="text-green-premium" />
                    </div>
                </div>

                <h1 className="thank-you-title">Pagamento Confirmado!</h1>
                <p className="thank-you-message">
                    Sua assinatura foi ativada com sucesso.<br />
                    Agora é só acelerar! 🚀
                </p>

                <div className="thank-you-details">
                    <div className="detail-row">
                        <span>Status</span>
                        <span className="status-badge-success">Aprovado</span>
                    </div>
                    <div className="detail-row">
                        <span>Método</span>
                        <span>Infinity Pay</span>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="btn-primary-large"
                >
                    Voltar para o Início
                    <ArrowRight size={20} />
                </button>
            </div>

            {/* Background elements for premium feel */}
            <div className="bg-gradient-orb top-left"></div>
            <div className="bg-gradient-orb bottom-right"></div>
        </div>
    );
};

export default ThankYou;
