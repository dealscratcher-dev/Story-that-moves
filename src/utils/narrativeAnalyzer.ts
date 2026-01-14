export type EmotionTone = 'calm' | 'tense' | 'exciting' | 'sad' | 'joyful' | 'mysterious' | 'neutral';
export type MotionType = 'breathe' | 'pulse' | 'shift' | 'wave' | 'drift';
export type NarrativeStyle = 'quirky' | 'minimalistic' | 'dramatic' | 'poetic' | 'playful' | 'cinematic';

const emotionKeywords: Record<EmotionTone, string[]> = {
  calm: ['peaceful', 'serene', 'quiet', 'gentle', 'soft', 'still', 'tranquil', 'rest'],
  tense: ['suddenly', 'danger', 'fear', 'anxious', 'worried', 'nervous', 'rushed', 'urgent'],
  exciting: ['amazing', 'incredible', 'thrilling', 'adventure', 'burst', 'explode', 'rush', 'energy'],
  sad: ['tears', 'loss', 'grief', 'sorrow', 'lonely', 'empty', 'dark', 'pain'],
  joyful: ['happy', 'laugh', 'smile', 'delight', 'joy', 'celebrate', 'bright', 'love'],
  mysterious: ['shadow', 'whisper', 'secret', 'hidden', 'unknown', 'strange', 'mystery', 'wonder'],
  neutral: []
};

const motionMapping: Record<EmotionTone, MotionType> = {
  calm: 'breathe',
  tense: 'pulse',
  exciting: 'wave',
  sad: 'drift',
  joyful: 'shift',
  mysterious: 'breathe',
  neutral: 'breathe'
};

export function analyzeNarrative(text: string, style: NarrativeStyle = 'dramatic'): { emotion: EmotionTone; intensity: number; motion: MotionType } {
  const lowerText = text.toLowerCase();
  const scores: Record<EmotionTone, number> = {
    calm: 0,
    tense: 0,
    exciting: 0,
    sad: 0,
    joyful: 0,
    mysterious: 0,
    neutral: 0
  };

  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[emotion as EmotionTone] += 1;
      }
    }
  }

  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const ellipsisCount = (text.match(/\.\.\./g) || []).length;

  scores.exciting += exclamationCount * 0.5;
  scores.tense += exclamationCount * 0.3;
  scores.mysterious += questionCount * 0.3 + ellipsisCount * 0.4;
  scores.calm += ellipsisCount * 0.2;

  let dominantEmotion: EmotionTone = 'neutral';
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion as EmotionTone;
    }
  }

  let intensity = Math.min(maxScore / 5, 1);

  const styleModifiers: Record<NarrativeStyle, { intensityMultiplier: number; emotionOverride?: (e: EmotionTone) => EmotionTone }> = {
    quirky: {
      intensityMultiplier: 1.5,
      emotionOverride: (e) => e === 'neutral' ? 'joyful' : e === 'sad' ? 'mysterious' : e
    },
    minimalistic: {
      intensityMultiplier: 0.4
    },
    dramatic: {
      intensityMultiplier: 1.8,
      emotionOverride: (e) => e === 'neutral' ? 'mysterious' : e
    },
    poetic: {
      intensityMultiplier: 1.2,
      emotionOverride: (e) => e === 'tense' ? 'mysterious' : e === 'exciting' ? 'joyful' : e
    },
    playful: {
      intensityMultiplier: 1.6,
      emotionOverride: (e) => e === 'sad' ? 'joyful' : e === 'tense' ? 'exciting' : e
    },
    cinematic: {
      intensityMultiplier: 2.0
    }
  };

  const modifier = styleModifiers[style];
  intensity = Math.min((intensity > 0.1 ? intensity : 0.3) * modifier.intensityMultiplier, 1);

  if (modifier.emotionOverride) {
    dominantEmotion = modifier.emotionOverride(dominantEmotion);
  }

  return {
    emotion: dominantEmotion,
    intensity,
    motion: motionMapping[dominantEmotion]
  };
}

export function splitIntoSegments(content: string, maxLength: number = 300): string[] {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  const segments: string[] = [];
  let currentSegment = '';

  for (const sentence of sentences) {
    if (currentSegment.length + sentence.length > maxLength && currentSegment.length > 0) {
      segments.push(currentSegment.trim());
      currentSegment = sentence;
    } else {
      currentSegment += sentence;
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment.trim());
  }

  return segments.filter(s => s.length > 0);
}
