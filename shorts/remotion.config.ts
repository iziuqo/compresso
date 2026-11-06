import { Config } from '@remotion/cli/config';

// The app's tokens switch to paper white under prefers-color-scheme: light,
// and headless Chrome reports light. The Shorts are the dark app.
Config.setChromiumDarkMode(true);
Config.setVideoImageFormat('png');
// Point at an installed Chrome headless shell instead of downloading one.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
