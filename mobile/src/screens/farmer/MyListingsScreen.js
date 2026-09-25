import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { VoiceGuideBar } from '../../components/VoiceGuideBar';
import { StatusBadge } from '../../components/StatusBadge';
import { api } from '../../services/api';

export const MyListingsScreen = ({ navigation }) => {
  const { user, t } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await api.listings.getMy();
      if (res.success && Array.isArray(res.listings)) {
        setListings(res.listings);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.warn('Error fetching listings:', err.message);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyListings();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, SHADOWS.small]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.wasteType}>{item.wasteType}</Text>
          <Text style={styles.locationText}>
            📍 {item.location?.village || 'Farm Field'}, {item.location?.district || 'Warangal'}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('quantity')}</Text>
          <Text style={styles.statVal}>
            {item.quantity} {item.unit}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('expectedRate')}</Text>
          <Text style={styles.statVal}>
            {item.expectedPrice ? `₹${item.expectedPrice}/${item.unit}` : t('openOffer')}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('estTotalValue')}</Text>
          <Text style={[styles.statVal, { color: COLORS.primary }]}>
            ₹{(item.quantity * (item.expectedPrice || 2400)).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() =>
            navigation.navigate('PriceComparison', {
              listingId: item._id,
              wasteType: item.wasteType,
            })
          }
        >
          <Ionicons name="swap-vertical" size={16} color={COLORS.accent} style={{ marginRight: 4 }} />
          <Text style={styles.btnSecondaryText}>{t('comparePricesBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() =>
            navigation.navigate('BuyerMatching', {
              listingId: item._id,
              wasteType: item.wasteType,
              quantity: item.quantity,
              unit: item.unit,
            })
          }
        >
          <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.btnPrimaryText}>{t('recommendedBuyersBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('myListings')}
        subtitle={t('myListingsDesc')}
        showBack
        onBack={() => navigation.goBack()}
        voiceScreenKey="myListings"
      />

      {/* Global Voice Guidance Bar */}
      <VoiceGuideBar screenKey="myListings" />

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('loadingListings')}</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="leaf-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyTitle}>{t('noListings')}</Text>
              <Text style={styles.emptyDesc}>
                {t('noListingsDesc')}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate('ListWaste')}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>{t('sellWasteNow')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, SHADOWS.medium]}
        onPress={() => navigation.navigate('ListWaste')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
        <Text style={styles.fabText}>{t('addListing')}</Text>
      </TouchableOpacity>
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
    paddingBottom: 90,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wasteType: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  btnPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    marginLeft: 6,
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
  emptyActionBtn: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
