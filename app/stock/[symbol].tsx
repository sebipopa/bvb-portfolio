/**
 * Stock Detail Screen
 * Shows detailed information for a specific stock
 *
 * Displays:
 * - Stock symbol
 * - Number of shares
 * - Average buy price
 * - Current price
 * - Total value
 * - Gain/loss value and percentage
 * - Placeholder for chart (future feature)
 *
 * Uses dynamic route: /stock/[symbol]
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePortfolio } from '@/src/hooks/usePortfolio';
import { useLanguage } from '@/src/context/LanguageContext';
import { t } from '@/src/i18n';
import { Transaction } from '@/src/types/Stock';
import { getCachedTimestamp, clearPriceCache } from '@/src/services/bvbApi';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricRowLast: {
    borderBottomWidth: 0,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  metricValueSmall: {
    fontSize: 14,
    color: '#333',
  },
  gainLossSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  gainLossSectionLoss: {
    borderLeftColor: '#f44336',
  },
  gainLossTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  gainLossValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  gainLossValueLoss: {
    color: '#f44336',
  },
  gainLossPercentage: {
    fontSize: 14,
    color: '#666',
  },
  chartPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  transactionItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  transactionItemBuy: {
    borderLeftColor: '#4caf50',
  },
  transactionItemSell: {
    borderLeftColor: '#f44336',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionTypeBuy: {
    color: '#4caf50',
  },
  transactionTypeSell: {
    color: '#f44336',
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
  },
  transactionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#f44336',
  },
  addTransactionButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#2196f3',
    borderRadius: 6,
    alignItems: 'center',
  },
  addTransactionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  transactionSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyTransactionsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonBuy: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8f5',
  },
  typeButtonSell: {
    borderColor: '#f44336',
    backgroundColor: '#fef5f5',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeButtonTextBuy: {
    color: '#4caf50',
  },
  typeButtonTextSell: {
    color: '#f44336',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196f3',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  deleteStockButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f44336',
    alignItems: 'center',
    marginTop: 8,
  },
  deleteStockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default function StockDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { symbol } = useLocalSearchParams();
  const { stocks, loading, getTransactionsBySymbol, deleteTransaction, addTransaction, refresh, deleteStock } = usePortfolio();
  const { language } = useLanguage();

  // Find the stock in the portfolio
  const stock = stocks.find((s) => s.symbol === symbol);
  const transactions = getTransactionsBySymbol(symbol as string);
  const currentPrice = stock?.currentPrice || 0;
  const cachedTimestamp = getCachedTimestamp(symbol as string);

  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const [notes, setNotes] = useState('');

  // Redirect to main page if stock not found (no transactions)
  useEffect(() => {
    if (!stock && !loading) {
      router.replace('/');
    }
  }, [stock, loading, router]);

  const handleBack = () => {
    router.back();
  };

  const handleAddTransaction = async () => {
    if (!quantity || !price) {
      Alert.alert('Error', 'Please enter quantity and price');
      return;
    }

    try {
      const qty = parseFloat(quantity);
      const priceVal = parseFloat(price);

      if (qty <= 0 || priceVal <= 0) {
        Alert.alert('Error', 'Quantity and price must be greater than 0');
        return;
      }

      await addTransaction(symbol as string, transactionType, qty, priceVal, notes || undefined);

      // Reset form
      setQuantity('');
      setPrice(currentPrice.toString());
      setNotes('');
      setTransactionType('BUY');
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    Alert.alert(
      t('transaction.delete', language) || 'Delete',
      t('transaction.areYouSure', language) || 'Are you sure?',
      [
        {
          text: t('transaction.cancel', language) || 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: t('transaction.delete', language) || 'Delete',
          onPress: async () => {
            try {
              await deleteTransaction(transactionId);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      language === 'ro' ? 'Reîmprospătează prețul' : 'Refresh Price',
      language === 'ro'
        ? 'Șterge cache-ul și actualizează prețul de pe BVB?'
        : 'Clear cache and fetch fresh price from BVB?',
      [
        {
          text: t('transaction.cancel', language) || 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'ro' ? 'Actualizează' : 'Refresh',
          onPress: async () => {
            try {
              clearPriceCache(symbol as string);
              await refresh();
            } catch (err) {
              Alert.alert('Error', 'Failed to refresh price');
            }
          },
        },
      ]
    );
  };

  const handleDeleteStock = () => {
    Alert.alert(
      language === 'ro' ? 'Șterge holding' : 'Delete Holding',
      language === 'ro'
        ? `Ești sigur că vrei să ștergi ${symbol} și toate tranzacțiile asociate?`
        : `Are you sure you want to delete ${symbol} and all its transactions?`,
      [
        {
          text: language === 'ro' ? 'Anulează' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'ro' ? 'Șterge' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStock(symbol as string);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete stock');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number, includeRon: boolean = true): string => {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1];
    const formatted = `${integerPart},${decimalPart}`;
    return includeRon ? `${formatted} RON` : formatted;
  };

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedTransactions = [...transactions].sort((a, b) => b.date - a.date);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{symbol}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196f3" />
        </View>
      </View>
    );
  }

  if (!stock) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{symbol}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Stock not found</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { justifyContent: 'space-between' }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={{ fontSize: 24, color: '#2196f3' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#000' }}>
          {stock.symbol}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Total Value Section - Top */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('stock.totalValue', language)}</Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000', marginBottom: 8 }}>
            {formatCurrency(stock.totalValue)}
          </Text>
          <Text
            style={[
              { fontSize: 18, fontWeight: '600', marginBottom: 16 },
              stock.gainLossValue >= 0 ? { color: '#4caf50' } : { color: '#f44336' },
            ]}
          >
            {formatCurrency(stock.gainLossValue)} ({formatPercentage(stock.gainLossPercentage)})
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {stock.shares} {language === 'ro' ? 'acțiuni' : 'shares'} | {formatCurrency(stock.currentPrice)}
          </Text>
          {cachedTimestamp && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <Text style={{ fontSize: 11, color: '#999' }}>
                {language === 'ro' ? 'Preț preluat: ' : 'Price fetched: '}
                {formatDate(cachedTimestamp)}
              </Text>
              <TouchableOpacity onPress={handleClearCache}>
                <Text style={{ fontSize: 11, color: '#2196f3', fontWeight: '600' }}>
                  {language === 'ro' ? '↻ Reîmprospătează' : '↻ Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Summary Card - Merged Position, Price, and Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('stock.summary', language)}</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('stock.shares', language)}</Text>
            <Text style={styles.metricValue}>{stock.shares}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('stock.avgBuyPrice', language)}</Text>
            <Text style={styles.metricValue}>{formatCurrency(stock.avgBuyPrice)}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('stock.currentPrice', language)}</Text>
            <Text style={styles.metricValue}>{formatCurrency(stock.currentPrice)}</Text>
          </View>

          <View style={[styles.metricRow, styles.metricRowLast]}>
            <Text style={styles.metricLabel}>{t('stock.investment', language)}</Text>
            <Text style={styles.metricValue}>
              {formatCurrency(stock.shares * stock.avgBuyPrice)}
            </Text>
          </View>
        </View>

        {/* Transactions Section - Replaces Chart */}
        <View style={styles.section}>
          <Text style={styles.transactionSectionTitle}>{t('transaction.title', language)}</Text>

          {sortedTransactions.length === 0 ? (
            <Text style={styles.emptyTransactionsText}>{t('transaction.noTransactions', language)}</Text>
          ) : (
            <>
              {sortedTransactions.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.transactionItem,
                    item.type === 'BUY' ? styles.transactionItemBuy : styles.transactionItemSell,
                  ]}
                >
                  <View style={styles.transactionInfo}>
                    <Text
                      style={[
                        styles.transactionType,
                        item.type === 'BUY'
                          ? styles.transactionTypeBuy
                          : styles.transactionTypeSell,
                      ]}
                    >
                      {t(`transaction.${item.type.toLowerCase()}`, language).toUpperCase()} {item.quantity} @ {formatCurrency(item.price, false)}
                    </Text>
                    <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                    {item.notes && (
                      <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                        {item.notes}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.transactionValue}>
                    {formatCurrency(item.quantity * item.price, false)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTransaction(item.id)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            style={styles.addTransactionButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addTransactionButtonText}>+ {t('transaction.addTransaction', language)}</Text>
          </TouchableOpacity>
        </View>

        {/* Delete Stock Button */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <TouchableOpacity
            style={styles.deleteStockButton}
            onPress={handleDeleteStock}
          >
            <Text style={styles.deleteStockButtonText}>
              {language === 'ro' ? 'Șterge holding și toate tranzacțiile' : 'Delete holding and all transactions'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('transaction.addTransaction', language)}</Text>

              {/* Transaction Type Selector */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'BUY' && styles.typeButtonBuy,
                    transactionType === 'SELL' && { borderColor: '#ddd', backgroundColor: '#fff' },
                  ]}
                  onPress={() => setTransactionType('BUY')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'BUY' && styles.typeButtonTextBuy,
                      transactionType === 'SELL' && { color: '#666' },
                    ]}
                  >
                    {t('transaction.buy', language)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'SELL' && styles.typeButtonSell,
                    transactionType === 'BUY' && { borderColor: '#ddd', backgroundColor: '#fff' },
                  ]}
                  onPress={() => setTransactionType('SELL')}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      transactionType === 'SELL' && styles.typeButtonTextSell,
                      transactionType === 'BUY' && { color: '#666' },
                    ]}
                  >
                    {t('transaction.sell', language)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quantity Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('transaction.quantity', language)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('transaction.quantityPlaceholder', language)}
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Price Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('transaction.pricePerShare', language)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('transaction.pricePlaceholder', language)}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('transaction.notes', language)}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('transaction.notesPlaceholder', language)}
                  value={notes}
                  onChangeText={setNotes}
                  placeholderTextColor="#999"
                  multiline
                />
              </View>

              {/* Buttons */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('transaction.cancel', language)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddTransaction}
                >
                  <Text style={styles.submitButtonText}>{t('transaction.add', language)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
