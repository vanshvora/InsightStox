import { useState } from 'react';
import './PortfolioHoldings.css';
import { useNavigate } from 'react-router-dom';

export const PortfolioHoldings = ({portfolioHoldings}) => {

    const navigate = useNavigate();
    const [dayGainMode, setDayGainMode] = useState('value');
    const [totalGainMode, setTotalGainMode] = useState('value');

    return (
        <div className="holdings-table-wrapper">
            <table className="holdings-table">
                <thead>
                    <tr>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Shares</th>
                        <th>Last Price</th>
                        <th>Avg. Buy Price</th>
                        <th>Total Invested</th>
                        <th>Current Value</th>
                        <th>
                            Day's Gain
                            <span 
                                onClick={() => setDayGainMode(dayGainMode === 'percent' ? 'value' : 'percent')}
                                style={{ cursor: 'pointer', background: '#333', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '0.8em', marginLeft: '8px', transition: '0.2s' }}
                                title="Click to toggle % / ₹"
                            >
                                {dayGainMode === 'percent' ? '%' : '₹'}
                            </span>
                        </th>
                        <th>
                            Total Gain
                            <span 
                                onClick={() => setTotalGainMode(totalGainMode === 'percent' ? 'value' : 'percent')}
                                style={{ cursor: 'pointer', background: '#333', color: '#fff', borderRadius: '4px', padding: '2px 6px', fontSize: '0.8em', marginLeft: '8px', transition: '0.2s' }}
                                title="Click to toggle % / ₹"
                            >
                                {totalGainMode === 'percent' ? '%' : '₹'}
                            </span>
                        </th>
                        <th>Realized Gain</th>
                    </tr>
                </thead>

                <tbody>
                    {portfolioHoldings?.map((item, idx) => (
                        <tr key={idx}>
                            <td onClick={() => navigate(`/stockdetails/${item.symbol}`)} style={{cursor: 'pointer'}}>{item.symbol}</td>
                            <td>{item.status}</td>
                            <td>{item.shares}</td>
                            <td>{item.lastPrice}</td>
                            <td>{item.avgPrice}</td>
                            <td>{item.totalCost}</td>
                            <td>{item.marketValue}</td>
                            <td className={Number(item.dayGainValue) < 0 ? "negative" : "positive"}>
                                {dayGainMode === 'percent' ? `${item.dayGainPercent}%` : item.dayGainValue}
                            </td>
                            <td className={Number(item.totalGainValue) < 0 ? "negative" : "positive"}>
                                {totalGainMode === 'percent' ? `${item.totalGainPercent}%` : item.totalGainValue}
                            </td>
                            <td>{item.realizedGain}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};