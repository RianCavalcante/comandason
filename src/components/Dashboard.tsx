import React, { useState, useEffect, useCallback } from 'react';
import { db, type Delivery } from '../db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, Check, XCircle, MapPin, User, Package, Clock, Loader, RefreshCw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import CustomModal from './CustomModal'; // Added CustomModal import

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useLottie = (url: string) => {
    const [data, setData] = useState<any>(null);
    useEffect(() => {
        fetch(url).then(r => r.json()).then(setData).catch(() => { });
    }, [url]);
    return data;
};

const Dashboard: React.FC = () => {
    const [todaysTotal, setTodaysTotal] = useState(0);
    const [processingDeliveries, setProcessingDeliveries] = useState<Delivery[]>([]);
    const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
    const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [successDeliveryId, setSuccessDeliveryId] = useState<number | null>(null);

    // Custom Modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deliveryToDelete, setDeliveryToDelete] = useState<number | null>(null);
    const [isPendingExpanded, setIsPendingExpanded] = useState(true);
    const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

    const navigate = useNavigate();
    const deliveryAnim = useLottie('/lottie-location.json');
    const emptyAnim = useLottie('/lottie-empty.json');
    const successAnim = useLottie('/lottie-food-delivered.json');

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

        const processing = todayDeliveries.filter(d => d.status === 'processing' || d.status === 'failed');
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
        if (newStatus === 'delivered') {
            setSuccessDeliveryId(id);
            setShowSuccessOverlay(true);
        } else {
            await db.deliveries.update(id, { status: newStatus });
            loadData();
        }
    };

    const handleAnimationComplete = async () => {
        if (successDeliveryId !== null) {
            await db.deliveries.update(successDeliveryId, { status: 'delivered' });
            setShowSuccessOverlay(false);
            setSuccessDeliveryId(null);
            loadData();
        }
    };

    const confirmDelete = (id: number) => {
        setDeliveryToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (deliveryToDelete !== null) {
            await db.deliveries.delete(deliveryToDelete);
            setDeliveryToDelete(null);
            setIsDeleteModalOpen(false); // Close the modal after deletion
            loadData();
        }
    };

    return (
        <div className="dashboard-container">
            <CustomModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Apagar Comanda"
                message="Tem certeza que deseja apagar esta comanda? Esta ação não pode ser desfeita."
                type="confirm"
                variant="danger"
            />
            {/* Success Animation Overlay */}
            {showSuccessOverlay && (
                <div className="success-overlay">
                    <div className="success-container">
                        {successAnim && (
                            <Lottie
                                animationData={successAnim}
                                loop={false}
                                onComplete={handleAnimationComplete}
                                style={{ width: 350, height: 350 }}
                            />
                        )}
                        <h2 className="success-text">ENTREGUE!</h2>
                    </div>
                </div>
            )}

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
                        <h3 className="section-title text-blue">Processando</h3>
                        <span className="section-count">{processingDeliveries.length}</span>
                    </div>
                    <div className="delivery-grid">
                        {processingDeliveries.map(d => (
                            <div key={d.id} className={`delivery-card processing-card ${d.status === 'failed' ? 'failed-card' : ''}`}>
                                <div className="card-accent" />
                                <div className="card-content">
                                    <div className="card-top-row">
                                        <div className="delivery-time-badge">
                                            <Clock size={12} />
                                            {format(d.date, 'HH:mm')}
                                        </div>
                                        {d.status === 'processing' ? (
                                            <Loader size={20} className="spinner" />
                                        ) : (
                                            <XCircle size={20} className="text-danger" />
                                        )}
                                    </div>
                                    <div className="processing-status">
                                        <span className={`processing-label ${d.status === 'processing' ? 'pulse-text' : 'text-danger'}`}>
                                            {d.status === 'processing' ? 'Validando comanda...' : (d.error || 'Falha na leitura')}
                                        </span>
                                    </div>
                                    <div className="card-actions-premium">
                                        {d.status === 'failed' && (
                                            <button
                                                onClick={() => navigate('/scanner', { state: { retryId: d.id } })}
                                                className="btn-deliver" style={{ flex: 2 }}
                                            >
                                                <RefreshCw size={18} /> Tentar Novamente
                                            </button>
                                        )}
                                        <button
                                            onClick={() => confirmDelete(d.id)}
                                            className="btn-cancel" style={{ flex: 1 }}
                                        >
                                            <Trash2 size={18} />
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
                    <div
                        className="section-header clickable-header"
                        onClick={() => setIsPendingExpanded(!isPendingExpanded)}
                    >
                        <h3 className="section-title text-yellow">
                            {deliveryAnim && <Lottie animationData={deliveryAnim} loop autoplay style={{ width: 32, height: 32 }} />}
                            Em Rota
                        </h3>
                        <div className="section-header-actions">
                            <span className="section-count">{pendingDeliveries.length}</span>
                            {isPendingExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </div>
                    {isPendingExpanded && (
                        <div className="delivery-grid animate-fade-in">
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
                                                <CheckCircle2 size={18} /> Entregue
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(d.id, 'canceled')}
                                                className="btn-cancel"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Completed/History Section */}
            <section className="section-container">
                <div
                    className="section-header clickable-header"
                    onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                >
                    <h3 className="section-title">Concluídas</h3>
                    <div className="section-header-actions">
                        <span className="section-count">{completedDeliveries.length}</span>
                        {isCompletedExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>

                {isCompletedExpanded && (
                    <div className="animate-fade-in">
                        {completedDeliveries.length === 0 && pendingDeliveries.length === 0 && processingDeliveries.length === 0 ? (
                            <div className="empty-state-card">
                                {emptyAnim ? (
                                    <Lottie animationData={emptyAnim} loop autoplay style={{ width: 180, height: 180 }} />
                                ) : (
                                    <Package size={48} />
                                )}
                                <p>Nenhuma entrega hoje.<br />Bora rodar!</p>
                            </div>
                        ) : (
                            <div className="delivery-list-vertical">
                                {completedDeliveries.map(d => (
                                    <div key={d.id} className={`delivery-row ${d.status}`}>
                                        <div className="status-indicator"></div>
                                        <div className="row-content">
                                            <div className="row-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="row-time">{format(d.date, 'HH:mm')}</span>
                                                    <button
                                                        onClick={() => confirmDelete(d.id)}
                                                        style={{ background: 'none', border: 'none', color: '#f87171', opacity: 0.6, padding: 0, display: 'flex' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
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
                                    </div>
                                ))}
                            </div>
                        )}
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
