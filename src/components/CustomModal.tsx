import React from 'react';
import { XCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: 'alert' | 'confirm';
    variant?: 'danger' | 'info' | 'success';
}

const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'alert',
    variant = 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <XCircle className="modal-icon-danger" size={32} />;
            case 'success': return <AlertCircle className="modal-icon-success" size={32} />;
            default: return <HelpCircle className="modal-icon-info" size={32} />;
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="custom-modal-content">
                <div className="modal-header-visual">
                    {getIcon()}
                </div>

                <h2 className="modal-title">{title}</h2>
                <p className="modal-message">{message}</p>

                <div className="modal-actions-custom">
                    {type === 'confirm' && (
                        <button className="btn-modal-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                    )}
                    <button
                        className={`btn-modal-confirm ${variant === 'danger' ? 'confirm-danger' : ''}`}
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                    >
                        {type === 'confirm' ? 'Confirmar' : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomModal;
