import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { FilterProvider } from './contexts/FilterContext';
import Home from './pages/Home';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import { Toaster } from 'sonner';
import NewAd from './pages/NewAd';
import MyAds from './pages/MyAds';
import AdDetails from './pages/AdDetails';
import MyFavorites from './pages/MyFavorites'; // NEW
import SellerProfile from './pages/SellerProfile';
import EditAd from './pages/EditAd';
import UserDashboard from './pages/UserDashboard';
import { MobileNav } from './components/MobileNav';
import { InstallPWA } from './components/InstallPWA';
import { Footer } from './components/Footer';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { AdSenseLoader } from './components/AdSenseLoader';
import AccountSuspended from './pages/AccountSuspended';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SafetyTips from './pages/SafetyTips';
import Contact from './pages/Contact';
import SiteMap from './pages/SiteMap';
import Plans from './pages/Plans'; // NEW
import { useMaintenance, MaintenanceProvider } from './contexts/MaintenanceContext';
import Maintenance from './pages/Maintenance';
import { useAuth } from './contexts/AuthContext';
import { useSiteVisitTracking } from './hooks/useSiteVisitTracking';
import { useProfileIpOnNavigation } from '../lib/profileIpLog';

// Ad type moved to src/types/index.ts

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

function AppContent() {
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

  if (maintenanceLoading || authLoading) return null; // Or a global loader

  if (isMaintenanceMode && !user) {
    // Allow access to login page so admins can actually log in!
    // We do this by checking the pathname
    const path = window.location.pathname;
    const publicRoutes = ['/login', '/admin', '/contato', '/termos', '/privacidade', '/dicas-seguranca', '/conta-suspensa'];
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

    if (!isPublicRoute) {
      return <Maintenance />;
    }
  }

  return (
    <div className={isAdminRoute ? '' : 'pb-16 md:pb-0'}>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/anunciar" element={<NewAd />} />
        <Route path="/meus-anuncios" element={<MyAds />} />
        <Route path="/anuncio/:id" element={<AdDetails />} />
        <Route path="/anunciante/:userId" element={<SellerProfile />} />
        <Route path="/editar/:id" element={<EditAd />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/favoritos" element={<MyFavorites />} /> // NEW Route

        <Route path="/termos" element={<TermsOfUse />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/dicas-seguranca" element={<SafetyTips />} />
        <Route path="/mapa-do-site" element={<SiteMap />} />
        <Route path="/contato" element={<Contact />} />
        <Route path="/conta-suspensa" element={<AccountSuspended />} />
        <Route path="/planos" element={<Plans />} />

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

import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <FilterProvider>
            <MaintenanceProvider>
              <BrowserRouter>
                <AppContent />
                <Toaster richColors position="top-right" />
              </BrowserRouter>
            </MaintenanceProvider>
          </FilterProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

