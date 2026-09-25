import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { StatusBadge } from '../../components/StatusBadge';
import { speakVoice, stopVoice } from '../../utils/voiceAssistant';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export const ProfileScreen = ({ navigation, route }) => {
  const {
    user,
    profile,
    role,
    language,
    switchLanguage,
    voiceAutoPlay,
    toggleVoiceAutoPlay,
    logout,
    t,
  } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [txModalVisible, setTxModalVisible] = useState(false);

  // If a transactionId was passed from notification, fetch real transaction & open detail modal
  useEffect(() => {
    const targetTxId = route?.params?.transactionId;
    if (targetTxId) {
      let isMounted = true;
      (async () => {
        try {
          const res = await api.transactions.getById(targetTxId);
          if (isMounted && res && res.success && res.transaction) {
            setSelectedTx(res.transaction);
            setTxModalVisible(true);
          } else if (isMounted) {
            Alert.alert(
              t('recordNotFound') || 'Deal Unavailable',
              t('detailsUnavailable') || 'The requested transaction is no longer available or was removed.'
            );
          }
        } catch (err) {
          if (isMounted) {
            Alert.alert(
              t('recordNotFound') || 'Deal Unavailable',
              t('detailsUnavailable') || 'The requested transaction is no longer available or was removed.'
            );
          }
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [route?.params?.transactionId]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.transactions.getAll();
        if (res.success) {
          setTransactions(res.transactions);
        }
      } catch (err) {
        console.warn('Transactions error:', err.message);
      }
    };
    fetchTransactions();
  }, []);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    logout();
    const rootNav = navigation.getParent() || navigation;
    rootNav.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const handleSelectLanguage = (code) => {
    switchLanguage(code);
    const msgs = {
      te: 'భాష తెలుగులోకి మార్చబడింది.',
      hi: 'भाषा हिंदी में बदल दी गई है।',
      en: 'Language changed to English.',
    };
    speakVoice(msgs[code] || msgs.en, code);
  };

  const handleTestVoice = () => {
    const greetings = {
      te: 'నమస్కారం! ఫామ్‌ధన్ వాయిస్ సహాయం సిద్ధంగా ఉంది. మీ పంట అవశేషాలను సులభంగా విక్రయించండి.',
      hi: 'नमस्ते! फार्मधन आवाज़ सहायता सक्रिय है। अपनी फसल अवशेष आसानी से बेचें।',
      en: 'Hello! FarmDhan voice assistance is active and ready to help you navigate and sell crop residue.',
    };
    speakVoice(greetings[language] || greetings.en, language);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('navProfile')}
        subtitle={t('profileTitle')}
        voiceScreenKey="profile"
      />

      {/* Multilingual Voice Guidance */}
      <VoiceGuideBar screenKey="profile" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Card */}
        <View style={[styles.profileHero, SHADOWS.small]}>
          <View style={styles.avatarWrap}>
            <Ionicons
              name={role === 'buyer' ? 'business' : 'person'}
              size={36}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.userName}>{user?.name || t('registeredUser')}</Text>
          {user?.phone ? <Text style={styles.userPhone}>📱 +91 {user.phone}</Text> : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {role === 'buyer' ? t('roleBuyerBadge') : t('roleFarmerBadge')}
            </Text>
          </View>
          <Text style={styles.locationText}>
            📍 {user?.location?.village ? `${user.location.village}, ` : ''}{user?.location?.district || ''}{user?.location?.state ? `, ${user.location.state}` : ''}
          </Text>
        </View>

        {/* Language Selection */}
        <Text style={styles.sectionHeader}>{t('appLanguageSection')}</Text>
        <View style={styles.langGrid}>
          {[
            { code: 'en', label: 'English', sub: 'Default' },
            { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
            { code: 'hi', label: 'हिंदी', sub: 'Hindi' },
          ].map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langCard, language === l.code && styles.langCardActive]}
              onPress={() => handleSelectLanguage(l.code)}
            >
              <Text style={[styles.langTitle, language === l.code && styles.langTitleActive]}>
                {l.label}
              </Text>
              <Text style={[styles.langSub, language === l.code && styles.langSubActive]}>
                {l.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voice Assistance Settings */}
        <Text style={styles.sectionHeader}>{t('voiceGuidanceSection')}</Text>
        <View style={[styles.voiceSettingsCard, SHADOWS.small]}>
          <View style={styles.voiceCardHeader}>
            <View style={[styles.voiceIconWrap, { backgroundColor: voiceAutoPlay ? '#E8F5E9' : '#F1F5F9' }]}>
              <Ionicons
                name={voiceAutoPlay ? 'volume-high' : 'volume-mute'}
                size={24}
                color={voiceAutoPlay ? COLORS.primary : COLORS.textMuted}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.voiceCardTitle}>
                {t('autoVoiceTitle')}
              </Text>
              <Text style={styles.voiceCardSub}>
                {t('autoVoiceSub')}
              </Text>
            </View>
          </View>

          <View style={styles.voiceActionRow}>
            <TouchableOpacity
              style={[
                styles.voiceToggleBtn,
                voiceAutoPlay ? styles.voiceToggleActive : styles.voiceToggleInactive,
              ]}
              onPress={toggleVoiceAutoPlay}
              activeOpacity={0.8}
            >
              <Ionicons
                name={voiceAutoPlay ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={voiceAutoPlay ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.voiceToggleText, voiceAutoPlay && { color: '#FFFFFF' }]}>
                {voiceAutoPlay ? t('voiceOn') : t('voiceOff')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voiceTestBtn}
              onPress={handleTestVoice}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.voiceTestText}>
                {t('testVoice')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History Section */}
        <Text style={styles.sectionHeader}>{t('dealHistory')}</Text>
        {transactions.length > 0 ? (
          transactions.map((tx, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.txCard, SHADOWS.small]}
              onPress={() => {
                setSelectedTx(tx);
                setTxModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.txHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txCrop}>{tx.wasteType} ({tx.quantity} {tx.unit})</Text>
                  <Text style={styles.txCounterpart}>
                    {role === 'farmer'
                      ? `${t('buyerLabel')}: ${tx.buyerId?.name || (language === 'te' ? 'కొనుగోలుదారు' : language === 'hi' ? 'खरीदार' : 'Buyer')}`
                      : `${t('farmerLabel')}: ${tx.farmerId?.name || (language === 'te' ? 'రైతు' : language === 'hi' ? 'किसान' : 'Farmer')}`}
                  </Text>
                </View>
                <StatusBadge status={tx.status} />
              </View>

              <View style={styles.txRateRow}>
                <Text style={styles.txRate}>{t('rateLabel')}: ₹{tx.agreedPrice}/{tx.unit}</Text>
                <Text style={styles.txTotal}>{t('totalLabel')}: ₹{tx.totalAmount?.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={styles.txPickup}>🚛 {tx.pickupDetails}</Text>
              <Text style={styles.viewDealText}>{t('viewTransactionDetails')} ›</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noTxCard}>
            <Ionicons name="receipt-outline" size={32} color={COLORS.border} />
            <Text style={styles.noTxText}>{t('noTransactionsYet')}</Text>
            <Text style={styles.noTxSub}>{t('noTransactionsSub')}</Text>
          </View>
        )}

        {/* Quick Help & Support */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Support')}
        >
          <Ionicons name="help-buoy-outline" size={20} color={COLORS.primary} />
          <Text style={styles.menuItemText}>{t('fpoHelplineMenu')}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Market Insights */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MarketInsights')}
        >
          <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
          <Text style={styles.menuItemText}>{t('marketTrendsMenu')}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal
        visible={txModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTxModalVisible(false)}
      >
        <View style={styles.txModalOverlay}>
          <View style={styles.txModalCard}>
            <View style={styles.txModalHeader}>
              <Text style={styles.txModalTitle}>{t('dealSummary')}</Text>
              <TouchableOpacity onPress={() => setTxModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                <View style={styles.txModalTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txModalCropTitle}>
                      {selectedTx.wasteType}
                    </Text>
                    <Text style={styles.txModalLocationText}>
                      {selectedTx.quantity} {selectedTx.unit} • ₹{selectedTx.agreedPrice}/{selectedTx.unit}
                    </Text>
                  </View>
                  <StatusBadge status={selectedTx.status} />
                </View>

                {/* Rates & Quantity */}
                <View style={styles.matrixBox}>
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('rateLabel')}</Text>
                    <Text style={styles.matrixVal}>₹{selectedTx.agreedPrice}/{selectedTx.unit}</Text>
                  </View>
                  <View style={styles.matrixDivider} />
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('quantityLabel')}</Text>
                    <Text style={styles.matrixVal}>{selectedTx.quantity} {selectedTx.unit}</Text>
                  </View>
                  <View style={styles.matrixDivider} />
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('totalLabel')}</Text>
                    <Text style={[styles.matrixVal, { color: COLORS.primaryDark }]}>
                      ₹{(selectedTx.totalAmount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Counterpart Contact Card */}
                <View style={styles.contactCard}>
                  <Text style={styles.contactCardHeading}>
                    {role === 'buyer' ? t('sellerContactLabel') : t('buyerContactLabel')}
                  </Text>
                  {(() => {
                    const counterpart = role === 'buyer'
                      ? selectedTx.farmerId
                      : selectedTx.buyerId;
                    const name = counterpart?.name || (role === 'buyer' ? 'Verified Farmer' : 'Verified Buyer');
                    const phone = counterpart?.phone;
                    const loc = [counterpart?.location?.village, counterpart?.location?.district].filter(Boolean).join(', ') || '';

                    return (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.contactName}>👤 {name} {loc ? `📍 (${loc})` : ''}</Text>
                        {phone ? (
                          <TouchableOpacity
                            style={styles.callBtn}
                            onPress={() => Linking.openURL(`tel:${phone}`)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.callBtnText}>
                              {role === 'buyer' ? t('callSellerBtn') : t('callBuyerBtn')} (+91 {phone})
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })()}
                </View>

                {/* Logistics */}
                {selectedTx.pickupDetails ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailBoxLabel}>{t('pickupLabel')}:</Text>
                    <Text style={styles.detailBoxVal}>{selectedTx.pickupDetails}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out" size={32} color={COLORS.error} />
            </View>

            <Text style={styles.modalTitle}>{t('logoutConfirmTitle')}</Text>
            <Text style={styles.modalMessage}>
              {t('logoutConfirmMsg')}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalConfirmText}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHero: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  userPhone: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 6,
  },
  langGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  langCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  langCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primary,
  },
  langTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  langTitleActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  langSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  langSubActive: {
    color: COLORS.primary,
  },
  voiceSettingsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  voiceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  voiceCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  voiceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  voiceToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  voiceToggleActive: {
    backgroundColor: COLORS.primary,
  },
  voiceToggleInactive: {
    backgroundColor: '#F1F5F9',
  },
  voiceToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  voiceTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  voiceTestText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  txCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txCrop: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  txCounterpart: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txRate: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  txTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  txPickup: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  noTxCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noTxText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  noTxSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  menuItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.error,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: COLORS.error,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewDealText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 6,
    textAlign: 'right',
  },
  txModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  txModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  txModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  txModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  txModalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  txModalCropTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  txModalLocationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  matrixBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matrixItem: {
    flex: 1,
    alignItems: 'center',
  },
  matrixDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  matrixLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  matrixVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  detailBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailBoxVal: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  contactCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  contactCardHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
