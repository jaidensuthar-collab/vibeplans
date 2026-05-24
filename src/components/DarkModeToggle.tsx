interface Props {
  dark: boolean;
  onToggle: () => void;
}

export function DarkModeToggle({ dark, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="rounded-full p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
