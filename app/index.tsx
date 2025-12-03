/**
 * Portfolio List Screen
 * Main screen showing all stocks in the portfolio
 *
 * Displays:
 * - Portfolio summary (total value, total gain/loss)
 * - List of stocks with:
 *   - Ticker symbol
 *   - Current price
 *   - Gain/loss (color-coded: red for negative, green for positive)
 * - Touchable items to navigate to detail screen
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePortfolio } from '@/src/hooks/usePortfolio';
import { useLanguage } from '@/src/context/LanguageContext';
import { t } from '@/src/i18n';
import { LanguageKey, StockMetrics } from '@/src/types/Stock';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { saveCustomSortOrder, loadCustomSortOrder } from '@/src/services/sortOrderService';
import { addMockTransactions } from '@/src/services/mockDataService';

type SortOption = 'value-desc' | 'name-asc' | 'custom';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  summaryValueGain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  summaryValueLoss: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  stockItem: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  stockItemGain: {
    borderLeftColor: '#4caf50',
  },
  stockItemLoss: {
    borderLeftColor: '#f44336',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  gainLossText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  gainText: {
    color: '#4caf50',
  },
  lossText: {
    color: '#f44336',
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  sortButtonActive: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  sortOption: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  languageButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  languageButtonTextActive: {
    color: '#2196f3',
  },
  addHoldingButton: {
    marginHorizontal: 12,
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2196f3',
    borderRadius: 6,
    alignItems: 'center',
  },
  addHoldingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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

export default function PortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stocks, summary, loading, error, refresh, addTransaction } = usePortfolio();
  const { language, setLanguage } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);
  const [sortOption, setSortOption] = React.useState<SortOption>('value-desc');
  const [customOrder, setCustomOrder] = React.useState<string[]>([]);

  // Add holding modal state
  const [modalVisible, setModalVisible] = React.useState(false);
  const [symbol, setSymbol] = React.useState('');
  const [transactionType, setTransactionType] = React.useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Load custom sort order on mount
  React.useEffect(() => {
    loadCustomSortOrder().then((order) => {
      if (order) {
        setCustomOrder(order);
      }
    });
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleLanguageSwitch = () => {
    setLanguage(language === 'ro' ? 'en' : 'ro');
  };

  const handleStockPress = (symbolValue: string) => {
    router.push(`/stock/${symbolValue}`);
  };

  const handleAddHolding = async () => {
    if (!symbol.trim() || !quantity || !price) {
      Alert.alert('Error', 'Please enter symbol, quantity, and price');
      return;
    }

    try {
      const qty = parseFloat(quantity);
      const priceVal = parseFloat(price);
      const symbolUpper = symbol.toUpperCase().trim();

      if (qty <= 0 || priceVal <= 0) {
        Alert.alert('Error', 'Quantity and price must be greater than 0');
        return;
      }

      await addTransaction(symbolUpper, transactionType, qty, priceVal, notes || undefined);

      // Reset form
      setSymbol('');
      setQuantity('');
      setPrice('');
      setNotes('');
      setTransactionType('BUY');
      setModalVisible(false);

      Alert.alert('Success', 'Holding added successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to add holding');
    }
  };

  const handleCloseModal = () => {
    setSymbol('');
    setQuantity('');
    setPrice('');
    setNotes('');
    setTransactionType('BUY');
    setModalVisible(false);
  };

  const handleLoadMockData = async () => {
    Alert.alert(
      language === 'ro' ? 'Încarcă date demo' : 'Load Demo Data',
      language === 'ro'
        ? 'Acest lucru va adăuga tranzacții demo în portofoliul tău. Continui?'
        : 'This will add demo transactions to your portfolio. Continue?',
      [
        {
          text: language === 'ro' ? 'Anulează' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'ro' ? 'Încarcă' : 'Load',
          onPress: async () => {
            try {
              setRefreshing(true);
              const count = await addMockTransactions();
              await refresh();
              setRefreshing(false);

              // Show success message after data is loaded
              setTimeout(() => {
                Alert.alert(
                  language === 'ro' ? 'Succes' : 'Success',
                  language === 'ro'
                    ? `${count} tranzacții demo au fost adăugate cu succes!\n\nPortofoliul tău a fost actualizat.`
                    : `${count} demo transactions added successfully!\n\nYour portfolio has been updated.`
                );
              }, 100);
            } catch (err) {
              setRefreshing(false);
              Alert.alert(
                'Error',
                language === 'ro'
                  ? 'Nu s-au putut încărca datele demo'
                  : 'Failed to load demo data'
              );
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

  const sortedStocks = React.useMemo(() => {
    const sorted = [...stocks];
    if (sortOption === 'value-desc') {
      sorted.sort((a, b) => b.totalValue - a.totalValue);
    } else if (sortOption === 'name-asc') {
      sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else if (sortOption === 'custom' && customOrder.length > 0) {
      // Sort by custom order
      sorted.sort((a, b) => {
        const indexA = customOrder.indexOf(a.symbol);
        const indexB = customOrder.indexOf(b.symbol);
        // If symbol not in custom order, put it at the end
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return sorted;
  }, [stocks, sortOption, customOrder]);

  const handleDragEnd = async (data: StockMetrics[]) => {
    const newOrder = data.map((stock) => stock.symbol);
    setCustomOrder(newOrder);
    await saveCustomSortOrder(newOrder);
  };

  const cycleSortOption = () => {
    if (sortOption === 'value-desc') {
      setSortOption('name-asc');
    } else if (sortOption === 'name-asc') {
      setSortOption('custom');
    } else {
      setSortOption('value-desc');
    }
  };

  const getSortLabel = () => {
    if (sortOption === 'value-desc') return t('portfolio.sortByValue', language);
    if (sortOption === 'name-asc') return t('portfolio.sortByName', language);
    return t('portfolio.sortByCustom', language);
  };

  const renderStockItem = ({ item: stock, drag, isActive }: RenderItemParams<StockMetrics>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.stockItem,
            stock.gainLossValue >= 0 ? styles.stockItemGain : styles.stockItemLoss,
            isActive && { opacity: 0.8, elevation: 8 },
          ]}
          onPress={() => handleStockPress(stock.symbol)}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {/* Drag handle indicator */}
            <View style={{ marginRight: 8, justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, color: '#999' }}>☰</Text>
            </View>

            {/* Left side: Symbol and shares/price */}
            <View style={{ flex: 0.4 }}>
              <Text style={styles.stockSymbol}>{stock.symbol}</Text>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {stock.shares} | {formatCurrency(stock.currentPrice)}
              </Text>
            </View>

            {/* Right side: Total value and gain/loss */}
            <View style={{ flex: 0.6, alignItems: 'flex-end' }}>
              <Text style={[styles.stockSymbol, { fontSize: 16 }]}>
                {formatCurrency(stock.totalValue)}
              </Text>
              <Text
                style={[
                  { fontSize: 12, marginTop: 4 },
                  stock.gainLossValue >= 0
                    ? { color: '#4caf50', fontWeight: '600' }
                    : { color: '#f44336', fontWeight: '600' },
                ]}
              >
                {formatCurrency(stock.gainLossValue)} ({formatPercentage(stock.gainLossPercentage)})
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (loading && stocks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  if (error && stocks.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>{t('common.refresh')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (stocks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>{t('portfolio.title', language)}</Text>
            <TouchableOpacity onPress={handleLanguageSwitch}>
              <Text style={{ fontSize: 20 }}>
                {language === 'ro' ? '🇷🇴' : '🇬🇧'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('portfolio.noData', language)}</Text>
          <TouchableOpacity
            style={[styles.addHoldingButton, { marginTop: 20 }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addHoldingButtonText}>
              + {language === 'ro' ? 'Adaugă holding' : 'Add Holding'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addHoldingButton, { backgroundColor: '#4caf50', marginTop: 12 }]}
            onPress={handleLoadMockData}
          >
            <Text style={styles.addHoldingButtonText}>
              📊 {language === 'ro' ? 'Încarcă date demo' : 'Load Demo Data'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Holding Modal (needs to be available in empty state too) */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={handleCloseModal}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {language === 'ro' ? 'Adaugă holding' : 'Add Holding'}
                </Text>

                {/* Symbol Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {language === 'ro' ? 'Simbol acțiune' : 'Stock Symbol'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., BVB, TLV, SNN"
                    keyboardType="default"
                    value={symbol}
                    onChangeText={setSymbol}
                    autoCapitalize="characters"
                    placeholderTextColor="#999"
                  />
                </View>

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
                      {language === 'ro' ? 'CUMPĂRĂ' : 'BUY'}
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
                      {language === 'ro' ? 'VINDE' : 'SELL'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quantity Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {language === 'ro' ? 'Cantitate' : 'Quantity'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={language === 'ro' ? 'Numărul de acțiuni' : 'Number of shares'}
                    keyboardType="decimal-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Price Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {language === 'ro' ? 'Preț per acțiune' : 'Price per Share'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00 RON"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Notes Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {language === 'ro' ? 'Note (opțional)' : 'Notes (Optional)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={language === 'ro' ? 'Adaugă note...' : 'Add notes...'}
                    value={notes}
                    onChangeText={setNotes}
                    placeholderTextColor="#999"
                    multiline
                  />
                </View>

                {/* Buttons */}
                <View style={styles.buttonGroup}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                    <Text style={styles.cancelButtonText}>
                      {language === 'ro' ? 'Anulează' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddHolding}>
                    <Text style={styles.submitButtonText}>
                      {language === 'ro' ? 'Adaugă' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with portfolio summary */}
      <View style={[styles.header]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t('portfolio.title', language)}</Text>
          <TouchableOpacity onPress={handleLanguageSwitch}>
            <Text style={{ fontSize: 20 }}>
              {language === 'ro' ? '🇷🇴' : '🇬🇧'}
            </Text>
          </TouchableOpacity>
        </View>
        {summary && (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.summaryLabel}>{t('portfolio.totalValue', language)}</Text>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000', marginTop: 4 }}>
                {formatCurrency(summary.totalValue)}
              </Text>
            </View>
            <View>
              <Text style={styles.summaryLabel}>{t('portfolio.totalGainLoss', language)}</Text>
              <Text
                style={[
                  { fontSize: 18, fontWeight: '600', marginTop: 4 },
                  summary.totalGainLoss >= 0 ? { color: '#4caf50' } : { color: '#f44336' },
                ]}
              >
                {formatCurrency(summary.totalGainLoss)} ({formatPercentage(summary.totalGainLossPercentage)})
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Sort options */}
      <TouchableOpacity
        style={styles.sortHeader}
        onPress={cycleSortOption}
      >
        <Text style={styles.sortLabel}>Sortare</Text>
        <Text style={styles.sortOption}>
          {getSortLabel()}
          {sortOption === 'custom' && ' (drag to reorder)'}
        </Text>
      </TouchableOpacity>

      {/* Add Holding Button */}
      <TouchableOpacity
        style={styles.addHoldingButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addHoldingButtonText}>+ Add Holding</Text>
      </TouchableOpacity>

      {/* Stock list */}
      {sortOption === 'custom' ? (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DraggableFlatList
            data={sortedStocks}
            onDragEnd={({ data }) => handleDragEnd(data)}
            keyExtractor={(item) => item.symbol}
            renderItem={renderStockItem}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          />
        </GestureHandlerRootView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {sortedStocks.map((stock) => (
            <TouchableOpacity
              key={stock.symbol}
              style={[
                styles.stockItem,
                stock.gainLossValue >= 0 ? styles.stockItemGain : styles.stockItemLoss,
              ]}
              onPress={() => handleStockPress(stock.symbol)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {/* Left side: Symbol and shares/price (40%) */}
                <View style={{ flex: 0.4 }}>
                  <Text style={styles.stockSymbol}>{stock.symbol}</Text>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {stock.shares} | {formatCurrency(stock.currentPrice)}
                  </Text>
                </View>

                {/* Right side: Total value and gain/loss (60%) */}
                <View style={{ flex: 0.6, alignItems: 'flex-end' }}>
                  <Text style={[styles.stockSymbol, { fontSize: 16 }]}>
                    {formatCurrency(stock.totalValue)}
                  </Text>
                  <Text
                    style={[
                      { fontSize: 12, marginTop: 4 },
                      stock.gainLossValue >= 0
                        ? { color: '#4caf50', fontWeight: '600' }
                        : { color: '#f44336', fontWeight: '600' },
                    ]}
                  >
                    {formatCurrency(stock.gainLossValue)} ({formatPercentage(stock.gainLossPercentage)})
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Add Holding Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Holding</Text>

              {/* Symbol Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Symbol</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., BVB, OMV, ING"
                  keyboardType="default"
                  value={symbol}
                  onChangeText={setSymbol}
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                />
              </View>

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
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelButtonText}>{t('transaction.cancel', language)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddHolding}
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
