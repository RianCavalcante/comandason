import React, { useState, useEffect } from 'react';

interface ConfirmData {
    amount: number | null;
    clientName: string;
    address: string;
}

interface ConfirmModalProps {
    isOpen: boolean;
    initialData: ConfirmData;
    onConfirm: (data: { amount: number, clientName: string, address: string }) => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, initialData, onConfirm, onCancel }) => {
    const [data, setData] = useState<ConfirmData>({ amount: null, clientName: '', address: '' });

    useEffect(() => {
        if (isOpen) {
            setData(initialData);
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
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Cliente</label>
                        <input
                            type="text"
                            value={data.clientName}
                            onChange={(e) => setData({ ...data, clientName: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                            placeholder="Nome do Cliente"
                        />
                    </div>

                    {/* Endereço */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '5px', fontSize: '0.9rem' }}>Endereço</label>
                        <textarea
                            value={data.address}
                            onChange={(e) => setData({ ...data, address: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '60px', fontFamily: 'inherit' }}
                            placeholder="Endereço da entrega"
                        />
                    </div>

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
