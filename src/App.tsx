import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { ChatMode } from './components/ChatMode';
import { GroupMode } from './components/GroupMode';

type Page = 'home' | 'chat' | 'group';

export default function App() {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [page, setPage] = useState<Page>('home');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header
        dark={dark}
        onToggle={() => setDark(d => !d)}
        onHome={() => setPage('home')}
      />
      {page === 'home' && <HomePage onSelect={setPage} />}
      {page === 'chat' && <ChatMode />}
      {page === 'group' && <GroupMode />}
    </div>
  );
}
