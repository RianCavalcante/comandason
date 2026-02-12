import React, { useState, useEffect, useCallback } from 'react';
import { db, type Delivery } from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Check, X, MapPin, User, Package, Clock, Loader, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const [todaysTotal, setTodaysTotal] = useState(0);
    const [processingDeliveries, setProcessingDeliveries] = useState<Delivery[]>([]);
    const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
    const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const todayDeliveries = await db.deliveries
            .where('date')
            .aboveOrEqual(startOfDay)
            .toArray();

        const total = todayDeliveries
            .filter(d => d.status !== 'canceled' && d.status !== 'processing')
            .reduce((sum, d) => sum + d.amount, 0);

        setTodaysTotal(total);

        const processing = todayDeliveries.filter(d => d.status === 'processing');
        const pending = todayDeliveries.filter(d => d.status === 'pending');
        const completed = todayDeliveries
            .filter(d => d.status === 'delivered' || d.status === 'canceled')
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        setProcessingDeliveries(processing);
        setPendingDeliveries(pending);
        setCompletedDeliveries(completed);
    }, []);

    useEffect(() => {
        loadData();

        // Auto-refresh every 2 seconds to catch webhook updates
        const interval = setInterval(loadData, 2000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleStatusChange = async (id: number, newStatus: 'delivered' | 'canceled') => {
        await db.deliveries.update(id, { status: newStatus });
        loadData();
    };

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja apagar esta comanda?')) {
            await db.deliveries.delete(id);
            loadData();
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header / Stats Card */}
            <header className="dashboard-header-card">
                <div className="header-top">
                    <div>
                        <h1 className="app-title">Comandason</h1>
                        <p className="date-display">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={loadData} className="btn-refresh" title="Atualizar">
                            <RefreshCw size={20} />
                        </button>
                        <div className="app-logo">
                            <img src="/logo.png" alt="Comandason" />
                        </div>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="main-stat">
                        <span className="stat-label">Saldo do Dia</span>
                        <div className="daily-total">
                            <span className="currency">R$</span>
                            <span className="amount">{todaysTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="mini-stat-group">
                        <div className="mini-stat">
                            <Check size={16} className="text-green" />
                            <span className="stat-value">{completedDeliveries.filter(d => d.status === 'delivered').length}</span>
                            <span className="stat-label">Feitas</span>
                        </div>
                        <div className="mini-stat">
                            <Clock size={16} className="text-yellow" />
                            <span className="stat-value">{pendingDeliveries.length}</span>
                            <span className="stat-label">Rota</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Processing Deliveries (waiting for n8n) */}
            {processingDeliveries.length > 0 && (
                <section className="section-container">
                    <div className="section-header">
                        <h3 className="section-title text-blue">Processando 🤖</h3>
                        <span className="section-count">{processingDeliveries.length}</span>
                    </div>
                    <div className="delivery-grid">
                        {processingDeliveries.map(d => (
                            <div key={d.id} className="delivery-card processing-card">
                                <div className="card-accent" />
                                <div className="card-content">
                                    <div className="card-top-row">
                                        <div className="delivery-time-badge">
                                            <Clock size={12} />
                                            {format(d.date, 'HH:mm')}
                                        </div>
                                        <Loader size={20} className="spinner" />
                                    </div>
                                    <div className="processing-status">
                                        <span className="processing-label pulse-text">Validando comanda...</span>
                                    </div>
                                    <div className="card-actions-premium">
                                        <button
                                            onClick={() => handleDelete(d.id)}
                                            className="btn-cancel" style={{ flex: 1 }}
                                        >
                                            <X size={18} /> Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Pending Deliveries Section */}
            {pendingDeliveries.length > 0 && (
                <section className="section-container">
                    <div className="section-header">
                        <h3 className="section-title text-yellow">Em Rota 🛵</h3>
                        <span className="section-count">{pendingDeliveries.length}</span>
                    </div>
                    <div className="delivery-grid">
                        {pendingDeliveries.map(d => (
                            <div key={d.id} className="delivery-card premium-card">
                                <div className="card-accent" />
                                <div className="card-content">
                                    <div className="card-top-row">
                                        <div className="delivery-time-badge">
                                            <Clock size={12} />
                                            {format(d.date, 'HH:mm')}
                                        </div>
                                        <div className="delivery-amount-big">
                                            <span className="currency-small">R$</span>
                                            <span className="amount-value">{d.amount.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {(d.clientName || d.address) && (
                                        <div className="card-info-section">
                                            {d.clientName && (
                                                <div className="info-chip">
                                                    <User size={13} />
                                                    <span>{d.clientName}</span>
                                                </div>
                                            )}
                                            {d.address && (
                                                <div className="info-chip address-chip">
                                                    <MapPin size={13} />
                                                    <span>{d.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="card-actions-premium">
                                        <button
                                            onClick={() => handleStatusChange(d.id, 'delivered')}
                                            className="btn-deliver"
                                        >
                                            <Check size={18} /> Entregue
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(d.id, 'canceled')}
                                            className="btn-cancel"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Completed/History Section */}
            <section className="section-container">
                <div className="section-header">
                    <h3 className="section-title">Concluídas</h3>
                </div>

                {completedDeliveries.length === 0 && pendingDeliveries.length === 0 && processingDeliveries.length === 0 ? (
                    <div className="empty-state-card">
                        <Package size={48} />
                        <p>Nenhuma entrega hoje.<br />Bora rodar!</p>
                    </div>
                ) : (
                    <div className="delivery-list-vertical">
                        {completedDeliveries.map(d => (
                            <div key={d.id} className={`delivery-row ${d.status}`}>
                                <div className="status-indicator"></div>
                                <div className="row-content">
                                    <div className="row-header">
                                        <span className="row-time">{format(d.date, 'HH:mm')}</span>
                                        <span className={`row-amount ${d.status === 'canceled' ? 'canceled-text' : ''}`}>
                                            R$ {d.amount.toFixed(2)}
                                        </span>
                                    </div>
                                    {(d.clientName || d.address) && (
                                        <div className="row-details">
                                            {d.clientName && <span>{d.clientName}</span>}
                                            {d.address && <span> • {d.address}</span>}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => handleDelete(d.id)} className="btn-icon-small">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <button className="fab-scan-large" onClick={() => navigate('/scanner')}>
                <Plus size={32} />
            </button>
        </div>
    );
};

export default Dashboard;
