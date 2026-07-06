import knowledgeTreeIcon from "../../assets/git_knowledgetree-icon.svg";

export function Logo() {
  return (
    <div
      className={`flex items-center gap-2 text-white font-jetbrains text-lg sm:text-title-small`}
    >
      <img
        src={knowledgeTreeIcon}
        alt="KnowledgeTree"
        className="h-8 w-8 sm:h-10 sm:w-10"
      />
      <h1 className="leading-none">KnowledgeTree</h1>
    </div>
  );
}
