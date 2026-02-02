How to replace the placeholder favicons ✅

1. Locate the attached image (the one you provided in the project chat).
2. Create these assets (recommended sizes):
   - favicon-32x32.png (32x32)
   - favicon-16x16.png (16x16)
   - favicon.ico (contains 16x16, 32x32 and 48x48)
   - (optional) apple-touch-icon.png (180x180)
3. Save the files in both locations if you want: project's root and `client/public/`.
   - `./favicon-32x32.png`, `./favicon-16x16.png`, `./favicon.ico` (root)
   - `./client/public/favicon-32x32.png`, `./client/public/favicon-16x16.png`, `./client/public/favicon.ico` (Vite/React public)

4. Automatic generation (recommended):
   - I added a small generator script in `client/scripts/generate-favicons.js` that uses `jimp` + `png-to-ico` to create the PNGs and `.ico` and copies them to both the repo root and `client/public`.
   - How to run it:
     1. Place the attached image in `client/public/` and name it `favicon.png` (or call it anything and pass its path to the script).
     2. Run:
        ```bash
        cd client
        npm install
        npm run generate-favicons
        ```
     3. The script will generate `favicon-32x32.png`, `favicon-16x16.png`, `favicon.ico` and copy `favicon.png` to both locations.

5. Manual tools you can also use:
   - https://realfavicongenerator.net (web UI, creates a full set of icons and HTML snippet)
   - ImageMagick: `convert source.png -resize 32x32 favicon-32x32.png` then use `icotool` or `convert` to build `.ico`.
   - Favicon generation npm package or online converters.

Notes:
- The HTML files (`index.html` and `client/index.html`) have been updated to reference these files.
- After generating/replacing the real image files, refresh browser cache (hard reload) to see the new favicon.
