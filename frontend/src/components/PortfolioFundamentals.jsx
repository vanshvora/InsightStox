import './PortfolioFundamentals.css';
import { useNavigate } from 'react-router-dom';

export const PortfolioFundamentals = ({portfolioFundamentals}) => {

    const navigate = useNavigate();

    return (
        <div className="fundamentals-table-wrapper">
            <table className="fundamentals-table">
                <thead>
                    <tr>
                        <th>Stock</th>
                        <th>Last Price</th>
                        <th>Market Cap</th>
                        <th>Forward P/E</th>
                        <th>Ex - Div Date</th>
                        <th>Div/Share</th>
                        <th>Fwn Ann Div Yield</th>
                        <th>Trl Ann Div Rate</th>
                        <th>Trl Ann Div Yield</th>
                        <th>Price Book</th>
                        <th>Current Holding</th>
                    </tr>
                </thead>

                <tbody>
                    {portfolioFundamentals?.map((item, idx) => (
                        <tr key={idx}>
                            <td onClick={() => navigate(`/stockdetails/${item.symbol}`)}>{item.symbol}</td>
                            <td>{item.lastPrice}</td>
                            <td>{item.marketCap}</td>
                            <td>{item.forwardPE}</td>
                            <td>{item.exDivDate}</td>
                            <td>{item.dividendPerShare}</td>
                            <td>{item.forwardAnnualDivYield}</td>
                            <td>{item.trailingAnnualDivRate}</td>
                            <td>{item.trailingAnnualDivYield}</td>
                            <td>{item.priceToBook}</td>
                            <td>{item.currentHolding}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};