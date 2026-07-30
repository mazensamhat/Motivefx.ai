import { ASK_BETTER_QUESTIONS } from "@/lib/marketing-copy";

export function AskQuestionsSection() {
  return (
    <section className="section-pad" id="ask-better">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Curiosity</p>
          <h2 className="section-title">Ask Better Questions.</h2>
          <p className="section-sub">
            Intelligence starts with what you should be asking — before you open another feed.
          </p>
        </div>

        <ul className="ask-questions-list">
          {ASK_BETTER_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
