import { Show } from 'solid-js';
const MarketCard = (props) => {
    const isUp = () => props.change.startsWith('+');
    return (<div class="bg-surface rounded-lg p-4 border border-base hover:border-brand/50 transition-colors cursor-pointer group relative overflow-hidden">
      {/* Top Row: Icon & Info */}
      <div class="flex items-start justify-between mb-4 relative z-10">
        <div class="flex items-center gap-3">
          {/* Placeholder Logo/Icon */}
          <div class="w-10 h-10 rounded-full bg-base flex items-center justify-center text-xs font-bold text-secondary">
            {props.symbol.substring(0, 2)}
          </div>
          <div>
            <div class="font-bold text-primary group-hover:text-brand transition-colors">
              {props.symbol}
            </div>
            <div class="text-xs text-secondary truncate max-w-[100px]">
              {props.name}
            </div>
          </div>
        </div>
        
        <div class="text-right">
          <div class={`font-medium ${isUp() ? 'text-up' : 'text-down'}`}>
            {props.change}
          </div>
          <div class="text-xs text-secondary">{props.price}</div>
        </div>
      </div>

      {/* Mock Sparkline (Background) */}
      <div class="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
        <Show when={isUp()} fallback={<svg class="w-full h-full text-down" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <path d="M0 10 L10 15 L20 12 L30 20 L40 18 L50 30 L60 25 L70 35 L80 32 L90 38 L100 40 L100 40 L0 40 Z" fill="currentColor"/>
                </svg>}>
            <svg class="w-full h-full text-up" preserveAspectRatio="none" viewBox="0 0 100 40">
                <path d="M0 40 L10 35 L20 38 L30 30 L40 32 L50 20 L60 25 L70 15 L80 18 L90 5 L100 10 L100 40 L0 40 Z" fill="currentColor"/>
            </svg>
        </Show>
      </div>
    </div>);
};
export default MarketCard;
//# sourceMappingURL=MarketCard.jsx.map