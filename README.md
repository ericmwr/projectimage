# Project Image

A small personal tool for Ideal Painting that turns a finished-project photo
into a short video with animated callouts naming the finish on each surface,
followed by a closing card with the logo and phone number.

There are two ways to use it:

- **Callout Studio**, a page in your browser (the easy way, below).
- **Commands**, for the example job (see "Commands" near the end).

Everything runs only on your PC. Your photos and videos are never uploaded.
The only thing the tool fetches from the internet is the fonts, from Google Fonts.

## Callout Studio

### Start it

Double-click **`Start Callout Studio.cmd`** in this folder.

A black window opens, and after a few seconds the page opens in your browser at
<http://localhost:4710>. The very first time, it installs what it needs first,
which takes a few minutes.

**Put a shortcut on your desktop:** in File Explorer, right-click
`Start Callout Studio.cmd`, choose **Show more options**, then
**Send to → Desktop (create shortcut)**. Double-click the shortcut from now on.

### Stop it

Close the black window. That's all. The page stops working until you start it
again. Your work is already saved.

### Make a video

1. Click **+ New job** and pick a photo from anywhere on your PC (JPG or PNG).
   The page suggests a job name from the photo's file name; change it if you like,
   then click **Create job**. The photo is copied into your jobs folder.
2. Click **+ Add callout** and fill in Surface, Product, Color and Sheen.
   Leave Sheen empty to show only the color.
3. Click on the photo where that callout should point. A numbered dot appears;
   the number matches the callout on the left. Drag any dot to move it.
4. Repeat for up to 8 callouts. Use ↑ and ↓ to change their order (the order
   they appear in the video) and ✕ to delete one.
5. Watch the **Preview**. It is the real video and updates as you type and drag.
6. Click **Make video**. A bar shows progress. When it's done, click
   **Open the folder** to see the video.

Your work saves itself as you go ("All changes saved" under the job name).

If the cards can't all fit, a message above the preview says which callout to
move or shorten, and that callout is highlighted on the left.

The video takes the shape of the photo: wide photos make wide videos, upright
photos make upright videos, with nothing cut off. Photos longer than twice
their short side are refused with a message; crop them first.

### Where your jobs and videos are

Each job has its own folder inside **`my-jobs`** in this project folder:

```
my-jobs\
  Smith kitchen\
    photo.jpg     the photo (turned upright)
    thumb.jpg     the small picture on the jobs list
    job.json      the callouts and dot positions
    video.mp4     the finished video
```

**The `my-jobs` folder is never uploaded to GitHub.** It is listed in the
`.gitignore` file, which tells Git to leave it out, because the repository is
public and these are photos of clients' homes.

### Change the surface pick list

Open **`surfaces.txt`** in this folder with Notepad. Put one surface per line,
then save. The page picks up the change the next time you open a job.

The Product, Color and Sheen boxes (and Surface) also suggest values you've used
on earlier jobs: start typing and pick from the list.

### Change the look

| What | Where |
| --- | --- |
| Every color, font size and opacity | `src/brand.ts` |
| Lighter or darker cards | `backgroundOpacity` in `src/brand.ts` (higher = darker) |
| Timing (when things appear, how long things last) | `src/timing.ts` |

## Commands

These still work for the example job. First, in PowerShell, move into this
folder (every command below only works from inside it):

```bash
cd C:\Users\mowre\github\projectimage
```

The first time only, install the parts the tool needs:

```bash
npm install
```

Live preview of the example job (Ctrl+C stops it):

```bash
npm run preview
```

Make the example video (saved as `out\video.mp4`):

```bash
npm run render
```

The example job is `jobs/20260922_103817.json`, and its photo is in the
`public` folder. In that file, `x` runs from 0 (left edge) to 1 (right edge),
and `y` from 0 (top) to 1 (bottom).

## For developers

- `npm test` checks card placement (1 to 8 callouts, wide and upright videos,
  every rule at 41 moments of the zoom) and the job-saving helpers.
- `npm run typecheck` checks the code for type errors.
- `npm run page` starts Callout Studio without the starter file.
- The page (`page/`) and the final render (`server/server.mts`) both use the
  same video code in `src/`, so the preview matches the finished video.
