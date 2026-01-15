import { Component } from 'solid-js';

const Footer: Component = () => {
    const links = {
        Products: ['Chart', 'Screeners', 'Economic Calendar', 'News'],
        Company: ['About', 'Features', 'Pricing', 'Wall of Love'],
        Community: ['Refer a friend', 'House rules', 'Moderators', 'Ideas'],
        Support: ['Help Center', 'Terms of Service', 'Privacy Policy', 'Disclaimer']
    };

    return (
        <footer class="bg-surface border-t border-base mt-12 py-12">
            <div class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    {/* Brand Column */}
                    <div class="col-span-2 lg:col-span-1">
                        <div class="flex items-center gap-2 mb-4">
                             <div class="h-8 w-8 rounded bg-brand flex items-center justify-center text-white font-bold">
                                Tv
                            </div>
                            <span class="text-xl font-bold tracking-tight text-white/90">
                                TradingView
                            </span>
                        </div>
                        <p class="text-sm text-secondary leading-relaxed">
                            Look first / Then leap.
                            <br/>
                            The world's most popular chatting platform for traders and investors.
                        </p>
                    </div>

                    {/* Link Columns */}
                    <ActiveLinks links={links} />
                </div>
                
                <div class="border-t border-base pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p class="text-xs text-secondary text-center md:text-left">
                        © 2024 TradingView Clone Inc. All rights reserved.
                    </p>
                    <div class="flex items-center gap-4">
                        {/* Social Placeholders */}
                        <div class="w-8 h-8 rounded-full bg-base/50 hover:bg-base cursor-pointer transition-colors"></div>
                        <div class="w-8 h-8 rounded-full bg-base/50 hover:bg-base cursor-pointer transition-colors"></div>
                        <div class="w-8 h-8 rounded-full bg-base/50 hover:bg-base cursor-pointer transition-colors"></div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

// Helper for rendering link columns
const ActiveLinks: Component<{links: any}> = (props) => {
    return (
        <>
            {Object.entries(props.links).map(([category, items]) => (
                <div>
                    <h3 class="font-semibold text-primary mb-4">{category}</h3>
                    <ul class="space-y-2">
                        {(items as string[]).map((item) => (
                            <li>
                                <a href="#" class="text-sm text-secondary hover:text-brand transition-colors">
                                    {item}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </>
    );
}

export default Footer;
