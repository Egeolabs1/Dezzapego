'use client';

import { type ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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
import PlanCheckout from './pages/PlanCheckout';
import Maintenance from './pages/Maintenance';
import About from './pages/About';
import GuidePage from './pages/GuidePage';
import LocationLanding from './pages/LocationLanding';
import SeoLocationPage from './pages/SeoLocationPage';
import BusinessPage from './pages/BusinessPage';
import BusinessForm from './pages/BusinessForm';
import BusinessDashboard from './pages/BusinessDashboard';
import RealEstatePage from './pages/RealEstatePage';
import AgentPage from './pages/AgentPage';
import RealEstateDashboard from './pages/RealEstateDashboard';
import VehicleDealerPage from './pages/VehicleDealerPage';
import VehicleDashboard from './pages/VehicleDashboard';
import VehicleForm from './pages/VehicleForm';
import LeadPipeline from './pages/LeadPipeline';
import TeamManagement from './pages/TeamManagement';
import CollectionManagement from './pages/CollectionManagement';
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
import { GlobalAnnouncementProvider } from './contexts/GlobalAnnouncementContext';
import { GlobalAnnouncementBanner } from './components/GlobalAnnouncementBanner';
import { useAuth } from './contexts/AuthContext';
import { useSiteVisitTracking } from './hooks/useSiteVisitTracking';
import { useProfileIpOnNavigation } from '../lib/profileIpLog';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SEOProvider } from '../components/SEO';

function MatchRoute({ pathname, initialPath }: { pathname: string; initialPath?: string }) {
  // Normalize: use the actual browser pathname, or the initialPath for SSR
  const path = pathname || initialPath || '/';

  // Static pages
  if (path === '/') return <Home />;
  if (path === '/login') return <Login />;
  if (path === '/redefinir-senha') return <ResetPassword />;
  if (path === '/register') return <Register />;
  if (path === '/anunciar') return <NewAd />;
  if (path === '/meus-anuncios') return <MyAds />;
  if (path === '/dashboard') return <UserDashboard />;
  if (path === '/favoritos') return <MyFavorites />;
  if (path === '/termos') return <TermsOfUse />;
  if (path === '/privacidade') return <PrivacyPolicy />;
  if (path === '/dicas-seguranca') return <SafetyTips />;
  if (path === '/contato') return <Contact />;
  if (path === '/mapa-do-site') return <SiteMap />;
  if (path === '/conta-suspensa') return <AccountSuspended />;
  if (path === '/planos') return <Plans />;
  if (path === '/checkout/plano') return <PlanCheckout />;
  if (path === '/sobre') return <About />;

  // Business routes
  if (path === '/business') return <BusinessDashboard />;
  if (path === '/business/nova') return <BusinessForm />;
  if (path === '/business/editar') return <BusinessForm />;
  if (path === '/business/imobiliaria') return <RealEstateDashboard />;
  if (path === '/business/veiculos') return <VehicleDashboard />;
  if (path === '/business/veiculos/novo') return <VehicleForm />;
  if (path === '/business/veiculos/editar') return <VehicleForm />;
  if (path === '/business/leads') return <LeadPipeline />;
  if (path === '/business/equipe') return <TeamManagement />;
  if (path === '/business/colecoes') return <CollectionManagement />;

  // Pattern-matched routes
  if (path.match(/^\/anuncio\/[^/]+$/)) return <AdDetails />;
  if (path.match(/^\/anunciante\/[^/]+$/)) return <SellerProfile />;
  if (path.match(/^\/editar\/[^/]+$/) || path.match(/^\/editar-anuncio\/[^/]+$/)) return <EditAd />;
  if (path.match(/^\/categoria\/[^/]+(?:\/[^/]+)?$/)) return <Home />;
  if (path.match(/^\/guias\/[^/]+$/)) return <GuidePage />;
  if (path.match(/^\/cidade\/[^/]+\/[^/]+(?:\/[^/]+)?$/)) return <LocationLanding />;
  if (path.match(/^\/empresa\/[^/]+$/)) return <BusinessPage />;
  if (path.match(/^\/imobiliaria\/[^/]+$/)) return <RealEstatePage />;
  if (path.match(/^\/corretor\/[^/]+$/)) return <AgentPage />;
  if (path.match(/^\/loja\/[^/]+$/)) return <VehicleDealerPage />;

  // Admin routes
  if (path === '/admin' || path === '/admin/') {
    return <AdminLayout><AdminDashboard /></AdminLayout>;
  }
  if (path === '/admin/anuncios') {
    return <AdminLayout><AdminAds /></AdminLayout>;
  }
  if (path === '/admin/pagamentos') {
    return <AdminLayout><AdminPayments /></AdminLayout>;
  }
  if (path === '/admin/usuarios') {
    return <AdminLayout><AdminUsers /></AdminLayout>;
  }
  if (path === '/admin/verificacao') {
    return <AdminLayout><AdminVerification /></AdminLayout>;
  }
  if (path === '/admin/mensagens') {
    return <AdminLayout><AdminMessages /></AdminLayout>;
  }
  if (path === '/admin/denuncias') {
    return <AdminLayout><AdminReports /></AdminLayout>;
  }
  if (path === '/admin/banners') {
    return <AdminLayout><AdminBanners /></AdminLayout>;
  }
  if (path === '/admin/notificacoes') {
    return <AdminLayout><AdminNotifications /></AdminLayout>;
  }
  if (path === '/admin/logs') {
    return <AdminLayout><AdminLogs /></AdminLayout>;
  }
  if (path === '/admin/configuracoes') {
    return <AdminLayout><AdminSettings /></AdminLayout>;
  }

  // SEO location pages: /{uf}/{city}/{category}/{brand}/{model}
  const locationMatch = path.match(/^\/([a-z]{2})(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (locationMatch) {
    const seoPath = [locationMatch[1], locationMatch[2], locationMatch[3], locationMatch[4], locationMatch[5]].filter(Boolean).join('/');
    return <SeoLocationPage path={seoPath} />;
  }

  // Unknown route — redirect to home
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
  return <Home />;
}

export function AppContent({ initialPath }: { initialPath?: string }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenance();
  const { user, profile, loading: authLoading } = useAuth();
  useSiteVisitTracking();
  useProfileIpOnNavigation(
    user?.id,
    Boolean(user?.id && profile && profile.is_suspended !== true),
  );

  const isAdmin = profile?.is_admin === true || profile?.role === 'admin';

  if (!maintenanceLoading && !authLoading && isMaintenanceMode && !isAdmin && pathname !== '/login') {
    return <Maintenance />;
  }

  const matchedContent = useMemo(
    () => <MatchRoute pathname={pathname} initialPath={initialPath} />,
    [pathname, initialPath],
  );

  return (
    <div className={`${isAdminRoute ? '' : 'pb-16 md:pb-0'} overflow-x-hidden`}>
      <GlobalAnnouncementBanner />
      {matchedContent}
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
              <GlobalAnnouncementProvider>
                {children}
              </GlobalAnnouncementProvider>
            </MaintenanceProvider>
            </FilterProvider>
          </AuthProvider>
        </SEOProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export function AppRoutes({ initialPath }: { initialPath?: string }) {
  return (
    <>
      <AppContent initialPath={initialPath} />
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
      <AppRoutes initialPath={initialPath} />
    </AppProviders>
  );
}
