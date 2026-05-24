import { ModeCard } from './ModeCard';

type Mode = 'chat' | 'group';

interface Props {
  onSelect: (mode: Mode) => void;
}

export function HomePage({ onSelect }: Props) {
  return (
    <main className="max-w-md mx-auto px-4 py-10 space-y-8">
      <section className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">VibePlan</h1>
        <p className="text-lg text-indigo-600 dark:text-indigo-400 font-medium">
          Find the vibe. Make the plan.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Get ranked summer hangout ideas for you or your friend group.
        </p>
      </section>

      <div className="space-y-4">
        <ModeCard
          emoji="💬"
          title="Chat Mode"
          description="Describe what you're feeling and get ranked ideas fast. Great for quick inspiration when you're bored."
          onClick={() => onSelect('chat')}
        />
        <ModeCard
          emoji="👥"
          title="Group Mode"
          description="Create a group code, gather everyone's constraints, and vote on the best plan together."
          onClick={() => onSelect('group')}
        />
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600">
        No login. No drama. Just plans.
      </p>
    </main>
  );
}
