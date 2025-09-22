# nonbonk app developer notes

## Install dependencies
- Ensure `pnpm` is available locally (https://pnpm.io/installation)
- Run `pnpm install` after cloning or whenever dependencies change

## Local development
- Launch the dev server with `pnpm dev`
- Vite serves at `http://localhost:5173` by default; pass `--host` if you need LAN access

## Build & preview
- Create a production build with `pnpm build`
- Preview the build locally with `pnpm preview`

## Deploy via GitHub Actions
- Commit your changes (`git commit -am "..."` or `git add` followed by `git commit`)
- Push to the `main` branch: `git push origin main`
- GitHub Actions in `martzyx/nonbonk` builds and deploys on push; monitor the Actions tab for status
