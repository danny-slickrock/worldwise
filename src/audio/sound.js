// Tiny feedback-tone playback for the sound toggle. Sounds are optional
// flavor — any failure to load or play must never interrupt gameplay.
import { Audio } from "expo-av";
import { CORRECT_TONE_URI, WRONG_TONE_URI } from "./tones";

const cache = {};

async function getSound(uri) {
  if (cache[uri]) return cache[uri];
  const { sound } = await Audio.Sound.createAsync({ uri });
  cache[uri] = sound;
  return sound;
}

async function play(uri) {
  try {
    const sound = await getSound(uri);
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    /* sound unavailable on this platform/browser — silently skip */
  }
}

export function playCorrectTone() {
  play(CORRECT_TONE_URI);
}

export function playWrongTone() {
  play(WRONG_TONE_URI);
}
