import { createSignal, Show } from 'solid-js';
import { Menu, Search, User, X } from 'lucide-solid';
const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = createSignal(false);
    const navLinks = [
        { name: 'Products', href: '#' },
        { name: 'Community', href: '#' },
        { name: 'Markets', href: '#', active: true },
        { name: 'News', href: '#' },
        { name: 'Brokers', href: '#' },
    ];
    return (<nav class="sticky top-0 z-50 w-full border-b border-base bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div class="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Logo & Desktop Nav */}
        <div class="flex items-center gap-8">
          <a href="/" class="flex items-center gap-2">
            {/* Simple Logo Placeholder */}
            <div class="h-8 w-8 rounded bg-brand flex items-center justify-center text-white font-bold">
              Tv
            </div>
            <span class="text-xl font-bold tracking-tight text-white/90 hidden sm:block">
              TradingView
            </span>
          </a>

          {/* Desktop Links */}
          <div class="hidden md:flex md:items-center md:gap-6">
            {navLinks.map((link) => (<a href={link.href} class={`text-sm font-medium transition-colors hover:text-white ${link.active ? 'text-white' : 'text-secondary'}`}>
                {link.name}
              </a>))}
          </div>
        </div>

        {/* Center: Search (Hidden on small mobile) */}
        <div class="hidden flex-1 items-center justify-center px-8 lg:flex">
          <div class="relative w-full max-w-sm">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search class="h-4 w-4 text-secondary"/>
            </div>
            <input type="text" placeholder="Search markets here" class="block w-full rounded-full border border-base bg-surface py-1.5 pl-10 pr-3 text-sm text-primary placeholder-secondary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"/>
          </div>
        </div>

        {/* Right: Actions */}
        <div class="flex items-center gap-4">
          <button class="rounded-full p-2 text-secondary hover:bg-surface hover:text-white lg:hidden">
            <Search class="h-5 w-5"/>
          </button>
          
          <button class="hidden rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand/90 sm:block transition-colors">
            Get started
          </button>
          
          <button class="rounded-full p-2 text-secondary hover:bg-surface hover:text-white">
            <User class="h-5 w-5"/>
          </button>

          {/* Mobile Menu Toggle */}
          <button class="md:hidden rounded-full p-2 text-primary hover:bg-surface" onClick={() => setIsMenuOpen(!isMenuOpen())}>
            {isMenuOpen() ? <X class="h-6 w-6"/> : <Menu class="h-6 w-6"/>}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <Show when={isMenuOpen()}>
        <div class="md:hidden border-t border-base bg-canvas p-4">
          <div class="flex flex-col gap-4">
            {navLinks.map((link) => (<a href={link.href} class={`text-base font-medium px-2 py-1 ${link.active ? 'text-white bg-surface rounded' : 'text-secondary'}`}>
                {link.name}
              </a>))}
            <hr class="border-base"/>
            <button class="w-full rounded bg-brand py-2 text-center text-sm font-medium text-white">
              Get started
            </button>
          </div>
        </div>
      </Show>
    </nav>);
};
export default Navbar;
//# sourceMappingURL=Navbar.jsx.map