import { DarkModeToggle } from './DarkModeToggle';

interface Props {
  dark: boolean;
  onToggle: () => void;
  onHome: () => void;
}

export function Header({ dark, onToggle, onHome }: Props) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
      <button
        onClick={onHome}
        className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight hover:opacity-80 transition-opacity"
      >
        VibePlan
      </button>
      <DarkModeToggle dark={dark} onToggle={onToggle} />
    </header>
  );
}
