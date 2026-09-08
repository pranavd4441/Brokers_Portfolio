import { Camera, Send, MessagesSquare } from 'lucide-react';
import { COPY, Language } from './content';

const icons = [Camera, Send, MessagesSquare];

export function CreationWalkthrough({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  return (
    <section id="how" className="landing-band landing-workflow" aria-labelledby="workflow-title">
      <div className="landing-wrap">
        <p className="landing-eyebrow">{t.howEyebrow}</p>
        <h2 id="workflow-title">{t.howTitle}</h2>
        <div className="landing-steps">{t.steps.map(([title, description], i) => {
          const Icon = icons[i];
          return <article key={title}><div className="landing-step-heading"><Icon size={24} /><span>0{i + 1}</span></div><h3>{title}</h3><p>{description}</p></article>;
        })}</div>
      </div>
    </section>
  );
}
