interface Props {
  title: string;
  description: string;
  emoji: string;
  onClick: () => void;
}

export function ModeCard({ title, description, emoji, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
        {title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </button>
  );
}
