import DownloadIcon from "../../assets/download-file.svg";
import { IconButton } from "./IconButton";
import { getDeck, getDiscoverableDeck } from "../../api";
import Papa from "papaparse";
import { Button } from "./Button";

interface ExportDeckButtonProps {
  deckId: number;
}

export function ExportDeckButton({ deckId }: ExportDeckButtonProps) {
  async function onClick() {
    const res = await getDeck({ path: { deckId } });
    if (res.data) {
      exportCsv(res.data.name, res.data.cards);
    }
  }

  return (
    <IconButton
      icon={DownloadIcon}
      ariaLabel="Export Deck as CSV"
      onClick={onClick}
      small
      smallIcon
    />
  );
}

export function ExportDiscoverableDeckButton({ deckId }: ExportDeckButtonProps) {
  async function onClick() {
    const res = await getDiscoverableDeck({ path: { deckId } });
    if (res.data) {
      exportCsv(res.data.name, res.data.cards);
    }
  }

  return (
    <Button
      text="Export"
      color="primary-grey"
      textColor="fg"
      icon={DownloadIcon}
      iconOnlyOnMobile
      onClick={onClick}
      themeIcon
    />
  );
}

function exportCsv(name: string, cards: Card[]) {
  const text = Papa.unparse(cards.map(card => [card.question, card.answer]));
  const blob = new Blob([text], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface Card {
  question: string;
  answer: string;
}