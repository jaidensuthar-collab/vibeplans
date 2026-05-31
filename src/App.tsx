import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { ChatMode } from './components/ChatMode';
import { GroupMode } from './components/GroupMode';
import { LocationBanner } from './components/LocationBanner';
import { useGeolocation } from './hooks/useGeolocation';

type Page = 'home' | 'chat' | 'group';

export default function App() {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [page, setPage] = useState<Page>('home');
  const { geo, request: requestLocation } = useGeolocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Auto-request location as soon as the user enters Chat or Group mode.
  // If they already granted it → silently succeeds. If not → browser shows its
  // permission dialog so the user understands why we're asking.
  useEffect(() => {
    if (page === 'chat' || page === 'group') {
      requestLocation();
    }
  }, [page, requestLocation]);

  const userLocation =
    geo.status === 'granted' ? { lat: geo.lat, lon: geo.lon } : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        dark={dark}
        onToggle={() => setDark(d => !d)}
        onHome={() => setPage('home')}
      />
      {/* Show location permission banner on chat/group pages when not yet decided */}
      {(page === 'chat' || page === 'group') && (
        <LocationBanner geo={geo} onAllow={requestLocation} />
      )}
      {page === 'home' && <HomePage onSelect={setPage} />}
      {page === 'chat' && <ChatMode userLocation={userLocation} />}
      {page === 'group' && <GroupMode userLocation={userLocation} />}
    </div>
  );
}
