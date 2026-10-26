# Demo video script (about 3 minutes)

For task 8.5. Record against **production**: https://salary-management-ivory-psi.vercel.app

**Before recording**
- Open the app a few minutes early so the server is warm (the first request can take up to a minute).
  Open `/health` and wait for "API reachable, database connected".
- A desktop browser window at about 1280 × 800, zoom 100%, no other tabs or bookmarks bar.
- Have the repository open in a second tab: https://github.com/rakeshjoshi9999/salary-management
- Decide which employee you will edit. A good one: search `00042@` and note the name.

| Time | Show | Say |
|---|---|---|
| 0:00–0:15 | The Insights page for India | "This is a salary management app for an HR manager with about ten thousand employees in five countries. It replaces spreadsheets with one place to answer: how does the organization pay people?" |
| 0:15–0:45 | Point at the five cards, the bars, then the doughnut and legend. Switch the country to Germany; point at the URL | "For each country, in its own currency: headcount, median, average, minimum and maximum. Average salary by job title, and headcount by department. Every number is computed in the database, and the median is exact. Changing country changes the link, so this view can be bookmarked." |
| 0:45–1:25 | Click Catalog. Type the name you chose; click the row; Edit; change the salary; Save. Point at "Saved" and the updated row | "The main task: find someone and update their salary. Search is server-side across ten thousand people. Open them, edit, save. That is five interactions, comfortably under the thirty-second target." |
| 1:25–1:50 | Pick a country and a department filter, sort by salary, go to page 2; point at the URL. Paste a link with `?country=XX` and show the toast | "Filters, sorting and paging all live in the URL, so a view can be shared. A broken link doesn't fail: the bad part is dropped and the app says so." |
| 1:50–2:05 | Open another employee, click Edit, change the email to an existing colleague's, Save, show the field error. Cancel | "Validation mirrors the API: required fields, a valid email, salary above zero, a hire date not in the future. If two people edit the same record, the second save is rejected rather than silently overwriting, and their edits are kept." |
| 2:05–2:20 | Resize the window narrow (or switch to a phone in devtools): cards, the Filters button, the menu | "It works on a phone too: cards instead of rows, filters in a panel." |
| 2:20–2:50 | Switch to the GitHub tab: the README, then `docs/DECISIONS.md` (reading guide), then the commit history | "How it was built: requirements first, then a design, then small slices, each test-first. Fifty-three decisions are written down with the options I rejected. I used AI throughout, but it had to ask before building, and an independent AI reviewer checked every step. The AI usage log records where it was wrong and how that was caught." |
| 2:50–3:00 | Back to the app | "The API sleeps on the free tier, so the first visit can take a minute, and the app tells you that while it waits. Thanks for watching." |

**After recording:** upload the video (unlisted is fine), and send the link so it can be added to the
README and the reply email.
