import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import DashboardView from './components/DashboardView';
import BuildingsView from './components/BuildingsView';
import SlotsView from './components/SlotsView';
import BookingView from './components/BookingView';
import AdminView from './components/AdminView';
import NotificationsView from './components/NotificationsView';
import { api, authStorage } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(authStorage.getUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);
  const [toasts, setToasts] = useState([]);
  
  // Shared state between views
  const [selectedBuilding, setSelectedBuilding] = useState('BLD-101');
  const [bookingSlot, setBookingSlot] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const checkHealth = async () => {
    try {
      await api.health.checkGateway();
      setIsHealthy(true);
    } catch {
      setIsHealthy(false);
    }
  };

  const checkNotifications = async () => {
    try {
      const list = await api.notifications.getAll();
      if (Array.isArray(list)) {
        setNotificationCount(list.length);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    checkHealth();
    checkNotifications();
    const interval = setInterval(() => {
      checkHealth();
      checkNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    authStorage.removeToken();
    setUser(null);
    addToast('Signed out successfully.', 'info');
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLoginClick={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        isHealthy={isHealthy}
        notificationCount={notificationCount}
      />

      {/* Main Content View Switcher */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <DashboardView 
            user={user}
            setActiveTab={setActiveTab}
            addToast={addToast}
          />
        )}

        {activeTab === 'buildings' && (
          <BuildingsView 
            user={user}
            setActiveTab={setActiveTab}
            setSelectedBuilding={setSelectedBuilding}
            addToast={addToast}
          />
        )}

        {activeTab === 'slots' && (
          <SlotsView 
            user={user}
            selectedBuilding={selectedBuilding}
            setSelectedBuilding={setSelectedBuilding}
            setActiveTab={setActiveTab}
            setBookingSlot={setBookingSlot}
            addToast={addToast}
          />
        )}

        {activeTab === 'booking' && (
          <BookingView 
            user={user}
            selectedBuilding={selectedBuilding}
            setSelectedBuilding={setSelectedBuilding}
            bookingSlot={bookingSlot}
            setBookingSlot={setBookingSlot}
            addToast={addToast}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView 
            user={user}
            addToast={addToast}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView 
            addToast={addToast}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        addToast={addToast}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
