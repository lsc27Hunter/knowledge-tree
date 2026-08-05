import { useEffect, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { ModalBody, ModalFooter, ModalHeaderMain, ModalHeaderShell, type ModalState } from "./Modal";
import { focusRing, hoverSurface, interactive } from "../../lib/interaction";
import { getDeck, getDecks, getDiscoverableDeck, type DeckGetResponse, type DeckListResponse } from "../../api";
import { MergeDiffModalContent } from "./MergeDiffModal";
import Papa from "papaparse";
import { fieldInputClass, FieldLabel, fieldLabelClass } from "./DeckFormFields";
import { Select } from "@base-ui/react";

interface Deck {
  id: number;
  name: string;
}

interface Card {
  question: string;
  answer: string;
}

interface DiscoveryMergeModalContentProps {
  deckId: number;
  deckName: string;
  modalState: ModalState;
}

export default function DiscoveryMergeModalContent({ deckId, deckName: srcDeckName, modalState }: DiscoveryMergeModalContentProps) {
  const [srcDeck, setSrcDeck] = useState<null | DeckGetResponse>(null);
  useEffect(() => {
    getDiscoverableDeck({ path: { deckId }}).then(res => {
      if (res.error) {
        throw res.error;
      }
      setSrcDeck(res.data);
    })
  }, [deckId]);
  const deckSelectState = useDeckSelectState();
  const destDeck = deckSelectState.selectedDeck;

  return (destDeck ?
    <MergeDiffModalContent
      state={modalState}
      deckId={destDeck.id}
      file={srcDeck ? toCsv(srcDeck.name, srcDeck.cards) : null}
    >
      <DeckSelectForm srcDeckName={srcDeckName} state={deckSelectState} />
    </MergeDiffModalContent> :
    <>
      <ModalHeaderShell>
        <ModalHeaderMain>
          Merge
        </ModalHeaderMain>
      </ModalHeaderShell>
      <ModalBody>
        <DeckSelectForm srcDeckName={srcDeckName} state={deckSelectState} />
      </ModalBody>
      <ModalFooter>
        <Button
          text="Cancel"
          width="fit"
          color="primary-grey"
          textColor="fg"
          onClick={modalState.close}
        />
      </ModalFooter>
    </>
  );
}

interface DeckSelectFormProps {
  srcDeckName: string;
  state: DeckSelectState;
}

function DeckSelectForm({ srcDeckName, state }: DeckSelectFormProps) {
  return (
    <div className="grid grid-rows-[min-content_min-content] sm:grid-cols-[min-content_1fr] items-baseline gap-x-2 sm:gap-y-2">
      <div className={`${fieldLabelClass} sm:justify-self-end`}>Merging</div>
      <div className={`${fieldInputClass} sm:w-fit justify-self-start`}>{srcDeckName}</div>
      <DeckSelectShell state={state}>
        <DeckSelectLabel className="sm:justify-self-end mt-2 sm:mt-0" />
        <DeckSelectButton className="justify-self-start" />
      </DeckSelectShell>
    </div>
  );
}

interface DeckSelectShellProps {
  state: DeckSelectState;
  children: ReactNode;
}

function DeckSelectShell({
  state: {
    decks,
    selectedDeck,
    onSelectDeck,
  },
  children,
}: DeckSelectShellProps) {
  function onChange(value: Deck | null) {
    if (value) {
      onSelectDeck(value);
    }
  }
  return (
    <Select.Root<Deck> value={selectedDeck} onValueChange={onChange} itemToStringLabel={deck => deck.name}>
      {children}
      <Select.Portal>
        <Select.Positioner className="outline-hidden select-none z-10" alignItemWithTrigger={false} sideOffset={8} align="start">
          <Select.Popup className="min-w-[var(--anchor-width)] rounded-lg border border-border bg-background p-1 shadow-[var(--shadow-card)] sm:w-72">
            <Select.List className="relative overflow-y-auto max-h-[var(--available-height)]">
              {decks?.map(deck => (
                <Select.Item
                  key={deck.id}
                  value={deck}
                  className={`${interactive} block rounded-md px-3 py-2 text-left type-body text-fg hover:bg-primary-grey`}
                >
                  <Select.ItemText className="wrap-anywhere">{deck.name}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function DeckSelectLabel({ className = "" }: { className?: string }) {
  return (
    <Select.Label className={className}>
      <FieldLabel>
        Into
      </FieldLabel>
    </Select.Label>
  );
}

function DeckSelectButton({ className = "" }: { className?: string }) {
  return (
    <Select.Trigger className={`${className} ${interactive} ${focusRing} ${hoverSurface} inline-flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-2.5 py-2.5 type-body text-fg sm:w-auto sm:justify-center`}>
      <Select.Value
        className="data-placeholder:text-primary-light-grey"
        placeholder="Select deck"
      />
      <Select.Icon 
        className="ml-2 shrink-0 text-primary-light-grey"
        aria-hidden="true"
      >
        ▾
      </Select.Icon>
    </Select.Trigger>
  );
}

interface DeckSelectState {
  decks: Deck[] | null;
  selectedDeck: DeckGetResponse | null;
  onSelectDeck(deck: Deck): void;
}

function useDeckSelectState(): DeckSelectState {
  const [decks, setDecks] = useState<null | DeckListResponse[]>(null);
  const [selectedDeck, setSelectedDeck] = useState<null | DeckGetResponse>(null);
  useEffect(() => {
    getDecks().then(res => {
      if (res.data) {
        setDecks(res.data);
      }
    });
  }, []);


  function onSelectDeck(deck: Deck) {
    getDeck({ path: { deckId: deck.id }}).then(res => {
      if (res.error) {
        throw res.error;
      }
      setSelectedDeck(res.data);
    });
  }

  return {
    decks,
    selectedDeck,
    onSelectDeck,
  };
}

function toCsv(name: string, cards: Card[]): File {
  const text = Papa.unparse(cards.map(card => [card.question, card.answer]));
  const blob = new Blob([text], { type: "text/csv" });
  return new File([blob], name);
}
