import React from "react";

export const SiteLegal = () => {
  return (  <div className="policy-text">
            <p><strong>1. Introduction</strong><br />
                Welcome to InsightStox. We provide a platform designed to help individual investors track portfolios, analyze market data, and receive AI-driven investment insights. We are committed to operating within legal boundaries and ensuring the security of your financial data. This policy outlines our data practices in compliance with relevant regulations.</p>

            <p><strong>2. Information We Collect</strong><br />
                <strong>&bull;&nbsp;Account & Profile Data</strong><br />
                To provide our services, we collect personal details during registration (Sign Up) and login, including your name, email address, and authentication credentials. We may also collect your risk profile and investment goals to tailor AI suggestions.<br />
                <strong>&bull;&nbsp;Portfolio & Watchlist Data</strong><br />
                We process the financial data you input, including:
                <ul>
                    <li>Stocks added to your Portfolio (Ticker, Quantity, Purchase Price).</li>
                    <li>Stocks added to your Watchlists for monitoring.</li>
                    <li>Transaction history for performance analysis.</li>
                </ul>
            </p>

            <p><strong>3. How We Use Your Information</strong><br />
                <ul>
                    <li><strong>&bull;&nbsp;Real-time Tracking:</strong> To fetch live market data and update your portfolio valuation with minimal latency.</li>
                    <li><strong>&bull;&nbsp;AI Insights:</strong> To generate personalized recommendations, risk alerts, and portfolio optimization strategies based on your holdings.</li>
                    <li><strong>&bull;&nbsp;Dashboard Visualization:</strong> To render interactive charts and performance graphs for better decision-making.</li>
                    <li><strong>&bull;&nbsp;Service Availability: </strong>To ensure the platform remains accessible during NSE/BSE trading hours.</li>
                </ul>
            </p>

            <p><strong>4. Regulatory Compliance</strong><br />
                InsightStox operates as a financial tool and adheres to guidelines set by regulatory authorities to ensure transparency and investor protection.<br />
                <strong>&bull;&nbsp;Compliance Authorities</strong><br />
                We strive to comply with norms established by bodies such as SEBI (Securities and Exchange Board of India), SEC, and applicable GDPR regulations. Our advisory features are designed to be informational tools, following disclosure norms and data handling policies.</p>

            <p><strong>5. Data Sharing and Disclosure</strong><br />
                We respect your privacy. Data sharing is limited to the following stakeholders essential for platform functionality:<br />
                <strong>&bull;&nbsp;API & Data Providers</strong><br />
                We interact with NSE-approved data APIs to fetch real-time prices and historical data. Your portfolio aggregation does not require sharing personal identity with these providers.<br />
                <strong>&bull;&nbsp;Legal Obligations</strong><br />
                We may disclose information if required by law or to comply with valid requests from regulators (e.g., SEBI audits) or law enforcement.</p>

            <p><strong>6. Data Security</strong><br />
                Security is a core requirement of InsightStox. We implement robust measures to protect your data from unauthorized access.<br />
                <ul>
                    <li><strong>&bull;&nbsp;Encryption:</strong><br /> Sensitive user data is encrypted to ensure confidentiality.</li>
                    <li><strong>&bull;&nbsp;Secure Authentication:</strong><br />We use secure login/logout mechanisms to manage user sessions and prevent unauthorized access.</li>
                    <li><strong>&bull;&nbsp;Reliability::</strong><br />Our system is built to handle failures gracefully, ensuring consistent data processing and integrity.</li>
                </ul>
            </p>

            <p><strong>7. Your Rights</strong><br />
                As an investor using our platform, you have the right to:<br />
                <ul>
                    <li><strong>&bull;&nbsp;Access & Portability:</strong><br />View and export your portfolio data at any time.</li>
                    <li><strong>&bull;&nbsp;Accuracy:</strong><br />Correct any inaccuracies in your personal or financial data.</li>
                    <li><strong>&bull;&nbsp;Withdrawal:</strong><br /> You may securely delete your account and portfolio information from our systems at any time.</li>
                </ul>
            </p>

            <p><strong>8. Contact Us</strong><br />
                If you have any questions about this Privacy Policy, please contact us.</p>
  </div>
);

}
