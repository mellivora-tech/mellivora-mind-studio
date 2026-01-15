import Navbar from './Navbar';
import Footer from './Footer';
const MainLayout = (props) => {
    return (<div class="min-h-screen flex flex-col bg-canvas text-primary font-sans selection:bg-brand/30">
      <Navbar />
      <main class="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {props.children}
      </main>
      
      <Footer />
    </div>);
};
export default MainLayout;
//# sourceMappingURL=MainLayout.jsx.map