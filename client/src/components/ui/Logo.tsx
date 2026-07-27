export function Logo() {
  return (
    <div className="type-mono flex min-w-0 items-center gap-2 text-fg text-[1.05rem] sm:text-[1.25rem]">
      <img
        src="/git_knowledgetree-icon.svg"
        alt=""
        className="theme-icon h-8 w-8 shrink-0 sm:h-9 sm:w-9"
      />
      <span className="truncate leading-none font-medium">KnowledgeTree</span>
    </div>
  );
}
