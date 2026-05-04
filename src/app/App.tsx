'use client';

import { BrowserRouter, Routes, Route, Navigate, useLocation, Router } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { FilterProvider } from './contexts/FilterContext';
import Home from './pages/Home';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import NewAd from './pages/NewAd';
import MyAds from './pages/MyAds';
import AdDetails from './pages/AdDetails';
import MyFavorites from './pages/MyFavorites';
import SellerProfile from './pages/SellerProfile';
import EditAd from './pages/EditAd';
import UserDashboard from './pages/UserDashboard';
import AccountSuspended from './pages/AccountSuspended';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SafetyTips from './pages/SafetyTips';
import Contact from './pages/Contact';
import SiteMap from './pages/SiteMap';
import Plans from './pages/Plans';
import Maintenance from './pages/Maintenance';
import About from './pages/About';
import GuidePage from './pages/GuidePage';
import LocationLanding from './pages/LocationLanding';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAds from './pages/admin/AdminAds';
import AdminPayments from './pages/admin/AdminPayments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVerification from './pages/admin/AdminVerification';
import AdminMessages from './pages/admin/AdminMessages';
import AdminReports from './pages/admin/AdminReports';
import AdminBanners from './pages/admin/AdminBanners';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminLogs from './pages/admin/AdminLogs';
import AdminSettings from './pages/admin/AdminSettings';
import { Toaster } from 'sonner';
import { MobileNav } from './components/MobileNav';
import { InstallPWA } from './components/InstallPWA';
import { Footer } from './components/Footer';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AdSenseLoader } from './components/AdSenseLoader';
import { useMaintenance, MaintenanceProvider } from './contexts/MaintenanceContext';
import { useAuth } from './contexts/AuthContext';
import { useSiteVisitTracking } from './hooks/useSiteVisitTracking';
import { useProfileIpOnNavigation } from '../lib/profileIpLog';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SEOProvider } from '../components/SEO';

// Ad type moved to src/types/index.ts

function UniversalRouter({ children, initialPath = '/' }: { children: ReactNode; initialPath?: string }) {
  if (typeof window !== 'undefined') {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  const navigator = {
    createHref: (to: { pathname?: string; search?: string; hash?: string } | string) =>
      typeof to === 'string' ? to : `${to.pathname || '/'}${to.search || ''}${to.hash || ''}`,
    push: () => undefined,
    replace: () => undefined,
    go: () => undefined,
    back: () => undefined,
    forward: () => undefined,
  };

  return (
    <Router location={initialPath} navigator={navigator}>
      {children}
    </Router>
  );
}

export function AppContent() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin');
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenance();
  const { user, profile, loading: authLoading } = useAuth();
  useSiteVisitTracking();
  useProfileIpOnNavigation(
    user?.id,
    Boolean(user?.id && profile && profile.is_suspended !== true),
  );

  // Checking logic:
  // 1. If currently loading, show nothing or spinner
  // 2. If maintenance mode is ON
  // 3. AND user is NOT logged in (Admins/Sellers can still access)
  //    Note: ideally we check for 'admin' role, but checking 'user' allows any logged in user (like owner) to see site

  if (!maintenanceLoading && !authLoading && isMaintenanceMode && !user) {
    // Allow access to login page so admins can actually log in!
    // We do this by checking the pathname
    const publicRoutes = ['/login', '/admin', '/contato', '/termos', '/privacidade', '/dicas-seguranca', '/conta-suspensa'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    if (!isPublicRoute) {
      return <Maintenance />;
    }
  }

  return (
    <div className={isAdminRoute ? '' : 'pb-16 md:pb-0'}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/categoria/:categorySlug" element={<Home />} />
        <Route path="/categoria/:categorySlug/:subcategorySlug" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/anunciar" element={<NewAd />} />
        <Route path="/meus-anuncios" element={<MyAds />} />
        <Route path="/anuncio/:id" element={<AdDetails />} />
        <Route path="/anunciante/:userId" element={<SellerProfile />} />
        <Route path="/editar/:id" element={<EditAd />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/favoritos" element={<MyFavorites />} />

        <Route path="/termos" element={<TermsOfUse />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/dicas-seguranca" element={<SafetyTips />} />
        <Route path="/mapa-do-site" element={<SiteMap />} />
        <Route path="/contato" element={<Contact />} />
        <Route path="/conta-suspensa" element={<AccountSuspended />} />
        <Route path="/planos" element={<Plans />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/guias/:guideSlug" element={<GuidePage />} />
        <Route path="/cidade/:stateSlug/:citySlug" element={<LocationLanding />} />
        <Route path="/cidade/:stateSlug/:citySlug/:categorySlug" element={<LocationLanding />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="anuncios" element={<AdminAds />} />
          <Route path="pagamentos" element={<AdminPayments />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="verificacao" element={<AdminVerification />} />
          <Route path="mensagens" element={<AdminMessages />} />
          <Route path="denuncias" element={<AdminReports />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="notificacoes" element={<AdminNotifications />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="configuracoes" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && !isMaintenanceMode && <MobileNav />}
      <InstallPWA />
      <CookieConsentBanner />
      {!isAdminRoute && <AdSenseLoader />}
    </div>
  );
}

type AppProvidersProps = {
  children: ReactNode;
  helmetContext?: object;
  enableHelmet?: boolean;
};

export function AppProviders({ children, helmetContext, enableHelmet = true }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <HelmetProvider context={helmetContext}>
        <SEOProvider enabled={enableHelmet}>
          <AuthProvider>
            <FilterProvider>
              <MaintenanceProvider>
                {children}
              </MaintenanceProvider>
            </FilterProvider>
          </AuthProvider>
        </SEOProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <>
      <AppContent />
      <Toaster richColors position="top-right" />
    </>
  );
}

type AppProps = {
  initialPath?: string;
  enableHelmet?: boolean;
};

export default function App({ initialPath, enableHelmet = true }: AppProps) {
  return (
    <AppProviders enableHelmet={enableHelmet}>
      <UniversalRouter initialPath={initialPath}>
        <AppRoutes />
      </UniversalRouter>
    </AppProviders>
  );
}

