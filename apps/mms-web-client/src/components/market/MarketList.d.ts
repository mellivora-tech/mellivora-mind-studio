import { Component } from 'solid-js';
export interface MarketListItem {
    id: string | number;
    symbol: string;
    name: string;
    price: string;
    change: string;
    volume?: string;
}
interface MarketListProps {
    title: string;
    items: MarketListItem[];
    onViewAll?: () => void;
}
declare const MarketList: Component<MarketListProps>;
export default MarketList;
//# sourceMappingURL=MarketList.d.ts.map