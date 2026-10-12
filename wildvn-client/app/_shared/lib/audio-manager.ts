/**
 * WILDVN - Web Audio Engine Manager
 * Singleton audio controller implementing gesture unlock, fading, and BFCache lifecycle protection.
 */

export type AudioState = "uninitialized" | "suspended" | "running" | "closed";

interface TrackInstance {
  element: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  url: string;
}

class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private state: AudioState = "uninitialized";
  private gestureReceived = false;
  private activeTracks: Map<string, TrackInstance> = new Map();

  private constructor() {
    // Check if gesture unlock was already registered in this tab session
    if (typeof window !== "undefined") {
      this.gestureReceived = sessionStorage.getItem("audio-gesture") === "1";
    }
  }

  public static getInstance(): AudioManager {
    if (!this.instance) {
      this.instance = new AudioManager();
    }
    return this.instance;
  }

  /**
   * Unlocks the AudioContext using a user-initiated gesture (click/keydown).
   * MUST be called from a Client Component interactive handler.
   */
  public async unlock(): Promise<boolean> {
    if (this.gestureReceived && this.ctx && this.ctx.state === "running") {
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return false;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }

      this.state = "running";
      this.gestureReceived = true;
      sessionStorage.setItem("audio-gesture", "1");
      return true;
    } catch (error) {
      console.warn("AudioManager: Failed to unlock AudioContext", error);
      this.state = "suspended";
      return false;
    }
  }

  /**
   * Plays a track with dynamic volume fading to prevent acoustic pops.
   */
  public async playTrack(url: string, volume = 0.5, fadeDuration = 1.0): Promise<void> {
    if (!this.gestureReceived || !this.ctx || !this.masterGain) {
      // Warm up / queue if gesture not yet completed
      return;
    }

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    let track = this.activeTracks.get(url);

    if (!track) {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.loop = true;

      const sourceNode = this.ctx.createMediaElementSource(audio);
      const gainNode = this.ctx.createGain();

      sourceNode.connect(gainNode);
      gainNode.connect(this.masterGain);

      track = { element: audio, sourceNode, gainNode, url };
      this.activeTracks.set(url, track);
    }

    // Fade In
    const currentTime = this.ctx.currentTime;
    track.gainNode.gain.setValueAtTime(0, currentTime);
    track.element.play().catch((err) => {
      console.warn("AudioManager: play blocked", err);
    });
    track.gainNode.gain.linearRampToValueAtTime(volume, currentTime + fadeDuration);
  }

  /**
   * Fades out and pauses a specific track.
   */
  public fadeOutTrack(url: string, fadeDuration = 1.0): void {
    const track = this.activeTracks.get(url);
    if (!track || !this.ctx) return;

    const currentTime = this.ctx.currentTime;
    track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, currentTime);
    track.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeDuration);

    setTimeout(() => {
      // Check if track is still at 0 volume and hasn't been re-triggered
      if (track.gainNode.gain.value === 0) {
        track.element.pause();
      }
    }, fadeDuration * 1000);
  }

  /**
   * Fades out and pauses all playing tracks.
   */
  public stopAll(fadeDuration = 0.8): void {
    this.activeTracks.forEach((track) => {
      this.fadeOutTrack(track.url, fadeDuration);
    });
  }

  /**
   * Handle BFCache restore cycle to re-establish connections.
   */
  public async resumeAfterBFCache(): Promise<void> {
    if (!this.gestureReceived || !this.ctx) return;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /**
   * Sets the master volume level.
   */
  public setMasterVolume(volume: number): void {
    if (this.masterGain && this.ctx) {
      const currentTime = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(volume, currentTime + 0.1);
    }
  }

  public getContextState(): AudioState {
    return this.state;
  }

  public isUnlocked(): boolean {
    return this.gestureReceived;
  }
}

export const audioManager = AudioManager.getInstance();
