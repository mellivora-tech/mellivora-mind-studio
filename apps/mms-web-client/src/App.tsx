import type { Component } from 'solid-js'
import MainLayout from './layouts/MainLayout'
import { Bot } from 'lucide-solid'

const App: Component = () => {
  return (
    <MainLayout>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Assets Card */}
        <div class="glass-panel p-6 rounded-2xl relative overflow-hidden col-span-2">
           <div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <h3 class="text-gray-400 text-sm font-medium mb-1 relative">Total Assets</h3>
           <div class="text-3xl font-bold text-white mb-4 relative">$1,250,420.50</div>
           
           <div class="h-64 flex items-end gap-2 relative">
              {/* Fake Chart Bars */}
              {[40, 65, 55, 80, 70, 90, 85, 95, 100].map(h => (
                <div 
                  class="flex-1 bg-gradient-to-t from-primary/20 to-primary/80 rounded-t-sm hover:from-primary/40 hover:to-primary-glow transition-all duration-300 cursor-pointer group"
                  style={{ height: `${h}%` }}
                >
                   <div class="opacity-0 group-hover:opacity-100 absolute -top-8 bg-surface px-2 py-1 rounded text-xs border border-glass-border transition-opacity">
                      ${h * 1234}
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* AI Insight Card */}
        <div class="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden border-accent/20">
           <div class="absolute top-0 right-0 w-full h-full bg-accent/5"></div>
           <div class="flex items-center gap-2 mb-4 relative">
             <Bot class="w-5 h-5 text-accent-glow" />
             <h3 class="text-accent-glow font-medium">Daily Insight</h3>
           </div>
           
           <div class="relative flex-1">
             <p class="text-gray-300 text-sm leading-relaxed">
               <span class="text-white font-medium">Market Alert:</span> Tech sector is showing strong momentum today driven by semiconductor earnings.
               <br/><br/>
               The volatility index has decreased by <span class="text-green-400">2.4%</span>, suggesting a stable trading environment for your portfolio.
             </p>
           </div>

           <button class="mt-4 w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent-glow rounded-lg text-sm font-medium transition-colors border border-accent/20">
             Ask for details
           </button>
        </div>
      </div>
    </MainLayout>
  )
}

export default App
