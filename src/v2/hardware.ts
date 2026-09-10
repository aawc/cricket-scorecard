/**
 * Cricket Scorecard PWA v2 - Mobile Ergonomics & Hardware Engine
 * Integrates Screen Wake Lock, Web Vibration/Haptics, and Web Audio synthesis.
 */

export class ScreenWakeLockController {
  private sentinel: any = null;
  private isEnabled: boolean = false;
  private onStateChangeListeners: Array<(active: boolean) => void> = [];

  constructor() {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', async () => {
        if (this.isEnabled && document.visibilityState === 'visible' && !this.sentinel) {
          await this.acquire();
        }
      });
    }
  }

  public async enable(): Promise<boolean> {
    this.isEnabled = true;
    return await this.acquire();
  }

  public async disable(): Promise<void> {
    this.isEnabled = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (err) {
        console.warn('[WakeLock] Error releasing sentinel:', err);
      }
      this.sentinel = null;
      this.notify(false);
    }
  }

  public async toggle(): Promise<boolean> {
    if (this.isActive()) {
      await this.disable();
      return false;
    } else {
      return await this.enable();
    }
  }

  public isActive(): boolean {
    return !!this.sentinel && this.isEnabled;
  }

  public onStateChange(listener: (active: boolean) => void): () => void {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter(l => l !== listener);
    };
  }

  private async acquire(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.notify(false);
      });
      this.notify(true);
      return true;
    } catch (err) {
      console.warn('[WakeLock] Request failed:', err);
      this.sentinel = null;
      this.notify(false);
      return false;
    }
  }

  private notify(active: boolean): void {
    this.onStateChangeListeners.forEach(l => {
      try {
        l(active);
      } catch (e) {
        console.error('[WakeLock] Listener error:', e);
      }
    });
  }
}

export class HapticsEngine {
  private enabled: boolean = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public vibrate(pattern: number | number[]): boolean {
    if (!this.enabled || typeof navigator === 'undefined' || !navigator.vibrate) {
      return false;
    }
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  public tap(): boolean {
    return this.vibrate(15);
  }

  public single(): boolean {
    return this.vibrate(25);
  }

  public boundary4(): boolean {
    return this.vibrate([35, 30, 35]);
  }

  public maximum6(): boolean {
    return this.vibrate([50, 30, 50, 30, 70]);
  }

  public wicket(): boolean {
    return this.vibrate([100, 40, 100, 40, 150]);
  }

  public undo(): boolean {
    return this.vibrate([30, 20, 30]);
  }
}

export class WebAudioSynthesizer {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playKeyClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // AudioContext unavailable or suppressed
    }
  }

  public playBoundary(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.18);
      });
    } catch {}
  }

  public playWicket(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }
}

// Global Singleton Instances
export const wakeLockController = new ScreenWakeLockController();
export const haptics = new HapticsEngine();
export const audioSynth = new WebAudioSynthesizer();
