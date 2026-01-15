import TickerTape from '../components/market/TickerTape';
import MarketCard from '../components/market/MarketCard';
import MarketList from '../components/market/MarketList';
import NewsList from '../components/market/NewsList';
// Mock Data
const INDICES = [
    { symbol: 'SPX', name: 'S&P 500', price: '4,890.97', change: '+1.20%' },
    { symbol: 'NDX', name: 'Nasdaq 100', price: '17,421.05', change: '+1.95%' },
    { symbol: 'DJI', name: 'Dow Jones', price: '38,001.81', change: '+0.36%' },
    { symbol: 'VIX', name: 'Volatility', price: '13.25', change: '-4.50%' },
];
const STOCKS = [
    { id: 1, symbol: 'NVDA', name: 'NVIDIA Corp', price: '613.62', change: '+4.17%', volume: '45M' },
    { id: 2, symbol: 'AMD', name: 'Adv. Micro Devices', price: '180.33', change: '+5.80%', volume: '88M' },
    { id: 3, symbol: 'TSLA', name: 'Tesla Inc', price: '209.14', change: '-1.50%', volume: '102M' },
    { id: 4, symbol: 'AAPL', name: 'Apple Inc', price: '195.18', change: '+0.60%', volume: '35M' },
    { id: 5, symbol: 'MSFT', name: 'Microsoft Corp', price: '402.56', change: '+0.90%', volume: '22M' },
];
const CRYPTO = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin', price: '41,250.00', change: '-2.10%' },
    { id: 2, symbol: 'ETH', name: 'Ethereum', price: '2,450.00', change: '-3.15%' },
    { id: 3, symbol: 'SOL', name: 'Solana', price: '88.10', change: '-0.50%' },
    { id: 4, symbol: 'LINK', name: 'Chainlink', price: '15.20', change: '+4.20%' },
];
const NEWS_ITEMS = [
    { id: 1, source: "Reuters", time: "2h ago", headline: "Fed signals potential rate cuts coming sooner than expected, markets rally in response." },
    { id: 2, source: "Bloomberg", time: "3h ago", headline: "Bitcoin surges past $42k as ETF approval rumors heat up." },
    { id: 3, source: "CNBC", time: "4h ago", headline: "Tech stocks lead rally; NVIDIA hits all-time high." },
    { id: 4, source: "WSJ", time: "5h ago", headline: "Oil prices drop on global demand concerns." },
];
const MarketsPage = () => {
    return (<div class="space-y-8 animate-fade-in">
            {/* Section 1: Hero / Ticker */}
            <section>
                <h1 class="text-3xl font-bold text-primary mb-6">Markets Today</h1>
                <TickerTape />
            </section>

            {/* Section 2: Market Overview Grid */}
            <section>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-primary">Global Indices</h2>
                    <button class="text-sm font-medium text-brand hover:text-white transition-colors">
                        View Map
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {INDICES.map((item) => (<MarketCard {...item}/>))}
                </div>
            </section>

            {/* Section 3: Lists & News */}
            <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                 {/* List 1: Most Active */}
                 <div class="lg:col-span-4 h-96">
                    <MarketList title="Most Active Stocks" items={STOCKS}/>
                 </div>

                 {/* List 2: Crypto */}
                 <div class="lg:col-span-4 h-96">
                    <MarketList title="Top Crypto" items={CRYPTO}/>
                 </div>

                 {/* News Column */}
                 <div class="lg:col-span-4 h-96">
                    <NewsList items={NEWS_ITEMS}/>
                 </div>
            </section>
        </div>);
};
export default MarketsPage;
//# sourceMappingURL=MarketsPage.jsx.map