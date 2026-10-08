import { NavLink, Route, Routes } from "react-router-dom";
import { AppDataProvider, useAppData } from "./AppData";
import { Footer } from "./components/Footer";
import { About } from "./pages/About";
import { Browse } from "./pages/Browse";
import { Compare } from "./pages/Compare";
import { ProductPage } from "./pages/ProductPage";

function Header() {
  const { selected } = useAppData();
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <NavLink to="/" className="brand">
          Purr Facts
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Browse
          </NavLink>
          <NavLink to={selected.length > 0 ? `/compare?ids=${selected.join(",")}` : "/compare"}>Compare{selected.length > 0 ? ` (${selected.length})` : ""}</NavLink>
          <NavLink to="/about">About this data</NavLink>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <AppDataProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="wrap">
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<p>That page doesn't exist. <NavLink to="/">Back to the catalog</NavLink>.</p>} />
        </Routes>
      </main>
      <Footer />
    </AppDataProvider>
  );
}
