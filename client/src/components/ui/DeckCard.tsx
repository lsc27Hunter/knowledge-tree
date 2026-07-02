interface DeckCardProps {
  text: string;
}

export function DeckCard({ text }: DeckCardProps) {
  return (
    <div className="min-h-44 w-full rounded-2xl bg-primary-grey p-4 text-white sm:min-h-56 sm:p-5">
      {text}
    </div>
  );
}
