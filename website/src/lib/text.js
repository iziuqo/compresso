/**
 * A headline split into its sentences, so each can sit on its own line: a
 * break between two sentences reads as a pause, one inside a sentence as an
 * accident. Chinese has no spaces and would otherwise break between any two
 * characters, so it splits after its full-width comma instead.
 */
export const sentences = (text) => text.split(/(?<=[.。])\s+|(?<=，)/);
