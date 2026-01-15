import { Component } from 'solid-js';
interface MarketCardProps {
    symbol: string;
    name: string;
    price: string;
    change: string;
    type?: 'index' | 'stock' | 'crypto';
}
declare const MarketCard: Component<MarketCardProps>;
export default MarketCard;
//# sourceMappingURL=MarketCard.d.ts.map