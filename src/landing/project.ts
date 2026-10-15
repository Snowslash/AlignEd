import type { ProjectPageData } from "./ProjectPage";

// Everything on the project page that is specific to this project. The layout lives in ProjectPage.
export const project: ProjectPageData = {
  key: "aligned",
  name: "AlignEd",
  tagline: "Teaching evidence, kept together",
  description: "Keeps your teaching plans, feedback and reflections together, then exports them for your portfolio.",
  why: "I made it because my teaching evidence kept ending up split between forms, notes and portfolio uploads.",
  actions: [{ label: "Open AlignEd", href: "./app/" }],
  sourceHref: "https://github.com/Snowslash/AlignEd",
  beforeYouUse: [
    "Don’t enter anything that could identify a patient, and leave learners’ names out unless you really need them.",
    "Your sessions are saved in this browser. If you use the optional Google Forms feedback, Google keeps those answers until you delete them there.",
    "Download a backup before you clear your browser data or switch devices.",
  ],
  shotsNote: "AlignEd as it opens, before any sessions are added.",
  shots: [
    {
      src: "./assets/aligned-home.webp",
      alt: "AlignEd as it opens: a choice between teaching you’ve done and teaching you’re planning, a note that everything is saved in this browser, and no sessions yet.",
      width: 1524,
      height: 1024,
      caption: "The start screen, with a choice to log teaching you’ve done or plan a session, and an empty session library.",
    },
  ],
  capabilities: [
    ["Log teaching you’ve done", "Note the basics straight after, then come back for feedback and reflection when you have time."],
    ["Plan a session", "Write down who it’s for, what they should learn, how you’ll teach and check it, and what evidence you’ll collect."],
    ["Keep it in one place", "Feedback, reflections and evidence notes sit with the session they belong to."],
    ["Export for your portfolio", "Copy or download a summary of one session, and keep a separate backup of everything."],
  ],
  limits: "AlignEd doesn’t check your evidence, grade your teaching or send anything to your training portfolio. The feedback QR codes open your own Google Form, with the session title and date filled in.",
};
