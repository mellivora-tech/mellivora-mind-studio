import { A } from '@solidjs/router';
import { LayoutDashboard, LineChart, PieChart, Newspaper, Bot } from 'lucide-solid';
const NavItem = (props) => {
    return (<A href={props.href} class="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200" activeClass="bg-primary/10 text-primary-glow font-medium shadow-[0_0_15px_rgba(59,130,246,0.3)]">
      <props.icon class="w-5 h-5"/>
      <span>{props.label}</span>
    </A>);
};
const Sidebar = () => {
    return (<aside class="w-64 h-screen border-r border-glass-border bg-background/50 backdrop-blur-xl fixed left-0 top-0 flex flex-col z-50">
      <div class="p-6">
        <div class="flex items-center gap-2 mb-8">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-DEFAULT to-purple-600 flex items-center justify-center">
            <Bot class="w-5 h-5 text-white"/>
          </div>
          <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Mellivora
          </span>
        </div>

        <nav class="space-y-2">
          <NavItem href="/" icon={LayoutDashboard} label="Dashboard"/>
          <NavItem href="/market" icon={LineChart} label="Market"/>
          <NavItem href="/portfolio" icon={PieChart} label="Portfolio"/>
          <NavItem href="/news" icon={Newspaper} label="Insights"/>
        </nav>
      </div>

      <div class="mt-auto p-6 border-t border-glass-border">
         <div class="glass-panel p-4 rounded-xl relative overflow-hidden group cursor-pointer hover:border-accent/30 transition-colors">
            <div class="absolute inset-0 bg-accent/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div class="relative z-10 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot class="w-6 h-6 text-accent-glow"/>
              </div>
              <div>
                <div class="text-sm font-medium text-white">Ask AI Agent</div>
                <div class="text-xs text-gray-400">Whatever you need</div>
              </div>
            </div>
         </div>
      </div>
    </aside>);
};
const MainLayout = (props) => {
    return (<div class="min-h-screen">
      <Sidebar />
      <main class="pl-64 min-h-screen">
        <header class="h-16 border-b border-glass-border flex items-center justify-between px-8 bg-background/30 backdrop-blur-sm sticky top-0 z-40">
           <h2 class="text-lg font-medium text-white">Dashboard</h2>
           <div class="flex items-center gap-4">
              <div class="w-8 h-8 rounded-full bg-gray-700"></div>
           </div>
        </header>
        <div class="p-8">
          {props.children}
        </div>
      </main>
    </div>);
};
export default MainLayout;
//# sourceMappingURL=MainLayout.jsx.map