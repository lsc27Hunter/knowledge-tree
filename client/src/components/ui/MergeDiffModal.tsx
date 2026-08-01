import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  applyMergeDeckSelection,
  previewMergeDeckCsv,
  type DeckMergeChange,
} from "../../api";
import { Button } from "./Button";
import {
  ModalBody,
  ModalFooter,
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  type ModalState,
} from "./Modal";
import { focusRing, interactive } from "../../lib/interaction";

interface MergeDiffModalProps {
  state: ModalState;
  deckId: number;
  deckName?: string;
  file: File | null;
  onMerged?: () => void;
  onDismiss: () => void;
}

/**
 * Git-style merge review modal: accept/reject individual CSV changes, then apply.
 */
export function MergeDiffModal({
  state,
  deckId,
  deckName,
  file,
  onMerged,
  onDismiss,
}: MergeDiffModalProps) {
  const [changes, setChanges] = useState<DeckMergeChange[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  useEffect(() => {
    if (!state.isOpen || !file) return;

    let cancelled = false;

    async function loadPreview() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await previewMergeDeckCsv({
          path: { deckId },
          body: { file: file! },
        });
        if (cancelled) return;
        if (result.error) throw result.error;

        const next = result.data?.changes ?? [];
        setChanges(next);
        setAccepted(
          new Set(
            next
              .filter((c) => c.kind === "added" || c.kind === "updated")
              .map((c) => c.key),
          ),
        );
      } catch (error) {
        if (cancelled) return;
        const message =
          typeof error === "object" &&
          error !== null &&
          "detail" in error &&
          typeof (error as { detail?: unknown }).detail === "string"
            ? (error as { detail: string }).detail
            : error instanceof Error
              ? error.message
              : "Couldn't preview merge.";
        setErrorMessage(message);
        toast.error("Merge preview failed", { description: message });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [state.isOpen, file, deckId]);

  const actionable = useMemo(
    () => changes.filter((c) => c.kind === "added" || c.kind === "updated"),
    [changes],
  );
  const unchanged = useMemo(
    () => changes.filter((c) => c.kind === "unchanged"),
    [changes],
  );

  const selectedCount = actionable.filter((c) => accepted.has(c.key)).length;

  function toggle(key: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setAccepted(new Set(actionable.map((c) => c.key)));
  }

  function selectNone() {
    setAccepted(new Set());
  }

  async function applySelection() {
    const rows = actionable
      .filter((c) => accepted.has(c.key))
      .map((c) => ({ question: c.question, answer: c.newAnswer }));

    if (rows.length === 0) {
      toast.error("Select at least one change to apply");
      return;
    }

    setIsApplying(true);
    const toastId = toast.loading("Applying merge…");
    try {
      const result = await applyMergeDeckSelection({
        path: { deckId },
        body: { rows },
      });
      if (result.error) throw result.error;

      const stats = result.data?.stats;
      toast.success("Merge Applied", {
        id: toastId,
        description: `${stats?.added ?? 0} added · ${stats?.updated ?? 0} updated`,
      });
      onMerged?.();
      onDismiss();
      state.close();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't apply merge.";
      toast.error("Merge Failed", { id: toastId, description: message });
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <ModalShell state={state} size="xl">
      <ModalHeaderShell>
        <ModalHeaderMain>
          {deckName ? `Review Merge · ${deckName}` : "Review Merge"}
        </ModalHeaderMain>
        <p className="type-caption mt-1 text-primary-light-grey">
          Accept or reject each change before applying — like reviewing a git
          diff. Cards not in the CSV are never deleted.
        </p>
      </ModalHeaderShell>

      <ModalBody className="flex flex-col gap-4">
        {isLoading ? (
          <p className="type-body text-primary-light-grey">Building diff…</p>
        ) : errorMessage ? (
          <p className="type-body text-danger-red">{errorMessage}</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 type-caption sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <StatPill tone="added" label={`${actionable.filter((c) => c.kind === "added").length} Added`} />
                <StatPill tone="updated" label={`${actionable.filter((c) => c.kind === "updated").length} Updated`} />
                <StatPill tone="unchanged" label={`${unchanged.length} Unchanged`} />
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <button
                  type="button"
                  className={`${interactive} ${focusRing} inline-flex min-h-11 items-center rounded-md px-3 py-2 font-semibold text-accent`}
                  onClick={selectAll}
                >
                  Accept All
                </button>
                <button
                  type="button"
                  className={`${interactive} ${focusRing} inline-flex min-h-11 items-center rounded-md px-3 py-2 font-semibold text-primary-light-grey`}
                  onClick={selectNone}
                >
                  Reject All
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {actionable.map((change) => (
                <ChangeRow
                  key={change.key}
                  change={change}
                  accepted={accepted.has(change.key)}
                  onToggle={() => toggle(change.key)}
                />
              ))}
            </div>

            {unchanged.length > 0 ? (
              <div>
                <button
                  type="button"
                  className={`${interactive} ${focusRing} type-caption text-primary-light-grey`}
                  onClick={() => setShowUnchanged((v) => !v)}
                >
                  {showUnchanged ? "Hide" : "Show"} {unchanged.length} Unchanged
                </button>
                {showUnchanged ? (
                  <div className="mt-2 flex flex-col gap-2 opacity-70">
                    {unchanged.map((change) => (
                      <ChangeRow
                        key={change.key}
                        change={change}
                        accepted={false}
                        readOnly
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          text="Cancel"
          width="fit"
          color="primary-grey"
          textColor="fg"
          onClick={() => {
            onDismiss();
            state.close();
          }}
        />
        <Button
          text={
            isApplying
              ? "Applying…"
              : `Apply ${selectedCount} Change${selectedCount === 1 ? "" : "s"}`
          }
          width="fit"
          color="accent"
          textColor="white"
          disabled={isLoading || isApplying || !!errorMessage || selectedCount === 0}
          onClick={() => {
            void applySelection();
          }}
        />
      </ModalFooter>
    </ModalShell>
  );
}

function StatPill({
  tone,
  label,
}: {
  tone: "added" | "updated" | "unchanged";
  label: string;
}) {
  const toneClass = {
    added: "border-success-green/40 bg-success-green/10 text-success-green",
    updated: "border-warning-yellow/40 bg-warning-yellow/10 text-warning-yellow",
    unchanged: "border-border bg-surface-raised text-primary-light-grey",
  }[tone];

  return (
    <span
      className={`rounded-md border px-2 py-0.5 font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}

function ChangeRow({
  change,
  accepted,
  onToggle,
  readOnly = false,
}: {
  change: DeckMergeChange;
  accepted: boolean;
  onToggle?: () => void;
  readOnly?: boolean;
}) {
  const kindLabel =
    change.kind === "added"
      ? "Added"
      : change.kind === "updated"
        ? "Updated"
        : "Unchanged";

  const kindClass =
    change.kind === "added"
      ? "text-success-green"
      : change.kind === "updated"
        ? "text-warning-yellow"
        : "text-primary-light-grey";

  return (
    <div
      className={`rounded-xl border border-border bg-background/60 p-3 transition-opacity ${
        !readOnly && !accepted ? "opacity-45" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {!readOnly ? (
          <label className={`${interactive} -m-2 inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-start justify-center p-2`}>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-accent"
              checked={accepted}
              onChange={onToggle}
              aria-label={`${accepted ? "Reject" : "Accept"} change`}
            />
          </label>
        ) : (
          <span className="mt-1 w-5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`type-caption font-semibold ${kindClass}`}>
              {kindLabel}
            </span>
            <span className="type-body break-words font-medium text-fg [overflow-wrap:anywhere]">
              {change.question}
            </span>
          </div>

          {change.kind === "updated" ? (
            <div className="type-mono mt-2 space-y-1 text-[0.8rem] leading-relaxed">
              <div className="break-words whitespace-pre-wrap rounded-md bg-danger-red/10 px-2 py-1 text-danger-red [overflow-wrap:anywhere]">
                − {change.oldAnswer}
              </div>
              <div className="break-words whitespace-pre-wrap rounded-md bg-success-green/10 px-2 py-1 text-success-green [overflow-wrap:anywhere]">
                + {change.newAnswer}
              </div>
            </div>
          ) : (
            <div className="type-caption mt-1 break-words text-primary-light-grey [overflow-wrap:anywhere]">
              {change.newAnswer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
