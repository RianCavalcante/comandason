import React, { useState } from 'react';
import { X, User, MapPin, DollarSign, Save } from 'lucide-react';
import { db } from '../db';

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [clientName, setClientName] = useState('');
    const [address, setAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(',', '.'));

        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        setIsSaving(true);
        try {
            await db.deliveries.add({
                amount: numAmount,
                clientName: clientName.trim() || 'Cliente Manual',
                address: address.trim() || 'Endereço não informado',
                status: 'pending',
                date: new Date(),
                rawText: 'Entrada Manual',
                createdAt: new Date()
            });
            onSuccess();
            onClose();
            // Reset form
            setClientName('');
            setAddress('');
            setAmount('');
        } catch (error) {
            console.error('Error adding manual delivery:', error);
            alert('Erro ao salvar entrega.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="manual-entry-content">
                <div className="manual-entry-header">
                    <h2>Nova Entrega</h2>
                    <button onClick={onClose} className="btn-close-modal">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="manual-entry-form">
                    <div className="input-group-premium">
                        <label><User size={16} /> Nome do Cliente</label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Ex: João Silva"
                            autoFocus
                        />
                    </div>

                    <div className="input-group-premium">
                        <label><MapPin size={16} /> Endereço</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Rua, Número, Bairro"
                        />
                    </div>

                    <div className="input-group-premium">
                        <label><DollarSign size={16} /> Valor da Entrega</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-save-manual" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : <><Save size={20} /> Salvar Entrega</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManualEntryModal;
