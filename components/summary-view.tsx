import { SummaryShape } from '@/lib/types';

const List = ({ items }: { items: string[] }) => {
  if (!items.length) {
    return <p className="text-muted">—</p>;
  }

  return (
    <ul className="space-y-1 pl-4 text-text">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
};

export const SummaryView = ({ summary }: { summary: SummaryShape }) => (
  <div className="space-y-4 animate-in fade-in duration-200">
    <section>
      <h3 className="mb-1 font-medium">Executive summary</h3>
      <p className="text-sm text-text">{summary.executive_summary || 'Esperando señales para resumir…'}</p>
    </section>

    <section>
      <h3 className="mb-1 font-medium">Key points</h3>
      <List items={summary.key_points} />
    </section>

    <section>
      <h3 className="mb-1 font-medium">Decisions</h3>
      <List items={summary.decisions} />
    </section>

    <section>
      <h3 className="mb-1 font-medium">Action items</h3>
      <List items={summary.action_items} />
    </section>

    <section>
      <h3 className="mb-1 font-medium">Open questions</h3>
      <List items={summary.open_questions} />
    </section>
  </div>
);
