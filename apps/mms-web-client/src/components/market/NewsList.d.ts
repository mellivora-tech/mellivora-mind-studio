import { Component } from 'solid-js';
interface NewsItem {
    id: string | number;
    source: string;
    time: string;
    headline: string;
    impact?: 'high' | 'medium' | 'low';
}
interface NewsListProps {
    items: NewsItem[];
}
declare const NewsList: Component<NewsListProps>;
export default NewsList;
//# sourceMappingURL=NewsList.d.ts.map