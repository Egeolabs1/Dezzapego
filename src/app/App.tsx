'use client';

import { BrowserRouter, Routes, Route, Navigate, useLocation, Router } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { FilterProvider } from './contexts/FilterContext';
import Home from './pages/Home';
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

// Ad type moved to src/types/index.ts

const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Register = lazy(() => import('./pages/Register'));
const NewAd = lazy(() => import('./pages/NewAd'));
const MyAds = lazy(() => import('./pages/MyAds'));
const AdDetails = lazy(() => import('./pages/AdDetails'));
const MyFavorites = lazy(() => import('./pages/MyFavorites'));
const SellerProfile = lazy(() => import('./pages/SellerProfile'));
const EditAd = lazy(() => import('./pages/EditAd'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AccountSuspended = lazy(() => import('./pages/AccountSuspended'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const SafetyTips = lazy(() => import('./pages/SafetyTips'));
const Contact = lazy(() => import('./pages/Contact'));
const SiteMap = lazy(() => import('./pages/SiteMap'));
const Plans = lazy(() => import('./pages/Plans'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const About = lazy(() => import('./pages/About'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const LocationLanding = lazy(() => import('./pages/LocationLanding'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminAds = lazy(() => import('./pages/admin/AdminAds'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminVerification = lazy(() => import('./pages/admin/AdminVerification'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Carregando...
    </div>
  );
}

function UniversalRouter({ children }: { children: ReactNode }) {
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
    <Router location="/" navigator={navigator}>
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
      return (
        <Suspense fallback={<RouteFallback />}>
          <Maintenance />
        </Suspense>
      );
    }
  }

  return (
    <div className={isAdminRoute ? '' : 'pb-16 md:pb-0'}>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
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
};

export function AppProviders({ children, helmetContext }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <HelmetProvider context={helmetContext}>
        <AuthProvider>
          <FilterProvider>
            <MaintenanceProvider>
              {children}
            </MaintenanceProvider>
          </FilterProvider>
        </AuthProvider>
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

export default function App() {
  return (
    <AppProviders>
      <UniversalRouter>
        <AppRoutes />
      </UniversalRouter>
    </AppProviders>
  );
}

