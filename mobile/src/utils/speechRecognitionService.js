import { Platform, PermissionsAndroid } from 'react-native';

// Dynamically import ExpoSpeechRecognitionModule safely so it does not break in web bundles
let ExpoSpeechRecognitionModule = null;
try {
  const recognitionPkg = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule =
    recognitionPkg.ExpoSpeechRecognitionModule ||
    recognitionPkg.default?.ExpoSpeechRecognitionModule ||
    recognitionPkg.default ||
    null;
} catch (e) {
  console.warn('[SpeechService] Could not initialize expo-speech-recognition:', e?.message);
  ExpoSpeechRecognitionModule = null;
}

// BCP-47 language codes for speech recognition in India
export const RECOGNITION_LOCALE_MAP = {
  te: 'te-IN', // Telugu (India)
  hi: 'hi-IN', // Hindi (India)
  en: 'en-IN', // English (India)
};

class SpeechRecognitionService {
  constructor() {
    this.activeWebRecognition = null;
    this.nativeSubscriptions = [];
    this.isListening = false;
  }

  /**
   * Check if speech recognition is available in the current environment
   */
  async isAvailable() {
    // 1. Web Browser Environment
    if (Platform.OS === 'web') {
      return !!(
        typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition)
      );
    }

    // 2. Android Native Environment
    if (Platform.OS === 'android') {
      if (ExpoSpeechRecognitionModule) {
        try {
          if (typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function') {
            return ExpoSpeechRecognitionModule.isRecognitionAvailable();
          }
          return true;
        } catch (e) {
          console.warn('[SpeechService] isRecognitionAvailable check failed:', e);
          return true;
        }
      }
      return false;
    }

    return false;
  }

  /**
   * Request microphone & speech recognition permissions
   */
  async requestPermissions(language = 'en') {
    // 1. Web Environment
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Release track immediately so speech recognizer can claim device
          stream.getTracks().forEach((track) => track.stop());
          return true;
        } catch {
          return false;
        }
      }
      return true;
    }

    // 2. Android Native Environment
    if (Platform.OS === 'android') {
      try {
        // Expo speech recognition module permission request
        if (ExpoSpeechRecognitionModule?.requestPermissionsAsync) {
          try {
            const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (res?.granted) {
              return true;
            }
          } catch (e) {
            console.warn('[SpeechService] requestPermissionsAsync error:', e);
          }
        }

        // Native Android runtime permission fallback
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title:
              language === 'te'
                ? 'మైక్రోఫోన్ అనుమతి'
                : language === 'hi'
                ? 'माइक्रोफ़ोन अनुमति'
                : 'Microphone Permission',
            message:
              language === 'te'
                ? 'వాయిస్ ద్వారా మాట్లాడటానికి ఫామ్‌ధన్‌కు మైక్రోఫోన్ యాక్సెస్ అవసరం.'
                : language === 'hi'
                ? 'आवाज़ से बोलने के लिए फार्मधन को माइक्रोफ़ोन एक्सेस चाहिए।'
                : 'FarmDhan needs access to your microphone so you can speak your questions.',
            buttonNeutral: language === 'te' ? 'తర్వాత' : language === 'hi' ? 'बाद में' : 'Ask Later',
            buttonNegative: language === 'te' ? 'రద్దు' : language === 'hi' ? 'रद्द करें' : 'Cancel',
            buttonPositive: language === 'te' ? 'సరే' : language === 'hi' ? 'ठीक है' : 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[SpeechService] Permission error:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * Start speech recognition across Web and Native Android
   */
  async start({ language = 'en', onStart, onResult, onError, onEnd }) {
    if (this.isListening) {
      await this.stop();
    }

    const locale = RECOGNITION_LOCALE_MAP[language] || 'en-IN';

    // ----------------------------------------------------
    // Branch A: Web Browser (Preserved Web Speech API)
    // ----------------------------------------------------
    if (Platform.OS === 'web') {
      const SpeechRecognitionConstructor =
        typeof window !== 'undefined'
          ? window.SpeechRecognition || window.webkitSpeechRecognition
          : null;

      if (!SpeechRecognitionConstructor) {
        if (onError) onError({ error: 'unsupported' });
        return;
      }

      try {
        const recognition = new SpeechRecognitionConstructor();
        this.activeWebRecognition = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = locale;

        recognition.onstart = () => {
          this.isListening = true;
          if (onStart) onStart();
        };

        recognition.onresult = (event) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
          }
          const recognizedText = fullTranscript.trim();
          if (recognizedText && onResult) {
            onResult(recognizedText);
          }
        };

        recognition.onerror = (event) => {
          console.warn('[SpeechService Web] Error:', event.error);
          this.isListening = false;
          this.activeWebRecognition = null;
          if (onError) onError({ error: event.error });
        };

        recognition.onend = () => {
          this.isListening = false;
          this.activeWebRecognition = null;
          if (onEnd) onEnd();
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('[SpeechService Web] Failed to start:', err);
        this.isListening = false;
        this.activeWebRecognition = null;
        if (onError) onError({ error: err.message });
        return;
      }
    }

    // ----------------------------------------------------
    // Branch B: Native Android (ExpoSpeechRecognitionModule)
    // ----------------------------------------------------
    if (Platform.OS === 'android' && ExpoSpeechRecognitionModule) {
      try {
        this.cleanupNativeListeners();

        // Register event listeners using modern addListener API
        const subStart = ExpoSpeechRecognitionModule.addListener('start', () => {
          console.log('[SpeechService Native] Recognition started');
          this.isListening = true;
          if (onStart) onStart();
        });

        const subResult = ExpoSpeechRecognitionModule.addListener('result', (event) => {
          console.log('[SpeechService Native] Recognition result received:', event);
          // Native module returns results array with transcripts
          if (event?.results && event.results.length > 0) {
            const transcript = event.results[0]?.transcript || '';
            if (transcript.trim() && onResult) {
              onResult(transcript.trim());
            }
          }
        });

        const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
          console.log('[SpeechService Native] Recognition ended');
          this.isListening = false;
          this.cleanupNativeListeners();
          if (onEnd) onEnd();
        });

        const subError = ExpoSpeechRecognitionModule.addListener('error', (event) => {
          console.warn('[SpeechService Native] Error:', event?.error, event?.message);
          this.isListening = false;
          this.cleanupNativeListeners();
          if (onError) onError({ error: event?.error || 'recognition_failed', message: event?.message });
        });

        this.nativeSubscriptions = [subStart, subResult, subEnd, subError];

        // Start native recognition with Indian locale & continuous options
        console.log(`[SpeechService Native] Starting native speech recognition with locale: ${locale}`);
        await ExpoSpeechRecognitionModule.start({
          lang: locale,
          interimResults: true,
          continuous: false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: true,
        });

        this.isListening = true;
      } catch (err) {
        console.warn('[SpeechService Native] Failed to start:', err);
        this.isListening = false;
        this.cleanupNativeListeners();
        if (onError) onError({ error: err.message });
      }
      return;
    }

    // Fallback if neither is available
    if (onError) onError({ error: 'unsupported' });
  }

  /**
   * Clean up native event subscriptions
   */
  cleanupNativeListeners() {
    if (this.nativeSubscriptions && this.nativeSubscriptions.length > 0) {
      this.nativeSubscriptions.forEach((sub) => {
        try {
          if (sub && typeof sub.remove === 'function') {
            sub.remove();
          }
        } catch {
          // ignore
        }
      });
      this.nativeSubscriptions = [];
    }
  }

  /**
   * Stop speech recognition immediately
   */
  async stop() {
    this.isListening = false;

    // Web stop
    if (this.activeWebRecognition) {
      try {
        this.activeWebRecognition.stop();
      } catch {
        // ignore
      }
      this.activeWebRecognition = null;
    }

    // Native stop
    if (Platform.OS === 'android' && ExpoSpeechRecognitionModule) {
      try {
        if (typeof ExpoSpeechRecognitionModule.stop === 'function') {
          await ExpoSpeechRecognitionModule.stop();
        } else if (typeof ExpoSpeechRecognitionModule.abort === 'function') {
          await ExpoSpeechRecognitionModule.abort();
        }
      } catch {
        // ignore
      }
      this.cleanupNativeListeners();
    }
  }

  /**
   * Abort recognition without waiting for final result
   */
  async abort() {
    this.isListening = false;

    if (this.activeWebRecognition) {
      try {
        this.activeWebRecognition.abort();
      } catch {
        // ignore
      }
      this.activeWebRecognition = null;
    }

    if (Platform.OS === 'android' && ExpoSpeechRecognitionModule) {
      try {
        if (typeof ExpoSpeechRecognitionModule.abort === 'function') {
          await ExpoSpeechRecognitionModule.abort();
        }
      } catch {
        // ignore
      }
      this.cleanupNativeListeners();
    }
  }
}

export const speechService = new SpeechRecognitionService();
