import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import RoundsSection from './components/RoundsSection';
import HighlightsSection from './components/HighlightsSection';
import RegistrationSection from './components/RegistrationSection';
import CoordinatorsSection from './components/CoordinatorsSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import RegistrationSuccessPage from './components/RegistrationSuccessPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [registrationData, setRegistrationData] = useState(() => {
    try {
      const stored = sessionStorage.getItem('codestorm_registration');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      try {
        const stored = sessionStorage.getItem('codestorm_registration');
        if (stored) setRegistrationData(JSON.parse(stored));
      } catch {
        // Ignore session parse error
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleNavigateToHome = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegistrationSuccess = (data) => {
    setRegistrationData(data);
    try {
      sessionStorage.setItem('codestorm_registration', JSON.stringify(data));
    } catch {
      // Ignore storage error
    }
    window.history.pushState(data, '', '/registration-success');
    setCurrentPath('/registration-success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated Route: /registration-success
  if (currentPath === '/registration-success') {
    return (
      <RegistrationSuccessPage
        registrationData={registrationData}
        onBack={handleNavigateToHome}
      />
    );
  }

  // Default Route: CODESTORM Main Landing Page
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <AboutSection />
        <RoundsSection />
        <HighlightsSection />
        <RegistrationSection onRegistrationSuccess={handleRegistrationSuccess} />
        <CoordinatorsSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
