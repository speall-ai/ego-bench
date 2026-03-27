import type { AudioMetrics } from "../types.js";

const SILENCE_THRESHOLD = 0.00316; // ~-50 dB RMS
const CLIPPING_THRESHOLD = 0.99;
const CHUNK_DURATION = 0.05; // 50ms

export async function analyzeAudio(file: File): Promise<AudioMetrics | null> {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await file.arrayBuffer();
    let audioBuffer: AudioBuffer;

    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch {
      return null;
    }

    const channelCount = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Average channels into a single mono signal
    const samples = new Float32Array(length);
    for (let ch = 0; ch < channelCount; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        samples[i] += channelData[i];
      }
    }
    if (channelCount > 1) {
      for (let i = 0; i < length; i++) {
        samples[i] /= channelCount;
      }
    }

    // RMS of entire signal
    let sumSquares = 0;
    for (let i = 0; i < length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / length);
    const loudnessLUFS = rms > 0 ? 20 * Math.log10(rms) : -Infinity;

    // Peak dB
    let peakValue = 0;
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peakValue) peakValue = abs;
    }
    const peakDb = peakValue > 0 ? 20 * Math.log10(peakValue) : -Infinity;

    // Silence percent (50ms chunks)
    const chunkSize = Math.floor(sampleRate * CHUNK_DURATION);
    const totalChunks = Math.floor(length / chunkSize);
    let silentChunks = 0;

    for (let c = 0; c < totalChunks; c++) {
      const start = c * chunkSize;
      let chunkSum = 0;
      for (let i = start; i < start + chunkSize; i++) {
        chunkSum += samples[i] * samples[i];
      }
      const chunkRms = Math.sqrt(chunkSum / chunkSize);
      if (chunkRms < SILENCE_THRESHOLD) {
        silentChunks++;
      }
    }
    const silencePercent = totalChunks > 0 ? (silentChunks / totalChunks) * 100 : 0;

    // Clipping percent
    let clippingSamples = 0;
    for (let i = 0; i < length; i++) {
      if (Math.abs(samples[i]) > CLIPPING_THRESHOLD) {
        clippingSamples++;
      }
    }
    const clippingPercent = (clippingSamples / length) * 100;

    // Overall score
    let overallScore = 100;
    if (loudnessLUFS < -30) overallScore -= 20;
    if (loudnessLUFS > -10) overallScore -= 15;
    overallScore -= silencePercent * 0.3;
    overallScore -= clippingPercent * 50;
    overallScore = Math.max(0, Math.min(100, overallScore));

    return {
      loudnessLUFS: Math.round(loudnessLUFS * 100) / 100,
      peakDb: Math.round(peakDb * 100) / 100,
      silencePercent: Math.round(silencePercent * 100) / 100,
      clippingPercent: Math.round(clippingPercent * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
    };
  } finally {
    await audioContext.close();
  }
}
