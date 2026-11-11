/**
 * The opening movie's script. Pure data, shared by the 3D sequence
 * (cinema.ts, which shows the captions and plays the voice-over) and by the
 * voice-over renderer (scripts/vo/render.mjs, which turns each line into
 * public/vo/<id>.mp3).
 */

/** Unlock id stored once the opening movie has been shown (it plays by itself only once). */
export const MOVIE_SEEN = 'movie';

export type MovieVoice = 'narrator' | 'oblivax' | 'vex' | 'echo';

export interface MovieLine {
  readonly id: string;
  readonly voice: MovieVoice;
  readonly text: string;
}

export const MOVIE_LINES: readonly MovieLine[] = [
  { id: 'm01', voice: 'narrator', text: 'Long ago, ten Anchors held reality together. A light in every sky. A life in every world.' },
  { id: 'm02', voice: 'narrator', text: 'Then something answered the dark.' },
  { id: 'm03', voice: 'oblivax', text: 'I am OBLIVAX. The Unmaker. Nothing I touch remains.' },
  { id: 'm04', voice: 'narrator', text: 'He tore the Anchors from the heavens, and whole worlds fell like glass.' },
  { id: 'm05', voice: 'vex', text: 'Kneel before the Hollow Legion. Or be caged forever.' },
  { id: 'm06', voice: 'narrator', text: 'Warlord VEX took every city. Every hero was scattered.' },
  { id: 'm07', voice: 'narrator', text: 'And now, the erasure has reached your room.' },
  { id: 'm08', voice: 'echo', text: 'Surge Command to anyone who can hear this. We have one weapon left.' },
  { id: 'm09', voice: 'echo', text: 'Your hands.' },
  { id: 'm10', voice: 'narrator', text: 'SURGE. Hands of Heroes.' },
];

export const movieLine = (id: string): MovieLine => MOVIE_LINES.find((l) => l.id === id) ?? MOVIE_LINES[0];
