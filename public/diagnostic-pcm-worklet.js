/* Static same-origin AudioWorklet: no blob, inline script or raw-audio storage. */
class DiagnosticPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = false;
    this.activitySent = false;
    this.reset();
    this.port.onmessage = ({ data }) => {
      if (data.type === 'start' && !this.started) {
        this.started = true;
        this.reset();
        this.maximum = Math.max(0, Math.min(6720000, Math.floor(data.maxSamples ?? 6720000)));
        this.active = this.maximum > 0;
      } else if (data.type === 'stop') {
        this.active = false;
        this.flush();
        this.port.postMessage({ type: 'stopped' });
      } else if (data.type === 'discard') {
        this.active = false;
        this.used = 0;
        this.port.postMessage({ type: 'stopped' });
      }
    };
  }
  reset() {
    this.chunk = new Float32Array(80000);
    this.used = 0;
    this.total = 0;
    this.phase = 0;
    this.weighted = 0;
  }
  flush() {
    if (!this.used) return;
    const samples = this.chunk.slice(0, this.used);
    this.port.postMessage({ type: 'samples', samples }, [samples.buffer]);
    this.used = 0;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length || !channels[0]?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let sample = 0;
      for (const channel of channels) sample += Number.isFinite(channel[i]) ? channel[i] : 0;
      sample /= channels.length;
      if (!this.activitySent && Math.abs(sample) > 0.001) {
        this.activitySent = true;
        this.port.postMessage({ type: 'activity' });
      }
      if (!this.active) continue;
      // Integrate piecewise-constant source samples over exact 16kHz windows.
      // Integer phase avoids floating-point drift at 44.1kHz block boundaries.
      let weight = 16000;
      while (weight > 0 && this.active) {
        const part = Math.min(weight, sampleRate - this.phase);
        this.weighted += sample * part;
        this.phase += part;
        weight -= part;
        if (this.phase === sampleRate) {
          this.chunk[this.used++] = this.weighted / sampleRate;
          this.total++;
          this.phase = 0;
          this.weighted = 0;
          if (this.used === 80000) this.flush();
          if (this.total >= this.maximum) {
            this.active = false;
            this.flush();
            this.port.postMessage({ type: 'limit' });
          }
        }
      }
    }
    return true;
  }
}
registerProcessor('diagnostic-pcm', DiagnosticPcmProcessor);
