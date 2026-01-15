import { For } from 'solid-js';
const NewsList = (props) => {
    return (<div class="flex flex-col h-full bg-surface rounded-lg border border-base overflow-hidden">
            <div class="p-4 border-b border-base flex items-center justify-between">
                <h3 class="font-semibold text-primary">Breaking News</h3>
                <button class="text-xs font-medium text-brand hover:text-white transition-colors">
                    More
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-5">
                <For each={props.items}>
                    {(item) => (<div class="group cursor-pointer flex gap-3">
                            {/* Sentinel / Dot */}
                            <div class="mt-1.5 min-w-[6px] h-1.5 rounded-full bg-brand/50 group-hover:bg-brand transition-colors"></div>
                            
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-[10px] uppercase font-bold text-secondary">
                                        {item.source}
                                    </span>
                                    <span class="text-[10px] text-secondary">•</span>
                                    <span class="text-xs text-secondary">{item.time}</span>
                                </div>
                                <h4 class="text-sm font-medium text-primary/90 group-hover:text-brand transition-colors leading-snug">
                                    {item.headline}
                                </h4>
                            </div>
                        </div>)}
                </For>
            </div>
        </div>);
};
export default NewsList;
//# sourceMappingURL=NewsList.jsx.map