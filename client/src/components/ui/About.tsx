export function About({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`font-inter ${centered ? "mx-auto text-center" : ""}`}>
      <h1 className="type-display text-fg">
        Study Smarter.
        <span className="mt-1 block text-accent">Merge Faster.</span>
      </h1>
      <p
        className={`type-body-lg mt-5 text-primary-light-grey sm:mt-6 ${
          centered ? "mx-auto max-w-2xl" : "max-w-3xl"
        }`}
      >
        Upload a study guide, let our algorithms schedule your review sessions -
        then seamlessly merge updated guides from classmates without ever losing
        your personal learning progress.
      </p>
    </div>
  );
}
