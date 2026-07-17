import { ArrowLeft, ArrowUpRight, Code } from 'lucide-react';
import {
  EstateBoundary,
  EstateEvidenceFrame,
  EstatePageTitle,
  EstateSectionTitle,
  EstateShell,
  PublicEstateHeader,
  useEstateTheme,
} from '@sangeev/estate-ui';

const capabilities = [
  ['Capture taught sessions', 'Log the factual minimum after teaching, then return to feedback, reflection and evidence when there is time.'],
  ['Plan before the date', 'Record the audience, objectives, activity, assessment and evidence you intend to collect before a session.'],
  ['Keep the trail together', 'Store feedback, reflection and evidence notes beside the teaching session instead of scattering them across files.'],
  ['Export a usable pack', 'Copy or download a Markdown summary for one session and keep a separate JSON backup of the browser library.'],
];

export default function LandingPage() {
  const { theme, toggleTheme } = useEstateTheme();

  return (
    <>
      <PublicEstateHeader current="aligned" theme={theme} onToggleTheme={toggleTheme} />
      <EstateShell variant="landing">
        <main>
          <section className="hero" aria-labelledby="page-title">
            <div className="hero-copy">
              <a className="back-link" href="https://sangeev.me/#projects"><ArrowLeft size={15} aria-hidden="true" /> Public tools</a>
              <EstatePageTitle id="page-title" variant="landing">AlignEd</EstatePageTitle>
              <p className="project-summary">Keep teaching plans, feedback and reflection in one browser.</p>
              <p className="lede">
                I made it because teaching evidence kept ending up split between forms, notes and portfolio uploads. AlignEd keeps the working trail together, then exports a plain evidence pack when it is ready.
              </p>
              <div className="hero-actions">
                <a className="estate-primary-action" href="./app/">Open AlignEd <ArrowUpRight size={17} aria-hidden="true" /></a>
                <a className="estate-primary-action" href="https://github.com/Snowslash/AlignEd"><Code size={17} aria-hidden="true" /> Source on GitHub</a>
              </div>
            </div>

            <EstateBoundary className="hero-boundary" label="Privacy and local storage boundary">
              <p><strong>Do not enter patient-identifiable information.</strong> Avoid learner-identifiable information unless it is necessary.</p>
              <p>Sessions are stored only in this browser. There is no login, backend, cloud sync, analytics, messaging or AI.</p>
              <p>Download a JSON backup before clearing browser data or moving devices.</p>
            </EstateBoundary>
          </section>

          <section className="evidence" aria-labelledby="evidence-title">
            <div className="section-heading compact">
              <EstateSectionTitle id="evidence-title">Keep the teaching trail together.</EstateSectionTitle>
            </div>
            <figure className="screenshot">
              <EstateEvidenceFrame as="div" className="image-frame">
                <img src="./assets/aligned-home.webp" alt="AlignEd showing two routes for completed or planned teaching, a browser-only storage notice and an empty teaching-session library." width="1524" height="1024" />
              </EstateEvidenceFrame>
            </figure>
          </section>

          <section className="capabilities" aria-labelledby="capabilities-title">
            <div className="section-heading compact">
              <EstateSectionTitle id="capabilities-title">One record for the useful parts.</EstateSectionTitle>
            </div>
            <div className="capability-grid">
              {capabilities.map(([title, description]) => (
                <article key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="status-band" aria-labelledby="status-title">
            <div>
              <EstateSectionTitle id="status-title">Personal tool. Browser-local by design.</EstateSectionTitle>
              <p>AlignEd does not verify evidence, assess teaching quality, collect phone feedback by QR code or submit anything to a training portfolio.</p>
            </div>
            <a href="https://github.com/Snowslash/AlignEd">Read the project notes <ArrowUpRight size={17} aria-hidden="true" /></a>
          </section>
        </main>

        <footer>
          <p>AlignEd · Maintained by Sangeev</p>
          <a href="https://sangeev.me">Back to sangeev.me</a>
        </footer>
      </EstateShell>
    </>
  );
}
