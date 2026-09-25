import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../services/api';

export const NotificationsScreen = ({ navigation }) => {
  const { user, role, language, t } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modals
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [updatingOffer, setUpdatingOffer] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [txModalVisible, setTxModalVisible] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.notifications.getAll();
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.warn('Notifications fetch warning:', err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const extractIds = (item) => {
    const listingId =
      item.listingId ||
      item.relatedListingId?._id ||
      (typeof item.relatedListingId === 'string' ? item.relatedListingId : null);

    const offerId =
      item.offerId ||
      item.relatedOfferId?._id ||
      (typeof item.relatedOfferId === 'string' ? item.relatedOfferId : null);

    const transactionId =
      item.transactionId ||
      item.relatedTransactionId?._id ||
      (typeof item.relatedTransactionId === 'string' ? item.relatedTransactionId : null);

    return { listingId, offerId, transactionId };
  };

  // Click notification to open live details
  const handleNotificationPress = async (item) => {
    if (!item.read) {
      handleMarkAsRead(item._id);
    }

    const { listingId, offerId, transactionId } = extractIds(item);
    const userRole = role || user?.role;

    switch (item.type) {
      case 'offer_received':
        if (listingId) {
          navigation.navigate('PriceComparison', { listingId, offerId });
        } else if (offerId) {
          navigation.navigate('PriceComparison', { offerId });
        } else {
          navigation.navigate('MyListings');
        }
        break;

      case 'offer_accepted':
        if (userRole === 'buyer') {
          navigation.navigate('MyOffers', {
            offerId,
            statusFilter: 'accepted',
          });
        } else {
          if (transactionId) {
            navigation.navigate('Profile', { transactionId });
          } else if (listingId) {
            navigation.navigate('PriceComparison', { listingId, offerId });
          } else {
            navigation.navigate('Profile');
          }
        }
        break;

      case 'offer_rejected':
        if (userRole === 'buyer') {
          navigation.navigate('MyOffers', {
            offerId,
            statusFilter: 'rejected',
          });
        } else {
          navigation.navigate('PriceComparison', { listingId });
        }
        break;

      case 'buyer_selected':
      case 'transaction_update':
      case 'pickup_update':
        if (transactionId) {
          navigation.navigate('Profile', { transactionId });
        } else {
          navigation.navigate('Profile');
        }
        break;

      case 'new_listing':
        if (userRole === 'buyer') {
          if (listingId) {
            navigation.navigate('BrowseListings', { listingId });
          } else {
            navigation.navigate('BrowseListings');
          }
        } else {
          if (listingId) {
            navigation.navigate('PriceComparison', { listingId });
          } else {
            navigation.navigate('MyListings');
          }
        }
        break;

      case 'new_requirement':
        navigation.navigate('NearbyBuyers', {
          wasteType: item.relatedListingId?.wasteType || 'All',
        });
        break;

      case 'fpo':
        navigation.navigate('Support', { initialTab: 'fpo' });
        break;

      case 'message':
        navigation.navigate('AIAssistant');
        break;

      default:
        // Entity-based fallback
        if (transactionId) {
          navigation.navigate('Profile', { transactionId });
        } else if (offerId) {
          if (userRole === 'buyer') {
            navigation.navigate('MyOffers', { offerId });
          } else {
            navigation.navigate('PriceComparison', { listingId, offerId });
          }
        } else if (listingId) {
          if (userRole === 'buyer') {
            navigation.navigate('BrowseListings', { listingId });
          } else {
            navigation.navigate('PriceComparison', { listingId });
          }
        }
        break;
    }
  };

  const handleUpdateOfferStatus = async (offerId, newStatus) => {
    try {
      setUpdatingOffer(true);
      const res = await api.offers.updateStatus(offerId, newStatus);
      if (res.success) {
        Alert.alert(
          newStatus === 'accepted' ? (t('offerAcceptedSuccess') || 'Offer Accepted!') : (t('offerDeclinedSuccess') || 'Offer Declined'),
          newStatus === 'accepted'
            ? (t('dealConfirmedSub') || 'Deal confirmed! You can now contact the buyer directly.')
            : ''
        );
        setOfferModalVisible(false);
        fetchNotifications();
      }
    } catch (err) {
      Alert.alert(t('error') || 'Error', err.message || 'Could not update offer.');
    } finally {
      setUpdatingOffer(false);
    }
  };

  // Get localized title and message according to user language
  const getLocalizedContent = (item) => {
    const offer = item.relatedOfferId;
    const crop = offer?.listingId?.wasteType || item.relatedListingId?.wasteType || 'Crop Residue';
    const price = offer?.offeredPrice || '';
    const unit = offer?.unit || 'ton';
    const qty = offer?.quantity || '';
    const buyerName = offer?.buyerId?.name || (language === 'te' ? 'కొనుగోలుదారు' : language === 'hi' ? 'खरीदार' : 'Buyer');
    const sellerName = offer?.listingId?.farmerId?.name || (language === 'te' ? 'రైతు' : language === 'hi' ? 'किसान' : 'Farmer');

    switch (item.type) {
      case 'offer_received':
        return {
          title: language === 'te' ? 'కొత్త కొనుగోలు ఆఫర్ వచ్చింది 🏷️' : language === 'hi' ? 'नया खरीदार ऑफ़र प्राप्त हुआ 🏷️' : 'New Buyer Offer Received 🏷️',
          message:
            language === 'te'
              ? `${buyerName} గారు ${qty} ${unit} ${crop} కోసం ₹${price}/${unit} ఆఫర్ చేశారు.`
              : language === 'hi'
              ? `${buyerName} ने ${qty} ${unit} ${crop} के लिए ₹${price}/${unit} का प्रस्ताव दिया है।`
              : `${buyerName} offered ₹${price}/${unit} for ${qty} ${unit} of ${crop}.`,
        };
      case 'offer_accepted':
        return {
          title: language === 'te' ? 'ఆఫర్ ఆమోదించబడింది! 🎉' : language === 'hi' ? 'ऑफ़र स्वीकार कर लिया गया! 🎉' : 'Offer Accepted! 🎉',
          message:
            language === 'te'
              ? `మీ ₹${price}/${unit} (${qty} ${unit}) ${crop} ఆఫర్‌ను రైతు ఆమోదించారు. రవాణా కోసం రైతును సంప్రదించండి.`
              : language === 'hi'
              ? `आपका ₹${price}/${unit} (${qty} ${unit}) ${crop} का ऑफ़र किसान द्वारा स्वीकार किया गया। संपर्क करें।`
              : `Your offer of ₹${price}/${unit} for ${qty} ${unit} was accepted by the farmer. Contact seller for pickup.`,
        };
      case 'offer_rejected':
        return {
          title: language === 'te' ? 'ఆఫర్ తిరస్కరించబడింది' : language === 'hi' ? 'ऑफ़र अस्वीकृत' : 'Offer Declined',
          message:
            language === 'te'
              ? `${crop} కోసం మీ ఆఫర్ రైతు ద్వారా తిరస్కరించబడింది.`
              : language === 'hi'
              ? `${crop} के लिए आपका ऑफ़र अस्वीकार कर दिया गया।`
              : `Your offer for ${crop} was declined by the farmer.`,
        };
      case 'buyer_selected':
        return {
          title: language === 'te' ? 'డీల్ నిర్ధారించబడింది! 🎉' : language === 'hi' ? 'सौदा पक्का! 🎉' : 'Deal Confirmed! 🎉',
          message:
            language === 'te'
              ? `${sellerName} గారు మీ ఆఫర్‌ను ఎంచుకున్నారు. రవాణా కోసం రైతును సంప్రదించండి.`
              : language === 'hi'
              ? `${sellerName} ने आपका सौदा चुना। संपर्क करें।`
              : `${sellerName} confirmed your deal. Please coordinate pickup.`,
        };
      case 'transaction_update':
        return {
          title: language === 'te' ? 'లావాదేవీ సమాచారం' : language === 'hi' ? 'लेनदेन अपडेट' : 'Transaction Update',
          message: item.message,
        };
      case 'new_listing':
        return {
          title: language === 'te' ? 'కొత్త పంట వ్యర్థాలు అందుబాటులో ఉన్నాయి 🌾' : language === 'hi' ? 'नया फसल अवशेष उपलब्ध 🌾' : 'New Crop Residue Available 🌾',
          message: item.message,
        };
      case 'new_requirement':
        return {
          title: language === 'te' ? 'కొత్త కొనుగోలుదారు అవసరం 📦' : language === 'hi' ? 'नई खरीदार आवश्यकता 📦' : 'New Buyer Requirement 📦',
          message: item.message,
        };
      case 'fpo':
        return {
          title: language === 'te' ? 'FPO సమాచారం 👥' : language === 'hi' ? 'FPO अपडेट 👥' : 'FPO Update 👥',
          message: item.message,
        };
      case 'message':
        return {
          title: language === 'te' ? 'AI సహాయకుడు సందేశం 🤖' : language === 'hi' ? 'AI सहायक संदेश 🤖' : 'AI Assistant Message 🤖',
          message: item.message,
        };
      default:
        return {
          title: item.title,
          message: item.message,
        };
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'offer_received':
        return { name: 'pricetag', color: COLORS.accent };
      case 'offer_accepted':
      case 'buyer_selected':
        return { name: 'checkmark-circle', color: '#16A34A' };
      case 'offer_rejected':
        return { name: 'close-circle', color: '#DC2626' };
      case 'pickup_update':
        return { name: 'car', color: '#0288D1' };
      case 'new_listing':
        return { name: 'leaf', color: '#2E7D32' };
      case 'new_requirement':
        return { name: 'briefcase', color: '#E65100' };
      case 'fpo':
        return { name: 'people', color: '#1565C0' };
      case 'message':
        return { name: 'chatbubble-ellipses', color: '#7C3AED' };
      default:
        return { name: 'notifications', color: COLORS.primary };
    }
  };

  const renderItem = ({ item }) => {
    const iconData = getIconForType(item.type);
    const content = getLocalizedContent(item);
    const isActionable = Boolean(
      item.listingId ||
      item.offerId ||
      item.transactionId ||
      item.relatedListingId ||
      item.relatedOfferId ||
      item.relatedTransactionId ||
      item.targetScreen
    );

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread, SHADOWS.small]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${iconData.color}15` }]}>
          <Ionicons name={iconData.name} size={22} color={iconData.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.cardTop}>
            <Text style={[styles.title, !item.read && styles.titleBold]}>
              {content.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message}>{content.message}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {isActionable && (
              <Text style={styles.tapToViewText}>{t('viewDetails') || 'View Details ›'}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('notificationsTitle')}
        subtitle={t('liveAlerts')}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="notifications"
        rightAction={
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>{t('markAllRead')}</Text>
          </TouchableOpacity>
        }
      />

      {/* Multilingual Voice Guidance */}
      <VoiceGuideBar screenKey="notifications" />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, filter === 'all' && styles.tabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
            {t('allTab')} ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filter === 'unread' && styles.tabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}>
            {t('unreadTab')} ({notifications.filter((n) => !n.read).length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifs}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={54} color={COLORS.border} />
              <Text style={styles.emptyText}>{t('noNotifsYet')}</Text>
              <Text style={styles.emptySubText}>
                {t('noNotifsSub')}
              </Text>
            </View>
          }
        />
      )}

      {/* Offer Details Modal */}
      <Modal
        visible={offerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('offerDetailsTitle')}</Text>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedOffer && (
              <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                {/* Crop & Status */}
                <View style={styles.modalInfoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalCropTitle}>
                      {selectedOffer.listingId?.wasteType || 'Crop Residue'}
                    </Text>
                    <Text style={styles.modalLocationText}>
                      📍 {[selectedOffer.listingId?.location?.village, selectedOffer.listingId?.location?.district].filter(Boolean).join(', ') || ''}
                    </Text>
                  </View>
                  <StatusBadge status={selectedOffer.status} />
                </View>

                {/* Price & Quantity Grid */}
                <View style={styles.matrixBox}>
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('offeredRateLabel')}</Text>
                    <Text style={styles.matrixVal}>₹{selectedOffer.offeredPrice}/{selectedOffer.unit || 'ton'}</Text>
                  </View>
                  <View style={styles.matrixDivider} />
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('quantityLabel')}</Text>
                    <Text style={styles.matrixVal}>{selectedOffer.quantity} {selectedOffer.unit || 'ton'}</Text>
                  </View>
                  <View style={styles.matrixDivider} />
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('totalValueLabel')}</Text>
                    <Text style={[styles.matrixVal, { color: COLORS.primaryDark }]}>
                      ₹{((selectedOffer.offeredPrice || 0) * (selectedOffer.quantity || 1)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Logistics Info */}
                {selectedOffer.pickupDetails ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailBoxLabel}>{t('pickupPlanLabel')}:</Text>
                    <Text style={styles.detailBoxVal}>{selectedOffer.pickupDetails}</Text>
                  </View>
                ) : null}

                {/* Contact Card (ONLY if status === 'accepted') */}
                {selectedOffer.status === 'accepted' ? (
                  <View style={styles.contactCard}>
                    <Text style={styles.contactCardHeading}>
                      {role === 'buyer' ? t('sellerContactLabel') : t('buyerContactLabel')}
                    </Text>
                    {(() => {
                      const counterpart = role === 'buyer'
                        ? selectedOffer.listingId?.farmerId
                        : selectedOffer.buyerId;
                      const name = counterpart?.name || (role === 'buyer' ? t('roleFarmer') : t('roleBuyer'));
                      const phone = counterpart?.phone;
                      const loc = counterpart?.location?.district || counterpart?.location?.village || '';

                      return (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.contactName}>👤 {name} {loc ? `(${loc})` : ''}</Text>
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
                          ) : (
                            <Text style={styles.noPhoneText}>
                              {t('dealConfirmedSub')}
                            </Text>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                ) : (
                  <View style={styles.privacyNotice}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.privacyNoticeText}>{t('contactHiddenUntilAccepted')}</Text>
                  </View>
                )}

                {/* Farmer Accept/Decline Actions for Pending Offer */}
                {role === 'farmer' && selectedOffer.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnDecline]}
                      onPress={() => handleUpdateOfferStatus(selectedOffer._id, 'rejected')}
                      disabled={updatingOffer}
                    >
                      <Text style={styles.btnDeclineText}>{t('rejectOfferBtn')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnAccept]}
                      onPress={() => handleUpdateOfferStatus(selectedOffer._id, 'accepted')}
                      disabled={updatingOffer}
                    >
                      {updatingOffer ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.btnAcceptText}>{t('acceptOfferBtn')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        visible={txModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTxModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dealSummary')}</Text>
              <TouchableOpacity onPress={() => setTxModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                <View style={styles.modalInfoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalCropTitle}>
                      {selectedTransaction.wasteType}
                    </Text>
                    <Text style={styles.modalLocationText}>
                      {selectedTransaction.quantity} {selectedTransaction.unit} • ₹{selectedTransaction.agreedPrice}/{selectedTransaction.unit}
                    </Text>
                  </View>
                  <StatusBadge status={selectedTransaction.status} />
                </View>

                <View style={styles.matrixBox}>
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('rateLabel')}</Text>
                    <Text style={styles.matrixVal}>₹{selectedTransaction.agreedPrice}/{selectedTransaction.unit}</Text>
                  </View>
                  <View style={styles.matrixDivider} />
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('quantityLabel')}</Text>
                    <Text style={styles.matrixVal}>{selectedTransaction.quantity} {selectedTransaction.unit}</Text>
                  </View>
                  <View style={styles.matrixDivider} />
                  <View style={styles.matrixItem}>
                    <Text style={styles.matrixLabel}>{t('totalLabel')}</Text>
                    <Text style={[styles.matrixVal, { color: COLORS.primaryDark }]}>
                      ₹{(selectedTransaction.totalAmount || 0).toLocaleString('en-IN')}
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
                      ? selectedTransaction.farmerId
                      : selectedTransaction.buyerId;
                    const name = counterpart?.name || (role === 'buyer' ? t('roleFarmer') : t('roleBuyer'));
                    const phone = counterpart?.phone;
                    const loc = counterpart?.location?.district || counterpart?.location?.village || '';

                    return (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.contactName}>👤 {name} {loc ? `(${loc})` : ''}</Text>
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
                {selectedTransaction.pickupDetails ? (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailBoxLabel}>{t('pickupLabel')}:</Text>
                    <Text style={styles.detailBoxVal}>{selectedTransaction.pickupDetails}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  markAllText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardUnread: {
    backgroundColor: '#F7FCF7',
    borderColor: '#C8E6C9',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    color: COLORS.text,
    flex: 1,
  },
  titleBold: {
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: 6,
  },
  message: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 4,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  tapToViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalCropTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalLocationText: {
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
  noPhoneText: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 4,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  privacyNoticeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDecline: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnDeclineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnAccept: {
    backgroundColor: '#16A34A',
  },
  btnAcceptText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
