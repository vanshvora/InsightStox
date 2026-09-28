import { useState } from 'react';
import './PortfolioSummary.css';
import { useNavigate } from 'react-router-dom';

export const PortfolioSummary = ({portfolioSummary}) => {

    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('value');

    return (
        <div className="summary-table-wrapper">
            <table className="summary-table">
                <thead>
                    <tr>
                        <th>Stock</th>
                        <th>Last Price</th>
                        <th>
                            Today's Change
                            <span 
                                onClick={() => setViewMode(viewMode === 'percent' ? 'value' : 'percent')}
                                style={{ cursor: 'pointer', background: '#333', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '0.8em', marginLeft: '8px', transition: '0.2s' }}
                                title="Click to toggle % / ₹"
                            >
                                {viewMode === 'percent' ? '%' : '₹'}
                            </span>
                        </th>
                        <th>Volume</th>
                        <th>Shares</th>
                        <th>Day Range</th>
                        <th>52W Range</th>
                        <th>Market Cap</th>
                    </tr>
                </thead>

                <tbody>
                    {portfolioSummary?.map((item, idx) => (
                        <tr key={idx}>
                            <td onClick={() => navigate(`/stockdetails/${item.symbol}`)} style={{cursor: 'pointer'}}>{item.symbol}</td>
                            <td>{item.lastPrice}</td>
                            <td
                                className={
                                    Number(item.change) < 0
                                        ? "negative"
                                        : "positive"
                                }
                            >
                                {viewMode === 'percent' ? `${item.changePercent}%` : item.change}
                            </td>
                            <td>{item.volume}</td>
                            <td>{item.shares}</td>
                            <td className="range">{item.dayRange}</td>
                            <td className="range">{item.yearRange}</td>
                            <td>{item.marketCap}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};