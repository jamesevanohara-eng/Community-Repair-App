# FixFishers — GitHub Pages prototype

A responsive front-end prototype for a community issue reporting concept.

## Files
- `index.html` — page structure and form
- `style.css` — responsive layout and visual styling
- `script.js` — sample reports, browser-local submissions, and filters

## Run locally
Open `index.html` in a browser. No build step is required.

## Publish with GitHub Pages
1. Create or open a GitHub repository for this project.
2. Upload `index.html`, `style.css`, and `script.js` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose your default branch (usually `main`) and the `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish the site.

## Important prototype limitation
Submitted reports are stored in `localStorage` in the visitor's browser. They are not sent to a server, shared with other visitors, or delivered to the City of Fishers. The report cards are demonstration content and should not be represented as verified city records.
