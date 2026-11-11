# Project Image

A small personal tool for Ideal Painting that turns a finished-project photo
into a short video (about 10 seconds) with animated callouts naming the finish
on each surface, followed by a closing card with the logo and phone number.

Built with [Remotion](https://www.remotion.dev/), which makes videos from code.

## First-time setup

You need Node.js (version 18 or newer). Check with:

```bash
node --version
```

Then, in this folder, install the parts the tool needs (only once):

```bash
npm install
```

## Watch a live preview

```bash
npm run preview
```

This opens a preview in your web browser. Press play to watch. If you edit the
job file (see below) and save it, the preview updates by itself.
Press `Ctrl+C` in the terminal to stop it.

## Make the video file

```bash
npm run render
```

The finished video is saved as `out/video.mp4`. It takes about a minute.

## Where things live

| What | Where |
| --- | --- |
| Photos and the logo | `public/` folder |
| The job: which photo, and the callout text and positions | `jobs/20260922_103817.json` |
| Every color, font and text size | `src/brand.ts` |
| Timing (when things appear, how long things last) | `src/timing.ts` |

### Moving a dot

In the job file, each callout has an `x` and a `y`:

- `x` is left to right: `0` is the left edge of the photo, `1` is the right edge.
- `y` is top to bottom: `0` is the top edge, `1` is the bottom edge.

So `"x": 0.75, "y": 0.575` means three quarters of the way across and a bit
more than halfway down. Change the numbers, save, and watch the preview.
The cards move themselves; you never position them by hand.

### Line 3

Line 3 shows `color · sheen`. If `sheen` is empty (`""`), only the color shows.

### A new job

1. Put the new photo in the `public` folder. It should be a 4:3 landscape photo.
2. Copy the job file, give it a new name, and change `photo` and the callouts.
3. Render it with:

```bash
npx remotion render ProjectVideo out/new-job.mp4 --props=jobs/new-job.json
```

(Replace `new-job` with your file names.)

## For developers

- `npm test` checks the card placement rules on hundreds of random dot positions.
- `npm run typecheck` checks the code for type errors.
