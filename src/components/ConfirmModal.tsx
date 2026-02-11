import React, { useState, useEffect } from 'react';

interface ConfirmData {
    amount: number | null;
    clientName: string;
    address: string;
}

interface ConfirmModalProps {
    isOpen: boolean;
    initialData: ConfirmData;
    rawText?: string;
    onConfirm: (data: { amount: number, clientName: string, address: string }) => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, initialData, rawText, onConfirm, onCancel }) => {
    const [data, setData] = useState<ConfirmData>({ amount: null, clientName: '', address: '' });
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setData(initialData);
            setShowRaw(false);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.amount !== null && !isNaN(data.amount)) {
            onConfirm({
                amount: data.amount,
                clientName: data.clientName,
                address: data.address
            });
        } else {
            alert("O valor é obrigatório.");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Confirmar Entrega</h2>
                <form onSubmit={handleSubmit}>

                    {/* Valor */}
                    <div className="input-group">
                        <span className="currency-symbol">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Valor"
                            value={data.amount === null ? '' : data.amount}
                            onChange={(e) => setData({ ...data, amount: parseFloat(e.target.value) })}
                            className="value-input"
                            required
                        />
                    </div>

                    {/* Nome do Cliente */}
                    <div className="modal-field">
                        <label>Cliente</label>
                        <input
                            type="text"
                            value={data.clientName}
                            onChange={(e) => setData({ ...data, clientName: e.target.value })}
                            className="modal-input"
                            placeholder="Nome do Cliente"
                        />
                    </div>

                    {/* Endereço */}
                    <div className="modal-field">
                        <label>Endereço</label>
                        <textarea
                            value={data.address}
                            onChange={(e) => setData({ ...data, address: e.target.value })}
                            className="modal-input modal-textarea"
                            placeholder="Endereço da entrega"
                        />
                    </div>

                    {/* Texto bruto do OCR */}
                    {rawText && (
                        <div className="ocr-raw-section">
                            <button
                                type="button"
                                className="btn-toggle-raw"
                                onClick={() => setShowRaw(!showRaw)}
                            >
                                {showRaw ? '▼ Ocultar texto lido' : '▶ Ver texto lido pelo OCR'}
                            </button>
                            {showRaw && (
                                <pre className="ocr-raw-text">{rawText}</pre>
                            )}
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onCancel} className="btn-cancel">Cancelar</button>
                        <button type="submit" className="btn-confirm">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConfirmModal;
