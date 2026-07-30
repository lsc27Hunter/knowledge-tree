import type { ReactNode } from "react";
import { focusRing, interactive } from "../../lib/interaction";

export const fieldLabelClass =
  "type-caption mb-1.5 block font-semibold text-primary-light-grey";

export const fieldInputClass =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 type-body text-fg placeholder:text-primary-light-grey/70 transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className={fieldLabelClass} htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function DiscoverableToggle({
  checked,
  onChange,
  id = "discoverable-toggle",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-2 type-caption font-semibold text-primary-light-grey"
    >
      <input
        id={id}
        type="checkbox"
        className="h-5 w-5 accent-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Discoverable Deck
      <span className="hidden font-normal opacity-80 sm:inline">(public in Discover)</span>
    </label>
  );
}

export interface EditableCard {
  id?: number | null;
  question: string;
  answer: string;
}

interface CardEditorListProps {
  cards: EditableCard[];
  onChange: (index: number, field: "question" | "answer", value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  /** If false, keep at least one blank card row */
  allowEmpty?: boolean;
}

/** Editable Q/A list — same look as the discover preview cards. */
export function CardEditorList({
  cards,
  onChange,
  onRemove,
  onAdd,
  allowEmpty = false,
}: CardEditorListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="type-caption font-semibold text-primary-light-grey">
        Cards ({cards.length})
      </div>
      <div className="flex max-h-none flex-col gap-2 pr-0.5 md:max-h-72 md:overflow-y-auto">
        {cards.map((card, i) => (
          <div
            key={card.id ?? `new-${i}`}
            className="rounded-lg border border-border bg-background/50"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <span className="w-4 shrink-0 text-primary-light-grey">Q</span>
              <input
                className="min-w-0 flex-1 bg-transparent type-body text-fg outline-none placeholder:text-primary-light-grey/70"
                placeholder="Question"
                value={card.question}
                onChange={(e) => onChange(i, "question", e.target.value)}
              />
              {(allowEmpty || cards.length > 1) && (
                <button
                  type="button"
                  aria-label="Remove Card"
                  className={`${interactive} ${focusRing} inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md type-caption text-primary-light-grey hover:text-danger-red`}
                  onClick={() => onRemove(i)}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5">
              <span className="w-4 shrink-0 pt-0.5 text-success-green">A</span>
              <textarea
                className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent type-body text-fg outline-none placeholder:text-primary-light-grey/70"
                placeholder="Answer"
                rows={1}
                value={card.answer}
                onChange={(e) => onChange(i, "answer", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${interactive} ${focusRing} inline-flex min-h-11 items-center self-start rounded-md px-2 type-caption font-semibold text-accent`}
        onClick={onAdd}
      >
        + Add Card
      </button>
    </div>
  );
}
