import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { FarmerAvatar } from '../../components/FarmerAvatar';
import { api } from '../../services/api';
import { speechService } from '../../utils/speechRecognitionService';

// Clean, role-aware welcome message (zero hardcoded crop/ton assumptions)
const getWelcomeMessage = (lang, role = 'farmer') => {
  const isBuyer = role === 'buyer';
  if (isBuyer) {
    return {
      id: 'welcome-msg',
      sender: 'ai',
      text:
        lang === 'te'
          ? 'నమస్కారం! నేను మీ ఫామ్‌ధన్ కొనుగోలు AI సహాయకుడిని. అందుబాటులో ఉన్న పంట వ్యర్థాలు, సమీప విక్రేతలు లేదా సేకరణ ధరల గురించి ఏ ప్రశ్నైనా అడగవచ్చు.'
          : lang === 'hi'
          ? 'नमस्ते! मैं आपका फार्मधन Buyer AI सहायक हूँ। उपलब्ध फसल अवशेष, क्षेत्रीय विक्रेताओं या खरीद दरों के बारे में कोई भी सवाल पूछ सकते हैं।'
          : 'Hello! I am your FarmDhan Buyer Procurement AI. Ask me about available residue listings, sellers in your area, or procurement prices.',
      source: 'farmdhan-buyer-v1',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return {
    id: 'welcome-msg',
    sender: 'ai',
    text:
      lang === 'te'
        ? 'నమస్కారం! నేను మీ ఫామ్‌ధన్ AI సహాయకుడిని. పంట వ్యర్థాల ధరలు, కొనుగోలుదారులు మరియు లిస్టింగ్ గురించి ఏ ప్రశ్నైనా అడగవచ్చు.'
        : lang === 'hi'
        ? 'नमस्ते! मैं आपका फार्मधन AI सहायक हूँ। फसल अवशेषों के मूल्य, खरीदारों और लिस्टिंग के बारे में कोई भी सवाल पूछ सकते हैं।'
        : 'Hello! I am your FarmDhan AI Assistant. Ask me anything about crop residue prices, buyers, or listing your waste.',
    source: 'farmdhan-advisory-v1',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

export const AIAssistantScreen = ({ route, navigation }) => {
  const { user, language, t } = useAuth();
  const isBuyer = user?.role === 'buyer' || route?.params?.role === 'buyer';
  const [messages, setMessages] = useState([getWelcomeMessage(language, user?.role)]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState(null);
  const [isAutoSpeak, setIsAutoSpeak] = useState(true);
  const [submittingListing, setSubmittingListing] = useState(false);

  // Edit draft modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editWasteType, setEditWasteType] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('ton');
  const [editLocation, setEditLocation] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const flatListRef = useRef(null);

  // Optional quick suggestion chips — completely open-ended; never automatically sent
  const suggestionChips = isBuyer
    ? language === 'te'
      ? [
          'కరీంనగర్ దగ్గర విక్రేతలను చూపించు',
          '5 టన్నుల వరి గడ్డి సరఫరా ఉందా?',
          'అందుబాటులో ఉన్న లిస్టింగ్‌లు ఏవి?',
          'నా కొనుగోలు ఆఫర్లు',
        ]
      : language === 'hi'
      ? [
          'करीमनगर के पास विक्रेता दिखाएं',
          '5 टन धान की पराली चाहिए',
          'उपलब्ध लिस्टिंग कौन सी हैं?',
          'मेरे खरीद ऑफ़र',
        ]
      : [
          'Show me sellers near Karimnagar',
          'I need 5 tonnes of paddy straw',
          'What listings are available?',
          'Check my offers',
        ]
    : language === 'te'
    ? [
        'వరి గడ్డి ప్రస్తుత ధర ఎంత?',
        'కొనుగోలుదారులను ఎలా కనుగొనాలి?',
        'నా పంట వ్యర్థాలను లిస్ట్ చేయాలి',
        'నా లిస్టింగ్‌లు చూపించు',
      ]
    : language === 'hi'
    ? [
        'धान की पराली का क्या भाव है?',
        'खरीदार कैसे खोजें?',
        'फसल अवशेष लिस्ट करना है',
        'मेरी लिस्टिंग दिखाओ',
      ]
    : [
        'What is current paddy straw price?',
        'How can I find buyers?',
        'I want to list my waste',
        'Show my listings',
      ];

  // Derive dynamic visual state for Farmer Avatar
  const avatarState = isListening
    ? 'listening'
    : loading
    ? 'processing'
    : isSpeaking
    ? 'speaking'
    : 'idle';

  // Stop ongoing speech recognition cleanly
  const stopSpeechRecognition = () => {
    speechService.stop();
    setIsListening(false);
  };

  // Start fresh conversation: clears state, stops speech & recognition, loads clean welcome message
  const startNewChat = () => {
    Speech.stop();
    stopSpeechRecognition();
    setIsSpeaking(false);
    setActiveSpeakingMsgId(null);
    setInputText('');
    setMessages([getWelcomeMessage(language, user?.role)]);
    if (route?.params?.newChat) {
      navigation.setParams({ newChat: undefined });
    }
  };

  // When user opens fresh chat via newChat navigation parameter
  useEffect(() => {
    if (route?.params?.newChat) {
      startNewChat();
    }
  }, [route?.params?.newChat]);

  // Clean up speech synthesis & recognition on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
      stopSpeechRecognition();
    };
  }, []);

  // Section 16: Two-Way Text-to-Speech Output
  const speakResponse = (text, msgId = null) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
      if (activeSpeakingMsgId === msgId) return;
    }

    const langCode = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

    setIsSpeaking(true);
    setActiveSpeakingMsgId(msgId);
    Speech.speak(text, {
      language: langCode,
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        setIsSpeaking(false);
        setActiveSpeakingMsgId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveSpeakingMsgId(null);
      },
    });
  };

  const handleSendMessage = async (textToSend = null) => {
    if (isListening) {
      stopSpeechRecognition();
    }

    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-10)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        }));

      const response = await api.ai.chat(
        query.trim(),
        history,
        language,
        route?.params?.listing || null,
        user?.role || 'farmer'
      );

      const aiReplyText = response.reply || 'I am ready to help you market your agricultural waste.';
      const msgId = `ai-${Date.now()}`;

      const aiMsg = {
        id: msgId,
        sender: 'ai',
        text: aiReplyText,
        source: response.source || 'farmdhan-advisory-v1',
        listingDraft: response.listingDraft || null,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Two-Way Voice: automatically speak response if enabled
      if (isAutoSpeak && aiReplyText) {
        speakResponse(aiReplyText, msgId);
      }
    } catch (err) {
      console.warn('AI chat error:', err.message);
      const fallbackText =
        language === 'te'
          ? 'పంట వ్యర్థాలకు బయోమాస్ పరిశ్రమల్లో మంచి డిమాండ్ ఉంది. ఫామ్‌ధన్‌లో లిస్ట్ చేయండి లేదా మీ వద్ద ఏ పంట వ్యర్థం ఉందో చెబితే తగిన సమాచారం ఇస్తాను.'
          : language === 'hi'
          ? 'फसल अवशेषों की बायोमास उद्योगों में अच्छी मांग है। फार्मधन पर लिस्टिंग बनाएं या बताएं कि आपके पास कौन सा अवशेष है।'
          : 'Agricultural residues have strong demand for bio-pellets and bio-CNG. Create a listing on FarmDhan or tell me what crop residue you have to find matched buyers.';

      const fallbackMsg = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        source: 'offline_advisory',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);

      if (isAutoSpeak) {
        speakResponse(fallbackText, fallbackMsg.id);
      }
    } finally {
      setLoading(false);
    }
  };

  // Open-ended native speech recognition
  const toggleVoiceInput = async () => {
    if (isListening) {
      await stopSpeechRecognition();
      return;
    }

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
    }

    // 1. Request microphone permission first so user is prompted
    const hasPermission = await speechService.requestPermissions(language);
    if (!hasPermission) {
      Alert.alert(
        language === 'te'
          ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది'
          : language === 'hi'
          ? 'माइक्रोफ़ोन अनुमति अस्वीकृत'
          : 'Microphone Permission Required',
        language === 'te'
          ? 'వాయిస్ ద్వారా మాట్లాడటానికి దయచేసి మైక్రోఫోన్ అనుమతిని ఇవ్వండి.'
          : language === 'hi'
          ? 'वॉइस इनपुट के लिए कृपया माइक्रोफ़ोन अनुमति दें।'
          : 'Microphone permission is required to use voice input. Please allow microphone access.'
      );
      return;
    }

    // 2. Verify speech recognition engine availability
    const available = await speechService.isAvailable();
    if (!available) {
      Alert.alert(
        language === 'te' ? 'వాయిస్ సూచన' : language === 'hi' ? 'आवाज़ सूचना' : 'Voice Recognition Note',
        language === 'te'
          ? 'ఈ పరికరంలో లైవ్ స్పీచ్ రికగ్నిషన్ అందుబాటులో లేదు. దయచేసి కింద ఉన్న బాక్స్‌లో మీ ప్రశ్నను నేరుగా టైప్ చేయండి.'
          : language === 'hi'
          ? 'इस डिवाइस में लाइव आवाज़ पहचान उपलब्ध नहीं है। कृपया नीचे दिए गए बॉक्स में सवाल टाइप करें।'
          : 'Live speech recognition is not supported in this runtime. Please type your question directly in the box below.'
      );
      return;
    }

    try {
      await speechService.start({
        language,
        onStart: () => {
          setIsListening(true);
        },
        onResult: (text) => {
          // Streams recognized speech directly into the editable input text box
          if (text) {
            setInputText(text);
          }
        },
        onError: (err) => {
          console.warn('[AIAssistantScreen] Voice error:', err);
          setIsListening(false);
          if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
            Alert.alert(
              language === 'te' ? 'మైక్రోఫోన్ అనుమతి' : language === 'hi' ? 'माइक्रोफ़ोन अनुमति' : 'Microphone Permission',
              language === 'te'
                ? 'దయచేసి మీ డివైజ్ సెట్టింగ్స్‌లో మైక్రోఫోన్ అనుమతిని ఇవ్వండి.'
                : language === 'hi'
                ? 'कृपया सेटिंग्स में माइक्रोफ़ोन अनुमति दें।'
                : 'Please allow microphone permissions in settings.'
            );
          } else if (err?.error !== 'no-speech' && err?.error !== 'aborted') {
            Alert.alert(
              language === 'te' ? 'వాయిస్ సమాచారం' : language === 'hi' ? 'आवाज़ सूचना' : 'Voice Input',
              t('aiVoiceNoteIssue')
            );
          }
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Conversational Listing Confirmation Actions
  const handleSubmitDraft = async (messageId, draft) => {
    setSubmittingListing(true);
    try {
      const payload = {
        wasteType: draft.wasteType,
        quantity: Number(draft.quantity),
        unit: draft.unit || 'ton',
        expectedPrice: Number(draft.expectedPrice) || 0,
        location: {
          district: draft.location || user?.location?.district || 'Warangal',
          state: 'Telangana',
        },
      };

      const res = await api.listings.create(payload);

      if (res.success) {
        // Mark draft card as submitted
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, listingDraft: { ...m.listingDraft, submitted: true } }
              : m
          )
        );

        const successText = t('listingCreatedSuccess');
        const confirmMsg = {
          id: `ai-conf-${Date.now()}`,
          sender: 'ai',
          text: successText,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, confirmMsg]);

        if (isAutoSpeak) {
          speakResponse(successText, confirmMsg.id);
        }
      }
    } catch (err) {
      Alert.alert(
        language === 'te' ? 'లిస్టింగ్ విఫలమైంది' : language === 'hi' ? 'लिस्टिंग विफल' : 'Listing Failed',
        err.message || 'Could not submit listing. Please try again.'
      );
    } finally {
      setSubmittingListing(false);
    }
  };

  const handleCancelDraft = (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, listingDraft: { ...m.listingDraft, cancelled: true } }
          : m
      )
    );

    const cancelText = t('listingDraftCancelled');
    const cancelMsg = {
      id: `ai-can-${Date.now()}`,
      sender: 'ai',
      text: cancelText,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, cancelMsg]);

    if (isAutoSpeak) {
      speakResponse(cancelText, cancelMsg.id);
    }
  };

  const openEditDraftModal = (messageId, draft) => {
    setEditingMsgId(messageId);
    setEditWasteType(draft.wasteType || 'Paddy Straw');
    setEditQuantity(String(draft.quantity || ''));
    setEditUnit(draft.unit || 'ton');
    setEditLocation(draft.location || user?.location?.district || 'Warangal');
    setEditPrice(draft.expectedPrice ? String(draft.expectedPrice) : '');
    setEditModalVisible(true);
  };

  const saveEditedDraft = () => {
    if (!editQuantity || isNaN(editQuantity) || Number(editQuantity) <= 0) {
      Alert.alert(
        language === 'te' ? 'చెల్లని పరిమాణం' : language === 'hi' ? 'अमान्य मात्रा' : 'Invalid Quantity',
        t('quantityRequired')
      );
      return;
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === editingMsgId) {
          return {
            ...m,
            listingDraft: {
              ...m.listingDraft,
              wasteType: editWasteType,
              quantity: Number(editQuantity),
              unit: editUnit,
              location: editLocation,
              expectedPrice: editPrice ? Number(editPrice) : 0,
            },
          };
        }
        return m;
      })
    );

    setEditModalVisible(false);
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isSpeakingThisMsg = activeSpeakingMsgId === item.id;

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={styles.aiAvatarWrapper}>
            <FarmerAvatar size="small" state={isSpeakingThisMsg ? 'speaking' : 'idle'} />
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>

          {/* Conversational Listing Confirmation Preview Card */}
          {item.listingDraft && (
            <View style={styles.previewCard}>
              <View style={styles.previewCardHeader}>
                <Ionicons name="document-text" size={16} color={COLORS.primary} />
                <Text style={styles.previewCardTitle}>{t('listingDetails')}</Text>
              </View>
              <Text style={styles.previewCardSub}>{t('listingDetailsSub')}</Text>
              <View style={styles.previewDivider} />

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('wasteTypeLabel')}:</Text>
                <Text style={styles.previewValue}>{item.listingDraft.wasteType}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('quantityLabel')}:</Text>
                <Text style={styles.previewValue}>
                  {item.listingDraft.quantity} {item.listingDraft.unit === 'acre' ? t('unitAcre') : item.listingDraft.unit === 'ton' ? t('unitTon') : item.listingDraft.unit === 'quintal' ? t('unitQuintal') : t('unitKg')}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('locationLabel')}:</Text>
                <Text style={styles.previewValue}>{item.listingDraft.location || 'Warangal'}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('priceLabel')}:</Text>
                <Text style={styles.previewValue}>
                  {item.listingDraft.expectedPrice > 0
                    ? `₹${item.listingDraft.expectedPrice.toLocaleString('en-IN')}/${item.listingDraft.unit === 'acre' ? t('unitAcre') : item.listingDraft.unit === 'ton' ? t('unitTon') : item.listingDraft.unit === 'quintal' ? t('unitQuintal') : t('unitKg')}`
                    : (language === 'te' ? 'మార్కెట్ ఆఫర్ల కోసం' : language === 'hi' ? 'खुली बोली' : 'Open for bids')}
                </Text>
              </View>

              {item.listingDraft.submitted ? (
                <View style={styles.submittedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={styles.submittedBadgeText}>
                    {language === 'te' ? 'లిస్టింగ్ సమర్పించబడింది' : language === 'hi' ? 'लिस्टिंग सबमिट हो गई' : 'Listing Published'}
                  </Text>
                </View>
              ) : item.listingDraft.cancelled ? (
                <View style={styles.cancelledBadge}>
                  <Ionicons name="close-circle" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
                  <Text style={styles.cancelledBadgeText}>
                    {language === 'te' ? 'రద్దు చేయబడింది' : language === 'hi' ? 'रद्द की गई' : 'Cancelled'}
                  </Text>
                </View>
              ) : (
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.previewEditBtn}
                    onPress={() => openEditDraftModal(item.id, item.listingDraft)}
                    disabled={submittingListing}
                  >
                    <Ionicons name="pencil" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.previewEditBtnText}>{t('btnEdit')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.previewSubmitBtn}
                    onPress={() => handleSubmitDraft(item.id, item.listingDraft)}
                    disabled={submittingListing}
                  >
                    {submittingListing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.previewSubmitBtnText}>{t('btnSubmit')}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.previewCancelBtn}
                    onPress={() => handleCancelDraft(item.id)}
                    disabled={submittingListing}
                  >
                    <Text style={styles.previewCancelBtnText}>{t('btnCancel')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.messageMeta}>
            <Text style={[styles.timeText, isUser ? styles.userTime : styles.aiTime]}>
              {item.createdAt}
            </Text>

            {!isUser && (
              <TouchableOpacity
                onPress={() => speakResponse(item.text, item.id)}
                style={styles.speakerBtn}
              >
                <Ionicons
                  name={isSpeakingThisMsg ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={isSpeakingThisMsg ? '#10B981' : COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={
          isBuyer
            ? language === 'te'
              ? 'సేకరణ AI సహాయకుడు'
              : language === 'hi'
              ? 'खरीद एआई सहायक'
              : 'Procurement AI'
            : t('assistantTitle')
        }
        subtitle={
          isBuyer
            ? language === 'te'
              ? 'రైతుల నుండి ప్రత్యక్ష సేకరణ'
              : language === 'hi'
              ? 'किसानों से सीधी खरीद'
              : 'Residue Sourcing & Market Supply'
            : t('assistantSubtitle')
        }
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="aiAssistant"
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.newChatHeaderBtn}
              onPress={startNewChat}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.newChatHeaderBtnText}>{t('newChat')}</Text>
            </TouchableOpacity>

            {isSpeaking && (
              <TouchableOpacity
                style={[styles.stopSpeechBtn, { marginLeft: 6 }]}
                onPress={() => {
                  Speech.stop();
                  setIsSpeaking(false);
                  setActiveSpeakingMsgId(null);
                }}
              >
                <Ionicons name="volume-mute" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="aiAssistant" />

      {/* Prominent Farmer Avatar Status Header Card */}
      <View style={styles.avatarHeaderCard}>
        <FarmerAvatar size="medium" state={avatarState} showStatusLabel={true} />
        <View style={styles.avatarHeaderTextWrap}>
          <Text style={styles.avatarGreeting}>
            {isBuyer
              ? language === 'te'
                ? '🏭 కొనుగోలు AI అడ్వైజర్'
                : language === 'hi'
                ? '🏭 खरीद एआई सलाहकार'
                : '🏭 FarmDhan Buyer Procurement AI'
              : language === 'te'
              ? '🌾 రైతు మిత్రుడు AI సహాయకుడు'
              : language === 'hi'
              ? '🌾 किसान मित्र AI सहायक'
              : '🌾 FarmDhan Voice Assistant'}
          </Text>
          <Text style={styles.avatarStatusDesc}>
            {isListening
              ? (language === 'te' ? '🎙️ మీ మాటను వింటున్నాము... మాట్లాడండి' : language === 'hi' ? '🎙️ आवाज़ सुन रहे हैं... बोलें' : '🎙️ Listening... Speak now')
              : loading
              ? (language === 'te' ? '⏳ సమాధానం సిద్ధం చేస్తున్నాము...' : language === 'hi' ? '⏳ उत्तर तैयार कर रहे हैं...' : '⏳ Analyzing question...')
              : isSpeaking
              ? (language === 'te' ? '🔊 సమాధానం చదువుతున్నాము...' : language === 'hi' ? '🔊 उत्तर सुना रहे हैं...' : '🔊 Speaking response...')
              : (language === 'te' ? 'ఏ ప్రశ్నైనా మాట్లాడండి లేదా టైప్ చేయండి' : language === 'hi' ? 'कोई भी सवाल बोलें या टाइप करें' : 'Speak or type any question freely')}
          </Text>
        </View>

        {/* Two-Way Voice Auto-Speech Toggle */}
        <TouchableOpacity
          style={[styles.autoSpeakToggle, isAutoSpeak && styles.autoSpeakToggleActive]}
          onPress={() => setIsAutoSpeak((prev) => !prev)}
          activeOpacity={0.8}
          accessibilityLabel={isAutoSpeak ? 'Voice response enabled' : 'Voice response muted'}
        >
          <Ionicons
            name={isAutoSpeak ? 'volume-high' : 'volume-mute'}
            size={18}
            color={isAutoSpeak ? COLORS.primary : '#94A3B8'}
          />
        </TouchableOpacity>
      </View>

      {/* Optional Suggested Prompt Chips */}
      <View style={styles.chipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestionChips}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chip}
              onPress={() => handleSendMessage(item)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isListening && (
          <View style={styles.listeningBanner}>
            <Ionicons name="mic" size={18} color="#D32F2F" />
            <Text style={styles.listeningText}>{t('micListeningBanner')}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          {/* Native Speech-to-Text Microphone Button */}
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={toggleVoiceInput}
            accessibilityLabel={isListening ? t('micStopListening') : t('micTapToSpeakLabel')}
          >
            <Ionicons
              name={isListening ? 'radio-button-on' : 'mic'}
              size={22}
              color={isListening ? '#D32F2F' : '#FFFFFF'}
            />
          </TouchableOpacity>

          {/* Editable TextInput: Speech transcript directly populates here for farmer to edit */}
          <TextInput
            style={styles.input}
            placeholder={
              isListening
                ? t('micListeningPlaceholder')
                : t('askQuestionPlaceholder')
            }
            placeholderTextColor="#A0AEC0"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimerText}>{t('aiDisclaimer')}</Text>
      </KeyboardAvoidingView>

      {/* Edit Draft Listing Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>{t('btnEdit')} {t('listingDetails')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              <Text style={styles.fieldLabel}>{t('wasteTypeLabel')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editWasteType}
                onChangeText={setEditWasteType}
                placeholder="Crop residue type"
              />

              <Text style={styles.fieldLabel}>{t('quantityLabel')} (Number)</Text>
              <TextInput
                style={styles.modalInput}
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
                placeholder="e.g. 10"
              />

              <Text style={styles.fieldLabel}>{t('unit')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {['kg', 'quintal', 'ton', 'acre'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={{
                      flex: 1,
                      minWidth: '22%',
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: editUnit === u ? COLORS.primary : '#CBD5E1',
                      backgroundColor: editUnit === u ? COLORS.primary : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={() => setEditUnit(u)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: editUnit === u ? '#FFFFFF' : COLORS.text,
                      }}
                    >
                      {u === 'ton' ? t('unitTon') : u === 'quintal' ? t('unitQuintal') : u === 'acre' ? t('unitAcre') : t('unitKg')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('locationLabel')}</Text>
              <TextInput
                style={styles.modalInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Village / District"
              />

              <Text style={styles.fieldLabel}>{t('priceLabel')} (₹)</Text>
              <TextInput
                style={styles.modalInput}
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
                placeholder="Optional expected price"
              />

              <TouchableOpacity style={styles.saveDraftBtn} onPress={saveEditedDraft}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveDraftBtnText}>{t('save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  newChatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  newChatHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stopSpeechBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatarHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  avatarHeaderTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  avatarGreeting: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  avatarStatusDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  autoSpeakToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoSpeakToggleActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  chipsContainer: {
    paddingVertical: 8,
    backgroundColor: '#F1F8F2',
    borderBottomWidth: 1,
    borderBottomColor: '#E2EFE3',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiAvatarWrapper: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 14,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: COLORS.text,
  },
  previewCard: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 6,
  },
  previewCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 6,
  },
  previewEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
  },
  previewEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  previewSubmitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  previewCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  previewCancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  submittedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelledBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    fontSize: 10,
  },
  userTime: {
    color: '#D1E7DD',
  },
  aiTime: {
    color: COLORS.textMuted,
  },
  speakerBtn: {
    marginLeft: 8,
    padding: 2,
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  listeningText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '700',
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  micBtnActive: {
    backgroundColor: '#FFCDD2',
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#C8D6C9',
  },
  disclaimerText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: COLORS.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    maxHeight: '85%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
  },
  saveDraftBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  saveDraftBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
