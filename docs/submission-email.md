# Reply email (draft)

For task 8.7. A draft for the engineer to edit and send; replace the bracketed parts.

---

**Subject:** Re: [original subject] — Salary Management submission

Hi [name],

Thank you for the exercise. My submission is ready:

- **Repository:** https://github.com/rakeshjoshi9999/salary-management
- **Live app:** https://salary-management-ivory-psi.vercel.app
- **Demo video (3 minutes):** [video link]

One thing to know before you click: the API runs on Render's free tier, so if nobody has used it for
about 15 minutes, the first request can take up to a minute while the server starts. The app shows
"Waking the server…" during that time, and everything is fast once it's up.

The README is the best place to start. It maps each requirement to how it is met and where the evidence
is. If you'd like to go deeper:

- `docs/DECISIONS.md`: 53 decisions with the options I rejected and why, starting with a reading guide.
- `docs/AI_USAGE.md`: how I used AI, where it was wrong, and how I caught it.
- `docs/WORKFLOW.md`: how each feature went from requirement to production, and a guide to the commit
  history.

The app was built test-first in small slices, with every slice deployed to a stage environment before
production. There are about 460 automated tests, including end-to-end tests that run in CI.

I'd be glad to walk through any part of it.

Best regards,
[your name]
