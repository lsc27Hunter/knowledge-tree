import { Dialog } from "@base-ui/react";
import Papa from "papaparse";
import DropZone from "../../assets/drop-zone.svg";
import X from "../../assets/x.svg";
import { useEffect, useState, type ChangeEventHandler, type SubmitEventHandler } from "react";
import { Button } from "./Button";
import UploadIcon from "../../assets/upload-file.svg";
import { uploadDeck } from "../../api";

export default function UploadDeckButton() {
  const [isOpen, setIsOpen] = useState(false);
  function open() {
    setIsOpen(true);
  }
  return (
    <>
      <Button
        text="Upload Deck"
        width="fit"
        color="accent"
        textColor="white"
        onClick={open}
        icon={UploadIcon}
        iconPosition="right"
        iconOnlyOnMobile
      />
      <Modal isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  );
}

interface ModalState {
  isOpen: boolean;
  setIsOpen(open: boolean): void;
}

function Modal({ isOpen, setIsOpen }: ModalState) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-70" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-fit max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 text-white bg-background border border-gray-600 rounded-2xl">
          <ModalContent />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Page = { name: "upload" } | { name: "confirm", file: File, fileText: string };

function ModalContent() {
  const [page, setPage] = useState<Page>({ name: "upload" });
  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      setPage({ name: "confirm", file, fileText: text });
    }
    reader.readAsText(file);
  }
  switch (page.name) {
    case "upload": return <UploadPage onChooseFile={readFile} />;
    case "confirm": return <ConfirmPage file={page.file} fileText={page.fileText} />
  }
}

interface UploadPageProps {
  onChooseFile(file: File): void;
}

function UploadPage({ onChooseFile }: UploadPageProps) {
  const chooseFile: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = e => {
    const files = e.target.files;
    if (files === null) return;
    if (files.length === 0) return;
    const file = files[0];
    onChooseFile(file);
  };
  return (
    <>
      <div className="border-b border-gray-600 p-4">
        <HeaderTop />
      </div>
      <div className="p-8">
        <input className="-z-1 absolute opacity-0" id="file-upload" type="file" onChange={chooseFile} />
        <label className="w-120 max-w-full cursor-pointer py-12 gap-y-6 flex flex-col items-center border border-dashed border-gray-600 rounded-lg" htmlFor="file-upload">
          <img className="h-20" src={DropZone} alt="close" />
          <div className="text-white font-semibold">Drop your Study Guide Here</div>
          <div className="text-primary-light-grey">or click to browse</div>
        </label>
      </div>
    </>
  );
}

interface ConfirmPageProps {
  file: File;
  fileText: string;
}

interface ParsedCard {
  question: string;
  answer: string;
}

function ConfirmPage({ file, fileText }: ConfirmPageProps) {
  const initialDeckName = file.name.replace(/\.csv$/, "");
  const [parsedCards, setParsedCards] = useState<ParsedCard[] | null>(null);
  useEffect(() => {
    Papa.parse(fileText, {
      complete(results) {
        const cards: ParsedCard[] = [];
        for (const row of results.data) {
          if (!Array.isArray(row)) continue;
          if (row.length !== 2) continue;
          const [question, answer] = row;
          cards.push({ question, answer })
        }
        setParsedCards(cards);
        console.log(cards);
      },
    });
  }, [fileText]);
  const onSubmit: SubmitEventHandler<HTMLFormElement> = e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    uploadDeck({ body: {
      deckName: formData.get("deck-name")?.toString() ?? "",
      file,
    } });
  }
  const parsedCountDisplay = parsedCards === null ? "Loading..." : `${parsedCards.length} cards parsed`;
  return (
    <div className="relative w-200 max-w-full">
      <div className="border-b border-gray-600 p-4 flex flex-col">
        <HeaderTop />
        <div className="text-primary-light-grey leading-none">{parsedCountDisplay}</div>
      </div>
      <div className="px-8 pt-4 pb-8 font-inter max-h-100 overflow-y-auto">
        <form className="flex flex-col" onSubmit={onSubmit}>
          <div className="flex">
            <div className="flex flex-col">
              <label className="font-semibold text-primary-light-grey" htmlFor="deck-name">Deck name</label>
              <input className="px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded" id="deck-name" name="deck-name" defaultValue={initialDeckName} />
            </div>
            <div className="flex flex-col ml-3">
              <label className="font-semibold text-primary-light-grey" htmlFor="description">Description (Optional)</label>
              <input className="px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded" id="description" name="description" />
            </div>
          </div>
          <label className="mt-3 font-semibold text-primary-light-grey" htmlFor="due-date">Due Date (Optional)</label>
          <input className="px-3 py-2 w-40 text-white bg-primary-grey border border-primary-light-grey rounded scheme-dark" type="date" id="date" name="date" />
          <button className="cursor-pointer bg-accent px-2 py-2 rounded-lg absolute right-16 bottom-4" type="submit">Create Deck ({parsedCards === null ? "Loading..." : `${parsedCards.length} cards`})</button>
        </form>
        <div className="mt-3 font-semibold text-primary-light-grey">Preview</div>
        <div className="flex flex-col gap-y-4">
          {parsedCards === null ? 
            <div>Loading</div> :
            parsedCards.map((card, i) => (
              <div className="bg-primary-grey border border-primary-light-grey rounded" key={i}>
                <div className="border-b border-primary-light-grey p-4">
                  <span className="text-primary-light-grey">Q</span><span className="ml-2 text-white">{card.question}</span>
                </div>
                <div className="p-4">
                  <div className="text-success-green">A</div>
                  <div className="whitespace-pre-line text-primary-light-grey mt-4">{card.answer}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function HeaderTop() {
  return (
    <div className="flex justify-between items-center">
      <Title />
      <CloseButton />
    </div>
  );
}

function Title() {
  return (
    <Dialog.Title className="font-inter font-bold text-white text-lg">Upload study deck</Dialog.Title>
  );
}

function CloseButton() {
  return (
    <Dialog.Close className="cursor-pointer p-1">
      <img className="h-4" src={X} alt="close" />
    </Dialog.Close>
  );
}
