# Belajar Bahasa Arab — portable website project

This project keeps the existing React presentation and makes local image/audio assets build-safe for deployment.

## Run locally
1. Install Node.js (current LTS).
2. Open a terminal in this folder.
3. Run `npm install`
4. Run `npm run dev` and open the local URL shown in the terminal.

## Build for hosting
Run `npm run build`. Upload the contents of the generated `dist` folder to a static website host.

## Offline use
Run `npm run build`, then serve the `dist` folder locally with a static server. For a simple local preview, run `npm run preview` after building. A browser may not reliably open bundled module files directly with `file://`, so use a local server for the offline presentation.
