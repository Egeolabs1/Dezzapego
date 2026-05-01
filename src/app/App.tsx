import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAds from './pages/admin/AdminAds';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReports from './pages/admin/AdminReports';
import AdminBanners from './pages/admin/AdminBanners';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminLogs from './pages/admin/AdminLogs';
import AdminPayments from './pages/admin/AdminPayments';
import { MobileNav } from './components/MobileNav';
import { InstallPWA } from './components/InstallPWA';
import { Footer } from './components/Footer';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import SafetyTips from './pages/SafetyTips';
import Contact from './pages/Contact';
import SiteMap from './pages/SiteMap';
import AdminMessages from './pages/admin/AdminMessages';
import Plans from './pages/Plans'; // NEW

// Ad type moved to src/types/index.ts

import { useMaintenance, MaintenanceProvider } from './contexts/MaintenanceContext';
import Maintenance from './pages/Maintenance';
import { useAuth } from './contexts/AuthContext';
import { useSiteVisitTracking } from './hooks/useSiteVisitTracking';

function AppContent() {
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenance();
  const { user, loading: authLoading } = useAuth();
  useSiteVisitTracking();

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
    const publicRoutes = ['/login', '/admin', '/contato', '/termos', '/privacidade', '/dicas-seguranca'];
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

    if (!isPublicRoute) {
      return <Maintenance />;
    }
  }

  return (
    <div className="pb-16 md:pb-0"> {/* Add padding bottom for mobile nav space */}
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
        <Route path="/planos" element={<Plans />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="anuncios" element={<AdminAds />} />
          <Route path="pagamentos" element={<AdminPayments />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="mensagens" element={<AdminMessages />} />
          <Route path="denuncias" element={<AdminReports />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="notificacoes" element={<AdminNotifications />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="configuracoes" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
      {!isMaintenanceMode && <MobileNav />}
      <InstallPWA />
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

