import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export const StatusBadge = ({ status }) => {
  const { t } = useAuth();
  const norm = (status || 'active').toLowerCase();

  let bg = '#E8F5E9';
  let textColor = COLORS.success;
  let label = status;

  if (norm.includes('pending')) {
    bg = '#FFF3E0';
    textColor = COLORS.statusPending;
    label = t('statusPending') || status;
  } else if (norm.includes('sold')) {
    bg = '#E8F5E9';
    textColor = COLORS.statusCompleted;
    label = t('statusSold') || status;
  } else if (norm.includes('accepted')) {
    bg = '#E8F5E9';
    textColor = COLORS.statusCompleted;
    label = t('statusAccepted') || status;
  } else if (norm.includes('reject')) {
    bg = '#FFEBEE';
    textColor = COLORS.statusCancelled;
    label = t('statusRejected') || status;
  } else if (norm.includes('cancel')) {
    bg = '#FFEBEE';
    textColor = COLORS.statusCancelled;
    label = t('statusCancelled') || status;
  } else if (norm.includes('confirm') || norm.includes('scheduled')) {
    bg = '#E3F2FD';
    textColor = COLORS.statusConfirmed;
    label = t('txStatusConfirmed') || status;
  } else if (norm.includes('complete')) {
    bg = '#E8F5E9';
    textColor = COLORS.statusCompleted;
    label = t('statusCompleted') || status;
  } else if (norm.includes('active') || norm.includes('avail')) {
    bg = '#E8F5E9';
    textColor = COLORS.success;
    label = t('statusAvailable') || status;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
