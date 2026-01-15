import { For } from 'solid-js';
const MarketList = (props) => {
    return (<div class="bg-surface rounded-lg border border-base flex flex-col h-full">
      {/* Header */}
      <div class="p-4 border-b border-base flex items-center justify-between">
        <h3 class="font-semibold text-primary">{props.title}</h3>
        <button onClick={props.onViewAll} class="text-xs font-medium text-brand hover:text-white transition-colors">
          View All
        </button>
      </div>

      {/* List */}
      <div class="flex-1 overflow-y-auto">
        <For each={props.items}>
          {(item) => {
            const isUp = item.change.startsWith('+');
            return (<div class="flex items-center justify-between p-3 border-b border-base/50 last:border-0 hover:bg-white/5 transition-colors cursor-pointer group">
                  {/* Left: Symbol */}
                  <div class="flex items-center gap-3">
                    <div class="w-1 rounded-full h-8 transition-colors" classList={{ 'bg-up': isUp, 'bg-down': !isUp, 'bg-secondary': false }}/>
                    <div>
                      <div class="font-bold text-sm text-primary group-hover:text-brand transition-colors">
                        {item.symbol}
                      </div>
                      <div class="text-xs text-secondary">{item.name || 'Company Inc.'}</div>
                    </div>
                  </div>

                  {/* Right: Data */}
                  <div class="text-right">
                    <div class="font-medium text-sm text-primary">{item.price}</div>
                    <div class={`text-xs font-medium px-1.5 py-0.5 rounded ml-auto w-fit mt-1 ${isUp ? 'bg-up/10 text-up' : 'bg-down/10 text-down'}`}>
                        {item.change}
                    </div>
                  </div>
                </div>);
        }}
        </For>
      </div>
    </div>);
};
export default MarketList;
//# sourceMappingURL=MarketList.jsx.map