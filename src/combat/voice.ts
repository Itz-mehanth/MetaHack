/**
 * File ids of the rendered voice-over (public/vo/<id>.mp3). The game plays
 * these ids and scripts/vo/lines.ts renders them, so both build the names here.
 */

export type SagaScript = 'prologue' | 'finale';

/** ECHO's call for a chapter's first level. */
export const callId = (hero: string): string => `call_${hero}`;
export const introId = (world: string, level: number, index: number): string => `${world}_${level}_i${index}`;
export const outroId = (world: string, level: number, index: number): string => `${world}_${level}_o${index}`;
export const tauntId = (world: string, level: number, index: number): string => `${world}_${level}_t${index}`;
export const sagaIntroId = (script: SagaScript, index: number): string => `saga_${script}_i${index}`;
export const sagaOutroId = (script: SagaScript, index: number): string => `saga_${script}_o${index}`;
/** The prologue's erasure scene. */
export const erasureId = (index: number): string => `saga_erasure_${index}`;
