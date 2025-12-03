/**
 * Transaction History Screen
 * Shows all transactions (buys/sells) for a specific stock
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2196f3',
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
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  transactionItemBuy: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  transactionItemSell: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTypeBuy: {
    color: '#4caf50',
  },
  transactionTypeSell: {
    color: '#f44336',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 12,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#f44336',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
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
});

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { symbol } = useLocalSearchParams();
  const { stocks, getTransactionsBySymbol, deleteTransaction, addTransaction } = usePortfolio();
  const { language } = useLanguage();

  const transactions = getTransactionsBySymbol(symbol as string);
  const currentStock = stocks.find((s) => s.symbol === symbol);
  const currentPrice = currentStock?.currentPrice || 0;

  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const [notes, setNotes] = useState('');

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

  const handleDelete = (transactionId: string) => {
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

  const formatCurrency = (value: number): string => {
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decimalPart = parts[1];
    return `${integerPart},${decimalPart}`;
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top / 2 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{symbol} - {t('transaction.title', language)}</Text>
      </View>

      {/* Transaction List */}
      {sortedTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('transaction.noTransactions', language)}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <View
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
                  {t(`transaction.${item.type.toLowerCase()}`, language).toUpperCase()} {item.quantity} @ {formatCurrency(item.price)}
                </Text>
                <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                {item.notes && (
                  <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    {item.notes}
                  </Text>
                )}
              </View>
              <Text style={styles.transactionValue}>
                {formatCurrency(item.quantity * item.price)}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { bottom: 20 + insets.bottom }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

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
