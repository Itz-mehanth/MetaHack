/**
 * Page-level state shared by the HTML landing page and the game: whether
 * the landing page covers the screen (the game then plays its attract reel
 * behind it), which hero the reel is showing, and the sound switch.
 */
export const shell = {
  landing: true,
  /** A stage is running on the flat screen (the home button hides). */
  playing: false,
  /** Hero on screen in the attract reel ('' when it is not running). */
  showcase: '',
  /** Bumped by the game each time the reel cuts to another hero. */
  cut: 0,
  /** The reel plays with sound (the landing page's sound button). */
  sound: false,
  /** Starts audio; must run inside a click handler (browser autoplay rules). */
  unlockAudio: null as (() => void) | null,
  /** Shows the landing page again (set by landing.ts). */
  goHome: null as (() => void) | null,
};
