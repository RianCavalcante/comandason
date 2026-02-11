import React, { useState, useEffect } from 'react';
import { db, type Delivery } from '../db';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Download, MapPin } from 'lucide-react';

type FilterType = 'today' | 'week' | 'month';

const History: React.FC = () => {
    const [filter, setFilter] = useState<FilterType>('week');
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            let collection;
            const now = new Date();

            if (filter === 'today') {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                collection = db.deliveries.where('date').aboveOrEqual(start);
            } else if (filter === 'week') {
                const start = startOfWeek(now, { weekStartsOn: 0 }); // Sunday start
                collection = db.deliveries.where('date').aboveOrEqual(start);
            } else {
                const start = startOfMonth(now);
                collection = db.deliveries.where('date').aboveOrEqual(start);
            }

            const items = await collection.toArray();
            // Sort desc
            items.sort((a, b) => b.date.getTime() - a.date.getTime());

            setDeliveries(items);

            // Only sum valid (delivered or pending) items, exclude canceled
            setTotal(items
                .filter(d => d.status !== 'canceled')
                .reduce((sum, d) => sum + d.amount, 0));
        };

        loadData();
    }, [filter]);

    const handleExport = async () => {
        try {
            const allData = await db.deliveries.toArray();
            const jsonString = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `comandason_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Erro ao exportar dados.");
        }
    };

    const getStatusColor = (status: Delivery['status']) => {
        switch (status) {
            case 'delivered': return '#10b981';
            case 'canceled': return '#ef4444';
            default: return '#fbbf24';
        }
    };

    return (
        <div className="history-container">
            <header className="history-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>Histórico</h2>
                    <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <Download size={18} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Backup</span>
                    </button>
                </div>

                <div className="filter-tabs">
                    <button
                        className={`tab ${filter === 'today' ? 'active' : ''}`}
                        onClick={() => setFilter('today')}
                    >
                        Hoje
                    </button>
                    <button
                        className={`tab ${filter === 'week' ? 'active' : ''}`}
                        onClick={() => setFilter('week')}
                    >
                        Semana
                    </button>
                    <button
                        className={`tab ${filter === 'month' ? 'active' : ''}`}
                        onClick={() => setFilter('month')}
                    >
                        Mês
                    </button>
                </div>
                <div className="period-total" style={{ marginTop: '20px' }}>
                    <span>Total:</span>
                    <span className="value">R$ {total.toFixed(2)}</span>
                </div>
            </header>

            <ul className="history-list">
                {deliveries.map(d => (
                    <li key={d.id} className="history-item" style={{ borderLeft: `4px solid ${getStatusColor(d.status)}` }}>
                        <div style={{ flex: 1 }}>
                            <div className="history-date">
                                <Calendar size={14} />
                                <span style={{ marginRight: '10px' }}>{format(d.date, 'dd/MM', { locale: ptBR })}</span>
                                <span className="history-time">{format(d.date, 'HH:mm')}</span>
                            </div>
                            {(d.clientName || d.address) && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {d.address && <MapPin size={12} />}
                                    <span>{d.clientName || d.address}</span>
                                </div>
                            )}
                        </div>
                        <div className="history-details">
                            <span className="history-amount" style={{ textDecoration: d.status === 'canceled' ? 'line-through' : 'none', color: d.status === 'canceled' ? '#ef4444' : 'white' }}>
                                R$ {d.amount.toFixed(2)}
                            </span>
                        </div>
                    </li>
                ))}
                {deliveries.length === 0 && <p className="empty-history" style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px' }}>Sem registros no período.</p>}
            </ul>
        </div>
    );
};

export default History;
