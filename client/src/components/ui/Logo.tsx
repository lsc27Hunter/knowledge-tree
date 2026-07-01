import knowledgeTreeIcon from "../../assets/git_knowledgetree-icon.svg";

export function Logo() {
  return (
    <div
      className={`flex items-center gap-2 text-white font-jetbrains text-title`}
    >
      <img src={knowledgeTreeIcon} alt="KnowledgeTree" className="w-10 h-10" />
      <h1>KnowledgeTree</h1>
    </div>
  );
}
