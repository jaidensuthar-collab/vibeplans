interface Props {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: Props) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-2xl mb-2">🌞</p>
      <p className="text-gray-600 dark:text-gray-300 font-medium">{message}</p>
      {hint && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{hint}</p>
      )}
    </div>
  );
}
