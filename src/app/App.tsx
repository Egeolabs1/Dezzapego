import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import { Toaster } from 'sonner';
import NewAd from './pages/NewAd';
import MyAds from './pages/MyAds';
import AdDetails from './pages/AdDetails';
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
import { MobileNav } from './components/MobileNav';
import { InstallPWA } from './components/InstallPWA';

// Ad type moved to src/types/index.ts

import { useMaintenance, MaintenanceProvider } from './contexts/MaintenanceContext';
import Maintenance from './pages/Maintenance';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenance();
  const { user, loading: authLoading } = useAuth();

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
    if (!path.startsWith('/login') && !path.startsWith('/admin')) {
      return <Maintenance />;
    }
  }

  return (
    <div className="pb-16 md:pb-0"> {/* Add padding bottom for mobile nav space */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/anunciar" element={<NewAd />} />
        <Route path="/meus-anuncios" element={<MyAds />} />
        <Route path="/anuncio/:id" element={<AdDetails />} />
        <Route path="/anunciante/:userId" element={<SellerProfile />} />
        <Route path="/editar/:id" element={<EditAd />} />
        <Route path="/dashboard" element={<UserDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="anuncios" element={<AdminAds />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="denuncias" element={<AdminReports />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="notificacoes" element={<AdminNotifications />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="configuracoes" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isMaintenanceMode && <MobileNav />}
      <InstallPWA />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MaintenanceProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </MaintenanceProvider>
    </AuthProvider>
  );
}

