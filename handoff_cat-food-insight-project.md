# Handoff: Resume ATS optimization + "InsightUBC → Cat Nutrition" portfolio project

## Focus for next session
Continue two linked threads: (1) finish ATS-optimizing Grace's resume for a specific SAP internship posting, and (2) plan/build a repurposed version of her CPSC 310 course project as a new portfolio piece to close the resume's biggest keyword gap (cloud/deployment/CI).

## User context
- Grace Chu, applying to **"F26 SAP iXp Intern - Cloud Engineering [Vancouver]"** (SAP co-op posting, Fall 2026 start, 8-month term). Full JD text was pasted into the conversation but not saved as a file anywhere — if needed again, ask the user to re-paste it.
- Resume source file: `/Users/envio/Documents/Job Applications/resume.tex` (LaTeX, pandoc-flavored preamble). Compiles cleanly with `pdflatex` (also has `xelatex`, `lualatex`, and Ghostscript `gs` available on this Mac; **no ImageMagick, no pdftoppm/poppler** — use `gs` + `sips` for any PDF→PNG visual checks).

## ATS keyword analysis vs. the SAP posting (done, not yet acted on)
Estimated match ~40–45%, well below the 80% target. Biggest gap: **zero cloud/infra keywords**, since this is a cloud engineering role.

**Missing / worth fixing directly in resume.tex (proposed, NOT yet applied — user got sidetracked into the project idea before approving):**
1. Add **"Git"** to Technical Skills → Other (near-certainly used it on team projects, currently absent entirely).
2. State **"RESTful API"** explicitly in the InsightUBC bullet (currently just says "Node.js and Express backend").
3. Reframe the JSZip/FS-Extra bullet toward **"automation"** language (asynchronous file extraction → automated data pipeline).

**Missing and NOT fixable without new work:** Cloud (AWS/GCP/Azure), NoSQL, in-memory database, root cause analysis/incident response. User confirmed no existing cloud/NoSQL experience to draw on — hence the new-project plan below.

## New project plan: repurpose InsightUBC → cat nutrition dataset app
- Local source project: `/Users/envio/IdeaProjects/project_team095` — the CPSC 310 team project (Express 5 + TypeScript backend, has a `frontend/` folder, matches the resume's "InsightUBC: Full Stack API Website" bullet). **No `.git` initialized here yet.** A solo/individual checkpoint variant also exists at `/Users/envio/IdeaProjects/c0_gchu37` (no frontend) — team095 is the one to build from.
- **Important constraint discussed and agreed with user**: do not just deploy/publish the course project as-is. CPSC 310 may prohibit publishing solution code even after the term ends (course reuses assignments). Also ties back to an earlier point in the conversation — the user's existing GitHub repos for this project are private school-org repos she can't freely share.
- **Agreed approach**: keep the same query-engine architecture (aggregation, nested aggregation/HAVING, division, multi-table joins) but repoint it at a genuinely different dataset/domain — not just a find-and-replace rename. User chose **cat food / treats / nutrition** as the domain (nice tie-in: this Claude Code session's own working directory is `/Users/envio/Documents/Projects/PurfectPlay_CatPlayApp`, a cat-related app the user is already building — worth checking if there's reusable data or context there).
- Domain mapping already sketched:
  - Aggregation: avg protein % / calorie density by brand
  - Nested aggregation: brands with below-average price-per-oz
  - Division: brands offering every flavor/texture variant across their line
  - Joins: product ↔ ingredient-safety/watchlist table
- **Open, unresolved question**: where does the dataset come from. Three options were on the table when the session ended, no decision made:
  1. Manually compile a CSV from public AAFCO guaranteed-analysis panels / retailer spec pages (safe, slower)
  2. Scrape a retailer/database site (ToS risk — not recommended)
  3. Search for an existing open pet-nutrition dataset (not yet searched)
- **Deployment plan once the dataset/domain work is scoped** (not started):
  1. Verify CPSC 310's academic integrity policy on publishing derived/repurposed course code before doing anything public.
  2. `git init` a personal repo, push to `github.com/bamobam`.
  3. Add a `Dockerfile` for the Express/TS backend.
  4. Deploy to **Render or Railway** (recommended over AWS/GCP — free tier, near-zero infra setup, faster given likely tight application deadline).
  5. Add a GitHub Actions CI workflow running `yarn test` + `yarn build` on push (this alone earns "CI/CD"/"automation" resume keywords even before deploy is live).
  6. Once live, write a new truthful resume bullet (stack, dataset, deployment, CI) and re-run the ATS match against the SAP JD.

## Suggested skills for the next agent
- `research` — to search for an existing open pet food/nutrition dataset before defaulting to manual compilation.
- `resume-ats-optimizer` — to re-score `resume.tex` after the 3 pending text fixes and after the new project bullet is written.
- `resume-bullet-writer` — for drafting the new project's resume bullet once it's built/deployed.
- `resume-tailor` — if further tailoring resume.tex specifically to the SAP posting is wanted beyond keyword insertion.
- `tdd` — if the next agent starts writing new backend code/tests for the repurposed dataset app.

## Not yet done / explicit next actions
1. Decide dataset source (search vs. manual compile) and get user sign-off.
2. Check CPSC 310 policy on repurposing/publishing derived course code.
3. Apply the 3 pending resume.tex text fixes (Git, RESTful API wording, automation reframe) — independent of the project work, can happen immediately.
4. Scaffold the repurposed project, Dockerfile, CI, deploy.
5. Re-score ATS match once resume is updated with the new project.
