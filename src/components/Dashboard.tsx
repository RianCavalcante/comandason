import React, { useState, useEffect } from 'react';
import { db, type Delivery } from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Check, X, MapPin, User, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const [todaysTotal, setTodaysTotal] = useState(0);
    const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
    const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);
    const navigate = useNavigate();

    const loadData = async () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const todayDeliveries = await db.deliveries
            .where('date')
            .aboveOrEqual(startOfDay)
            .toArray();

        const total = todayDeliveries
            .filter(d => d.status !== 'canceled')
            .reduce((sum, d) => sum + d.amount, 0);

        setTodaysTotal(total);

        const pending = todayDeliveries.filter(d => d.status === 'pending');
        const completed = todayDeliveries
            .filter(d => d.status !== 'pending')
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        setPendingDeliveries(pending);
        setCompletedDeliveries(completed);
    };

    useEffect(() => {
        loadData();
    }, []);

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
                    <div className="user-avatar">
                        <User size={20} />
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

            {/* Pending Deliveries Section */}
            {pendingDeliveries.length > 0 && (
                <section className="section-container">
                    <div className="section-header">
                        <h3 className="section-title text-yellow">Em Rota 🛵</h3>
                        <span className="section-count">{pendingDeliveries.length}</span>
                    </div>
                    <div className="delivery-grid">
                        {pendingDeliveries.map(d => (
                            <div key={d.id} className="delivery-card pending-card">
                                <div className="card-header">
                                    <div className="delivery-time-badge">
                                        <Clock size={12} />
                                        {format(d.date, 'HH:mm')}
                                    </div>
                                    <span className="delivery-amount-highlight">R$ {d.amount.toFixed(2)}</span>
                                </div>

                                {(d.clientName || d.address) && (
                                    <div className="card-body">
                                        {d.clientName && (
                                            <div className="info-row">
                                                <User size={14} className="icon-muted" />
                                                <span>{d.clientName}</span>
                                            </div>
                                        )}
                                        {d.address && (
                                            <div className="info-row">
                                                <MapPin size={14} className="icon-muted" />
                                                <span>{d.address}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="card-actions">
                                    <button
                                        onClick={() => handleStatusChange(d.id, 'delivered')}
                                        className="btn-action btn-success"
                                    >
                                        <Check size={18} /> Entregue
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(d.id, 'canceled')}
                                        className="btn-action btn-danger"
                                    >
                                        <X size={18} />
                                    </button>
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

                {completedDeliveries.length === 0 && pendingDeliveries.length === 0 ? (
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
