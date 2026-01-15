import { For } from 'solid-js';
const TickerTape = () => {
    // Mock Data
    const items = [
        { symbol: 'S&P 500', price: '4,783.45', change: '+0.23%', isUp: true },
        { symbol: 'NASDAQ', price: '15,055.65', change: '+0.45%', isUp: true },
        { symbol: 'DOW JONES', price: '37,592.98', change: '-0.31%', isUp: false },
        { symbol: 'BTCUSD', price: '42,500.00', change: '+1.50%', isUp: true },
        { symbol: 'ETHUSD', price: '2,550.00', change: '+2.10%', isUp: true },
        { symbol: 'TSLA', price: '218.89', change: '-1.20%', isUp: false },
        { symbol: 'AAPL', price: '185.92', change: '+0.50%', isUp: true },
        { symbol: 'NVDA', price: '547.10', change: '+3.20%', isUp: true },
        { symbol: 'GOLD', price: '2,030.50', change: '+0.10%', isUp: true },
        { symbol: 'OIL', price: '72.50', change: '-0.80%', isUp: false },
    ];
    // Duplicate list for infinite scroll effect
    const tickerItems = [...items, ...items];
    return (<div class="w-full overflow-hidden border-b border-base bg-surface/50 py-2">
            <div class="flex animate-scroll-left gap-8 whitespace-nowrap">
                <For each={tickerItems}>
                    {(item) => (<div class="flex items-center gap-2 text-sm">
                            <span class="font-bold text-primary">{item.symbol}</span>
                            <span class="text-primary">{item.price}</span>
                            <span class={`${item.isUp ? 'text-up' : 'text-down'}`}>
                                {item.change}
                            </span>
                        </div>)}
                </For>
            </div>
        </div>);
};
export default TickerTape;
//# sourceMappingURL=TickerTape.jsx.map