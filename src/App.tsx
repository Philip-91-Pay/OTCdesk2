import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { dbPortal } from './firebase';
import { Trade, TradeCorridor, TradeType, TradePartner, TradeCurrency, FXUserProfile, FX_USERS, BankDetail, ClientDetail } from './types';
import { calculateOperationalMinutes, generateToken, generateUUID, formatReadableDateTime } from './utils';
import StatsGrid from './components/StatsGrid';
import AuditBanner from './components/AuditBanner';
import TraderProfileWidget from './components/TraderProfileWidget';
import {
  Zap,
  CheckCircle,
  Clock,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  Check,
  Copy,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  Calendar,
  AlertTriangle,
  Globe2,
  Database,
  ArrowRightLeft,
  DollarSign,
  Trash2,
  Shield,
  Download,
  MessageSquare,
  Lock
} from 'lucide-react';

export default function App() {
  // Navigation & Desk Session state
  const [activeTab, setActiveTab] = useState<'stamp' | 'eod' | 'banks'>('stamp');
  const [activeUser, setActiveUser] = useState<FXUserProfile>(FX_USERS[0]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time clock and rate limit states
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [lastGeneratedTime, setLastGeneratedTime] = useState<number | null>(null);
  const [cooldownDuration, setCooldownDuration] = useState<number>(45);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [latestGeneratedToken, setLatestGeneratedToken] = useState<string>(() => localStorage.getItem('latest_generated_token') || '');

  // Prevent Clement from accessing Quick Stamp
  useEffect(() => {
    if (activeUser.username === 'Clement') {
      setActiveTab('eod');
    }
  }, [activeUser]);

  // Sync real-time clock tickers
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Quick Stamp Configuration
  const [stampCorridor, setStampCorridor] = useState<TradeCorridor>('USD');
  const [stampType, setStampType] = useState<TradeType>('Sell');
  const [stampAmount, setStampAmount] = useState<string>('');
  const [stampBeneficiary, setStampBeneficiary] = useState('');
  const [stampRate, setStampRate] = useState<number | ''>('');
  const [stampValueDate, setStampValueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  
  // Clients state
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Bank Management Form State
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newCurrency, setNewCurrency] = useState<TradeCurrency>('USD');

  // Client Management Form State
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');

  const [tradeSummaryTemplate, setTradeSummaryTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('trade_summary_template');
    return saved || `Trade summary

91 payment {type} {amount} at {rate}

Value date: {value_date}
{account_name}
{account_number} + {currency}
{bank_name}

Amount: {symbol}{amount}

please note that {currency} should be paid in 30 minutes.`;
  });

  const [whatsappTemplate, setWhatsappTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('whatsapp_template');
    return saved || `🚀 Transaction Update | 91 Payments\n\n• Trade Ref: {trade_ref}\n• Volume: {amount}\n• Beneficiary: {beneficiary}\n\nStatus: Initiated\nOur desk has completed the processing leg. The official POP will be shared shortly. 🙏`;
  });

  // Custom Notifications / Toasts state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'warning' | 'info' }[]>([]);

  // Expandable form state for pending reconciliations
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  // Form input states for current active reconciliation
  const [formUnit, setFormUnit] = useState('Treasury');
  const [formCorridor, setFormCorridor] = useState<TradeCorridor>('USD');
  const [formTradeDate, setFormTradeDate] = useState('');
  const [formValueDate, setFormValueDate] = useState('');
  const [formPartner, setFormPartner] = useState<TradePartner>('Nairagram');
  const [formSourceBank, setFormSourceBank] = useState('');
  const [formTradeType, setFormTradeType] = useState<TradeType>('Buy');
  const [formCurrency, setFormCurrency] = useState<TradeCurrency>('USD');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formRate, setFormRate] = useState<number | ''>('');
  const [formDestAccount, setFormDestAccount] = useState('');
  const [formBeneficiaryAccount, setFormBeneficiaryAccount] = useState('');
  const [formBankExecutionTime, setFormBankExecutionTime] = useState('');

  // EOD Search & Filters
  const [eodSearch, setEodSearch] = useState('');
  const [eodSubTab, setEodSubTab] = useState<'pending' | 'completed'>('pending');

  // Load bank details from database
  useEffect(() => {
    const unsubscribe = dbPortal.subscribeBankDetails(
      (loadedBanks) => {
        setBankDetails(loadedBanks);
        if (loadedBanks.length > 0) {
          setSelectedBankId((prev) => {
            if (prev && loadedBanks.some(b => b.id === prev)) {
              return prev;
            }
            return loadedBanks[0].id;
          });
        }
      },
      (error) => {
        showToast('Failed to sync bank details: ' + error, 'warning');
      }
    );
    return () => unsubscribe();
  }, []);

  // Load client details from database
  useEffect(() => {
    const unsubscribe = dbPortal.subscribeClientDetails(
      (loadedClients) => {
        setClients(loadedClients);
        if (loadedClients.length > 0) {
          setSelectedClientId((prev) => {
            if (prev && loadedClients.some(c => c.id === prev)) {
              return prev;
            }
            return loadedClients[0].id;
          });
        }
      },
      (error) => {
        showToast('Failed to sync client configurations: ' + error, 'warning');
      }
    );
    return () => unsubscribe();
  }, []);

  // Load trades from Database Portal
  useEffect(() => {
    setLoading(true);
    const unsubscribe = dbPortal.subscribeTrades(
      (loadedTrades) => {
        setTrades(loadedTrades);
        setLoading(false);
      },
      (error) => {
        showToast('Failed to sync transactional blotter: ' + error, 'warning');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Simple Notification Trigger
  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Helper to compile Trade Summary text using Fatimah's customizable template
  const compileTradeSummary = (t: Trade) => {
    let summary = tradeSummaryTemplate;
    const typeText = t.trade_type === 'Buy' ? 'buys' : 'sells';
    const amountVal = typeof t.amount === 'number' ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
    const rateVal = typeof t.rate === 'number' ? t.rate.toLocaleString() : '0';
    const currencyVal = t.currency;
    
    const getCurrencySymbolLocal = (curr: string) => {
      switch (curr) {
        case 'USD':
        case 'USDC': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        default: return '$';
      }
    };
    const currencySymbol = getCurrencySymbolLocal(currencyVal);

    summary = summary.replace(/{type}/g, typeText);
    summary = summary.replace(/{amount}/g, amountVal);
    summary = summary.replace(/{rate}/g, rateVal);
    summary = summary.replace(/{value_date}/g, t.value_date || '');
    summary = summary.replace(/{account_name}/g, t.beneficiary_account || '');
    summary = summary.replace(/{account_number}/g, t.destination_account || '');
    summary = summary.replace(/{currency}/g, currencyVal);
    summary = summary.replace(/{symbol}/g, currencySymbol);
    summary = summary.replace(/{bank_name}/g, t.source_bank || '');
    summary = summary.replace(/{client_name}/g, t.client_name || t.partner || 'Client');
    summary = summary.replace(/{trade_ref}/g, t.token);
    return summary;
  };

  // Immediate Quick Token Generator handler (Generates Trade Summary)
  const handleGenerateInitiationCode = async () => {
    const numericAmount = parseFloat(String(stampAmount).replace(/,/g, '')) || 0;
    if (!stampAmount || numericAmount <= 0) {
      showToast('Please enter a valid trade amount.', 'warning');
      return;
    }
    if (stampRate === '' || stampRate <= 0) {
      showToast('Please enter a valid trade rate.', 'warning');
      return;
    }
    const selectedBank = bankDetails.find(b => b.id === selectedBankId);
    if (!selectedBank) {
      showToast('Please configure & select a settlement bank account.', 'warning');
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const clientName = selectedClient ? selectedClient.name : 'Internal';

    // Rate limit enforcement check
    if (lastGeneratedTime) {
      const elapsed = Math.floor((Date.now() - lastGeneratedTime) / 1000);
      if (elapsed < cooldownDuration) {
        showToast(`Please wait ${cooldownDuration - elapsed}s before generating a new stamp.`, 'warning');
        return;
      }
    }

    try {
      const token = generateToken();
      const id = generateUUID();
      const timestamp = new Date().toISOString();

      const newTrade: Trade = {
        id,
        token,
        app_initiation_timestamp: timestamp,
        status: 'Pending Reconciliation',
        unit: 'Treasury',
        corridor: stampCorridor,
        trade_date: new Date().toISOString().split('T')[0],
        value_date: stampValueDate,
        partner: clientName as any,
        source_bank: selectedBank.bankName,
        trade_type: stampType,
        currency: selectedBank.currency,
        amount: numericAmount,
        rate: Number(stampRate),
        ngn_equi: numericAmount * Number(stampRate),
        destination_account: selectedBank.accountNumber,
        beneficiary_account: selectedBank.accountName,
        bank_executed_timestamp: '',
        client_name: clientName,
      };

      // 1. Mark ID as newly created immediately to sync animation with list insertion
      setNewlyCreatedId(id);
      setTimeout(() => {
        setNewlyCreatedId((prev) => (prev === id ? null : prev));
      }, 4500); // 4.5s allows time for both Firestore sync and full 3.0s animation

      // 2. Submit to database
      await dbPortal.createTrade(newTrade);
      setLastGeneratedTime(Date.now());
      setStampAmount('');
      setLatestGeneratedToken(token);
      localStorage.setItem('latest_generated_token', token);
      // Keep stampRate, selectedBankId, stampValueDate for convenience in fast dual-trades

      // 3. Build Trade Summary slip text
      const summaryText = compileTradeSummary(newTrade);

      // 4. Clipboard integration with graceful fallback for iframes
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(summaryText);
          copied = true;
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = summaryText;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            copied = true;
          } catch (err) {
            console.warn("Fallback execCommand copy failed", err);
          }
          document.body.removeChild(textArea);
        }
      } catch (clipErr) {
        console.warn("Clipboard access failed", clipErr);
      }

      // 5. Trigger visual alert
      if (copied) {
        showToast(`Trade summary generated & copied to clipboard!`, 'success');
      } else {
        showToast(`Trade summary generated successfully!`, 'success');
      }
    } catch (dbErr) {
      showToast('Database insert failure: ' + dbErr, 'warning');
    }
  };

  const handleCopyToken = async (token: string) => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(token);
        copied = true;
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = token;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          copied = true;
        } catch (err) {
          console.warn("Fallback Copy direct failed", err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn("Copy operation failed", err);
    }
    if (copied) {
      showToast(`Token ${token} copied to clipboard!`, 'success');
    } else {
      showToast(`Copy failed. Token: ${token}`, 'warning');
    }
  };

  const getFormattedWhatsappText = (t: Trade) => {
    const isBuy = t.trade_type === 'Buy';
    const typeText = isBuy ? 'buys' : 'sells';
    const amountVal = t.amount !== null && t.amount !== undefined
      ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
      : '0.00';
    const rateVal = t.rate !== null && t.rate !== undefined ? t.rate.toLocaleString() : 'N/A';
    const currencyVal = t.currency || 'USD';
    
    const getCurrencySymbolLocal = (curr: string) => {
      switch (curr) {
        case 'USD':
        case 'USDC': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        default: return '$';
      }
    };
    const currencySymbol = getCurrencySymbolLocal(currencyVal);

    return `Trade summary

91 payment ${typeText} ${amountVal} at ${rateVal}

Value date: ${t.value_date || t.trade_date || 'N/A'}
${t.beneficiary_account || 'N/A'}
${t.destination_account || 'N/A'} + ${currencyVal}
${t.source_bank || 'N/A'}

Amount: ${currencySymbol}${amountVal}

please note that ${currencyVal} should be paid in 30 minutes.`;
  };

  const handleCopyWhatsappText = async (t: Trade) => {
    const text = getFormattedWhatsappText(t);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          copied = true;
        } catch (err) {
          console.warn("Fallback Copy WhatsApp failed", err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.warn("Copy WhatsApp failed", err);
    }
    if (copied) {
      showToast('WhatsApp dispatch text copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy WhatsApp text.', 'warning');
    }
  };

  const handleDeleteTrade = async (id: string, token: string) => {
    try {
      await dbPortal.deleteTrade(id);
      showToast(`Trade record ${token} successfully deleted.`, 'success');
    } catch (error) {
      showToast('Delete operation failed: ' + error, 'warning');
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newAccountName.trim() || !newAccountNumber.trim()) {
      showToast('All settlement bank parameters are required.', 'warning');
      return;
    }

    try {
      await dbPortal.createBankDetail({
        id: generateUUID(),
        bankName: newBankName.trim(),
        accountName: newAccountName.trim(),
        accountNumber: newAccountNumber.trim(),
        currency: newCurrency
      });
      showToast('Settlement bank added successfully!', 'success');
      setNewBankName('');
      setNewAccountName('');
      setNewAccountNumber('');
      setNewCurrency('USD');
    } catch (err) {
      showToast('Failed to add bank: ' + err, 'warning');
    }
  };

  const handleDeleteBank = async (id: string, name: string) => {
    try {
      await dbPortal.deleteBankDetail(id);
      showToast(`Settlement bank ${name} has been deleted.`, 'info');
    } catch (err) {
      showToast('Failed to remove bank: ' + err, 'warning');
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      showToast('Client Name is required.', 'warning');
      return;
    }

    try {
      await dbPortal.createClientDetail({
        id: generateUUID(),
        name: newClientName.trim(),
        email: newClientEmail.trim() || undefined,
        notes: newClientNotes.trim() || undefined,
      });
      showToast('Client configuration added successfully!', 'success');
      setNewClientName('');
      setNewClientEmail('');
      setNewClientNotes('');
    } catch (err) {
      showToast('Failed to add client configuration: ' + err, 'warning');
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    try {
      await dbPortal.deleteClientDetail(id);
      showToast(`Client ${name} has been deleted.`, 'info');
    } catch (err) {
      showToast('Failed to remove client configuration: ' + err, 'warning');
    }
  };

  const handleUpdateTemplate = (newTpl: string) => {
    setTradeSummaryTemplate(newTpl);
    localStorage.setItem('trade_summary_template', newTpl);
  };

  // Set up forms whenever expansion changes
  const handleStartReconciliation = (trade: Trade) => {
    setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id);
    setFormUnit(trade.unit || 'Treasury');
    setFormCorridor(trade.corridor);
    setFormTradeDate(trade.trade_date || new Date().toISOString().split('T')[0]);
    setFormValueDate(trade.value_date || new Date().toISOString().split('T')[0]);
    setFormPartner(trade.partner || 'Nairagram');
    setFormSourceBank(trade.source_bank || '');
    setFormTradeType(trade.trade_type);
    setFormCurrency(trade.currency || 'USD');
    setFormAmount(trade.amount !== null ? trade.amount : '');
    setFormRate(trade.rate !== null ? trade.rate : '');
    setFormDestAccount(trade.destination_account || '');
    setFormBeneficiaryAccount(trade.beneficiary_account || '');
    
    // Default bank executed timestamp to now if empty
    setFormBankExecutionTime(trade.bank_executed_timestamp || new Date().toISOString().slice(0, 16));
  };

  // Form Submit Reconciliation handler
  const handleSubmitReconciliation = async (trade: Trade) => {
    if (formAmount === '' || formAmount <= 0) {
      showToast('Please specify a positive Amount for volume', 'warning');
      return;
    }
    if (formRate === '' || formRate <= 0) {
      showToast('Please specify a valid foreign exchange Rate', 'warning');
      return;
    }
    if (!formBankExecutionTime) {
      showToast('Please specify the absolute bank execution timestamp', 'warning');
      return;
    }

    try {
      const amountNum = Number(formAmount);
      const rateNum = Number(formRate);
      const calculatedNgnEqui = amountNum * rateNum;

      // Construct execution ISO string from visual localized datetime picker input
      const bankExecutedISO = new Date(formBankExecutionTime).toISOString();

      // Calculate elapsed operational minutes
      const operationalMins = calculateOperationalMinutes(
        trade.app_initiation_timestamp,
        bankExecutedISO
      );

      // Decide SLA status: On Time if <= 60 operational minutes else SLA Breach
      const slaStatus = operationalMins <= 60 ? 'On Time' : 'SLA Breach';

      const updates: Partial<Trade> = {
        status: 'Successfully Executed',
        unit: formUnit,
        corridor: formCorridor,
        trade_date: formTradeDate,
        value_date: formValueDate,
        partner: formPartner,
        source_bank: formSourceBank,
        trade_type: formTradeType,
        currency: formCurrency,
        amount: amountNum,
        rate: rateNum,
        ngn_equi: calculatedNgnEqui,
        destination_account: formDestAccount,
        beneficiary_account: formBeneficiaryAccount,
        bank_executed_timestamp: bankExecutedISO,
        sla_status: slaStatus,
        sla_elapsed_minutes: operationalMins,
      };

      await dbPortal.updateTrade(trade.id, updates);
      showToast(`Reconciliation submitted! Code ${trade.token} flagged as ${slaStatus}.`, 'success');
      setExpandedTradeId(null);
    } catch (error) {
      showToast('Reconciliation submission failed: ' + error, 'warning');
    }
  };

  // Run Phantom Token Audit script
  const handleRunDiscrepancyAudit = async () => {
    showToast('Scanning treasury desk database for ghost streams...', 'info');
    
    // Mark as Phantom if status is pending and initiation age > 3 absolute hours
    const threeHoursMs = 3 * 60 * 60 * 1000;
    const nowTime = Date.now();
    let auditedCount = 0;

    for (const trade of trades) {
      if (trade.status === 'Pending Reconciliation') {
        const initTime = new Date(trade.app_initiation_timestamp).getTime();
        const elapsed = nowTime - initTime;
        if (elapsed > threeHoursMs) {
          try {
            await dbPortal.updateTrade(trade.id, {
              status: 'Critical Error: Phantom Token',
            });
            auditedCount++;
          } catch (err) {
            console.error('Audit failed for token ' + trade.token, err);
          }
        }
      }
    }

    if (auditedCount > 0) {
      showToast(`Audit complete! Flagged ${auditedCount} stale open records as 'Phantom Token'.`, 'warning');
    } else {
      showToast('Audit complete. No outstanding discrepancies or stale 3h+ stamps found.', 'success');
    }
  };

  // Export as CSV function
  const handleExportCSV = () => {
    if (trades.length === 0) {
      showToast('No trade slips to export.', 'warning');
      return;
    }

    const headers = [
      'Token',
      'Status',
      'Trade Date',
      'Corridor',
      'Trade Type',
      'Partner',
      'Currency',
      'Amount',
      'Rate',
      'NGN Equivalent',
      'Value Date',
      'Source Bank',
      'Destination Account',
      'Beneficiary Account',
      'App Initiation Timestamp',
      'Bank Executed Timestamp',
      'SLA Status',
      'SLA Elapsed Minutes'
    ];

    const rows = trades.map(t => [
      t.token || '',
      t.status || '',
      t.trade_date || '',
      t.corridor || '',
      t.trade_type || '',
      t.partner || '',
      t.currency || '',
      t.amount !== null && t.amount !== undefined ? t.amount : '',
      t.rate !== null && t.rate !== undefined ? t.rate : '',
      t.ngn_equi !== null && t.ngn_equi !== undefined ? t.ngn_equi : '',
      t.value_date || '',
      t.source_bank || '',
      t.destination_account || '',
      t.beneficiary_account || '',
      t.app_initiation_timestamp || '',
      t.bank_executed_timestamp || '',
      t.sla_status || '',
      t.sla_elapsed_minutes !== undefined ? t.sla_elapsed_minutes : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(val => {
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `treasury_slips_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported all trade slips successfully!', 'success');
  };

  // Filter lists based on chosen EOD view subtab and search filters
  const pendingTrades = trades.filter((t) => t.status === 'Pending Reconciliation');
  const completedTrades = trades.filter((t) => t.status !== 'Pending Reconciliation');

  const filteredPending = pendingTrades.filter((t) => {
    if (!eodSearch) return true;
    const q = eodSearch.toLowerCase();
    return (
      t.token.toLowerCase().includes(q) ||
      t.corridor.toLowerCase().includes(q) ||
      t.trade_type.toLowerCase().includes(q)
    );
  });

  const filteredCompleted = completedTrades.filter((t) => {
    if (!eodSearch) return true;
    const q = eodSearch.toLowerCase();
    return (
      t.token.toLowerCase().includes(q) ||
      t.corridor.toLowerCase().includes(q) ||
      t.partner.toLowerCase().includes(q) ||
      t.trade_type.toLowerCase().includes(q) ||
      (t.source_bank && t.source_bank.toLowerCase().includes(q)) ||
      (t.sla_status && t.sla_status.toLowerCase().includes(q))
    );
  });

  // Calculate real time calculated input equivalent NGN equi value for preview
  const liveCalculatedNgnEqui =
    typeof formAmount === 'number' && typeof formRate === 'number'
      ? formAmount * formRate
      : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col antialiased selection:bg-zinc-900/15 selection:text-zinc-900 font-sans">
      {/* 1. Global Interactive Toasts Section */}
      <div id="toast-manager" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            id={`toast-${toast.id}`}
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 transform animate-in slide-in-from-bottom-5 duration-305 ${
              toast.type === 'success'
                ? 'bg-white border-emerald-200 text-emerald-800'
                : toast.type === 'warning'
                ? 'bg-white border-rose-200 text-rose-800'
                : 'bg-white border-zinc-250 text-zinc-800'
            }`}
          >
            <div className="mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : toast.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              ) : (
                <Zap className="w-5 h-5 text-zinc-800" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-zinc-900 uppercase tracking-wider">System Broadcast</p>
              <p className="text-xs text-zinc-650 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-zinc-400 hover:text-zinc-950 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* 2. Application Header */}
      <header id="ops-hub-header" className="border-b border-zinc-200 bg-white sticky top-0 z-40 px-4 lg:px-8 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-[#5856D6]" viewBox="0 0 32 30" fill="currentColor">
                <path d="M10.5 5C7.46 5 5 7.46 5 10.5C5 13.54 7.46 16 10.5 16C13.54 16 16 13.54 16 10.5C16 7.46 13.54 5 10.5 5ZM10.5 13.5C8.84 13.5 7.5 12.16 7.5 10.5C7.5 8.84 8.84 7.5 10.5 7.5C12.16 7.5 13.5 8.84 13.5 10.5C13.5 12.16 12.16 13.5 10.5 13.5Z" />
                <path d="M18.5 14C15.46 14 13 16.46 13 19.5C13 22.54 15.46 25 18.5 25C21.54 25 24 22.54 24 19.5C24 16.46 21.54 14 18.5 14ZM18.5 22.5C16.84 22.5 15.5 21.16 15.5 19.5C15.5 17.84 16.84 16.5 18.5 16.5C20.16 16.5 21.5 17.84 21.5 19.5C21.5 21.16 20.16 22.5 18.5 22.5Z" />
                <path d="M13.5 10.5H18.5V19.5H13.5V10.5Z" fillOpacity="0.2" fill="#5856D6" />
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-zinc-900 tracking-tight">91Pay</span>
                  <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded bg-[#EAEAFF] text-[#5856D6] uppercase font-mono">
                    Admin
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono">
                    v2.0 Asynchronous CRM
                  </span>
                </div>
                <h1 className="text-xs font-bold text-zinc-500 tracking-wider uppercase font-mono mt-0.5">
                  FX Desk Operations Hub
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 p-1.5 rounded-xl">
              {activeUser.username !== 'Clement' && (
                <button
                  id="tab-stamp-btn"
                  onClick={() => setActiveTab('stamp')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer ${
                    activeTab === 'stamp'
                      ? 'bg-[#5856D6] text-white shadow-md font-black'
                      : 'text-zinc-500 hover:text-[#5856D6] hover:bg-white/50'
                  }`}
                >
                  QUICK STAMP
                </button>
              )}
              <button
                id="tab-eod-btn"
                onClick={() => setActiveTab('eod')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer ${
                  activeTab === 'eod'
                    ? 'bg-[#5856D6] text-white shadow-md font-black'
                    : 'text-zinc-500 hover:text-[#5856D6] hover:bg-white/50'
                }`}
              >
                EOD RECONCILIATION
              </button>
              <button
                id="tab-banks-btn"
                onClick={() => setActiveTab('banks')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold font-sans tracking-wide transition-all cursor-pointer ${
                  activeTab === 'banks'
                    ? 'bg-[#5856D6] text-white shadow-md font-black'
                    : 'text-zinc-500 hover:text-[#5856D6] hover:bg-white/50'
                }`}
              >
                CONFIGURATIONS
              </button>
            </div>

            <TraderProfileWidget activeUser={activeUser} onChangeUser={setActiveUser} />
          </div>
        </div>
      </header>

      {/* 3. Main Application Stage */}
      <main id="view-portal-container" className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto">
        {/* LOADING INDICATOR */}
        {loading && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex items-center justify-center gap-3 text-zinc-500 mb-6 shadow-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-900" />
            <span className="text-xs font-mono tracking-wider text-zinc-600">Syncing decentralized ledger nodes...</span>
          </div>
        )}
        {/* SCREEN 1: REAL-TIME QUICK STAMP DESK */}
        {activeTab === 'stamp' && activeUser.username !== 'Clement' && (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#5856D6] to-[#4240BD] rounded-3xl p-6 lg:p-10 shadow-2xl text-white mb-8 border border-white/10">
            {/* Topographic organic curves decoration inspired by the login image */}
            {/* Bottom-left curves */}
            <div className="absolute -bottom-36 -left-24 w-96 h-96 rounded-full border-4 border-white/5 pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full border-4 border-white/10 pointer-events-none" />
            <div className="absolute -bottom-12 -left-8 w-64 h-64 rounded-[80px] border-4 border-white/5 rotate-12 pointer-events-none" />
            
            {/* Bottom-right curves */}
            <div className="absolute -bottom-36 -right-24 w-96 h-96 rounded-full border-4 border-white/5 pointer-events-none" />
            <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-[100px] border-4 border-white/10 rotate-45 pointer-events-none" />
            <div className="absolute -bottom-12 -right-8 w-64 h-64 rounded-[80px] border-4 border-white/5 pointer-events-none" />

            <div id="quick-stamp-desk-view" className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto w-full">
              <div className="bg-white border border-white/80 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-xl text-center text-zinc-900">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5856D6] animate-pulse" />
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Stamp Trade Initiation</h3>
                  </div>

                  {/* Overhaul: Select Trade Direction section is ON TOP */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150 text-left mb-5">
                    <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-3 text-center">
                      Select Trade Direction
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        id="stamp-type-buy-btn"
                        disabled={true}
                        onClick={() => {}}
                        className="py-4 rounded-xl font-medium text-xs tracking-wider flex items-center justify-center gap-2 bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60"
                        title="Buy direction is currently locked for treasury operations"
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        BUY (LOCKED)
                      </button>
                      <button
                        id="stamp-type-sell-btn"
                        onClick={() => setStampType('Sell')}
                        className={`py-4 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          stampType === 'Sell'
                            ? 'border-2 border-rose-600 bg-rose-600 text-white font-extrabold shadow-md scale-102'
                            : 'bg-white border border-zinc-200 text-zinc-500 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50/50'
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        SELL
                      </button>
                    </div>
                  </div>

                  {/* Initiation details updated to a TRADE SUMMARY SLIP */}
                  <div className="text-left bg-zinc-50 border border-zinc-200 rounded-2xl p-4.5 mb-6">
                    <h4 className="text-[10px] font-black tracking-wider text-zinc-400 uppercase font-mono mb-3.5 flex items-center justify-between gap-1.5 w-full">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#5856D6]" />
                        Trade Summary Slip Setup
                      </div>
                      {latestGeneratedToken && (
                        <span className="bg-[#5856D6]/10 text-[#5856D6] border border-[#5856D6]/20 px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black tracking-widest leading-none">
                          REF: {latestGeneratedToken}
                        </span>
                      )}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Amount Field */}
                      <div>
                        <label htmlFor="stamp-amount-input" className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">
                            {(() => {
                              const selB = bankDetails.find(b => b.id === selectedBankId);
                              if (selB?.currency === 'GBP') return '£';
                              if (selB?.currency === 'EUR') return '€';
                              return '$';
                            })()}
                          </span>
                          <input
                            id="stamp-amount-input"
                            type="text"
                            placeholder="0.00"
                            value={stampAmount}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/,/g, '');
                              if (rawVal === '') {
                                setStampAmount('');
                                return;
                              }
                              if (/^[0-9]*\.?[0-9]*$/.test(rawVal)) {
                                const parts = rawVal.split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                setStampAmount(parts.join('.'));
                              }
                            }}
                            className="w-full pl-6 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-black focus:ring-1 focus:ring-[#5856D6] focus:outline-none text-zinc-800 transition-all placeholder:text-zinc-355 font-mono"
                          />
                        </div>
                      </div>

                      {/* Rate Field */}
                      <div>
                        <label htmlFor="stamp-rate-input" className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Rate (NGN)
                        </label>
                        <input
                          id="stamp-rate-input"
                          type="number"
                          placeholder="e.g. 1585"
                          value={stampRate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStampRate(val === '' ? '' : Number(val));
                          }}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#5856D6] focus:outline-none text-zinc-800 transition-all placeholder:text-zinc-300"
                        />
                      </div>

                      {/* Value Date Field */}
                      <div>
                        <label htmlFor="stamp-value-date-input" className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Value Date
                        </label>
                        <input
                          id="stamp-value-date-input"
                          type="date"
                          value={stampValueDate}
                          onChange={(e) => setStampValueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#5856D6] focus:outline-none text-zinc-800 transition-all text-zinc-700"
                        />
                      </div>

                      {/* Settlement Bank selection */}
                      <div>
                        <label htmlFor="stamp-bank-select" className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Settlement Account
                        </label>
                        <select
                          id="stamp-bank-select"
                          value={selectedBankId}
                          onChange={(e) => setSelectedBankId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#5856D6] focus:outline-none text-zinc-800 transition-all text-zinc-700"
                        >
                          {bankDetails.length === 0 ? (
                            <option value="">-- No banks configured --</option>
                          ) : (
                            bankDetails.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.bankName} ({b.currency})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Client selection dropdown */}
                      <div>
                        <label htmlFor="stamp-client-select" className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Client
                        </label>
                        <select
                          id="stamp-client-select"
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#5856D6] focus:outline-none text-zinc-800 transition-all text-zinc-700"
                        >
                          {clients.length === 0 ? (
                            <option value="">-- No clients configured --</option>
                          ) : (
                            clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Grid of fast configuration toggles & controls */}
                  <div className="space-y-6 mb-8 text-left">
                    {/* Philip / Trader Admin Controls */}
                    {activeUser.username === 'Philip' && (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex flex-col gap-4 shadow-sm text-left">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-amber-850 uppercase tracking-wider">
                          <Shield className="w-3.5 h-3.5 text-amber-600" />
                          Philip Admin Controls
                        </div>
                        
                        <div className="flex items-center justify-between gap-4 border-b border-amber-200 pb-3">
                          <span className="text-xs font-medium text-amber-900">Cooldown duration:</span>
                          <div className="flex items-center gap-2">
                            <input
                              id="admin-cooldown-input"
                              type="number"
                              min="0"
                              max="300"
                              value={cooldownDuration}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setCooldownDuration(isNaN(val) ? 0 : Math.max(0, val));
                              }}
                              className="w-16 px-2 py-1 text-center font-mono text-xs font-bold border border-zinc-300 bg-white rounded-lg focus:ring-1 focus:ring-[#5856D6] focus:outline-none text-zinc-800"
                            />
                            <span className="text-xs text-amber-700 font-mono font-bold">sec</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label htmlFor="temp-whatsapp-editor" className="text-xs font-medium text-amber-900">WhatsApp message template update:</label>
                          <textarea
                            id="temp-whatsapp-editor"
                            rows={7}
                            value={whatsappTemplate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWhatsappTemplate(val);
                              localStorage.setItem('whatsapp_template', val);
                            }}
                            className="w-full text-xs font-mono p-2.5 bg-white border border-amber-300 rounded-lg text-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed"
                            placeholder="Use placeholders like {trade_ref}, {amount}, {beneficiary}..."
                          />
                          <div className="text-[9px] text-amber-700 leading-normal">
                            ✨ Supports: <code className="font-mono bg-amber-100 px-1 rounded">{`{trade_ref}`}</code>, <code className="font-mono bg-amber-100 px-1 rounded">{`{amount}`}</code>, and <code className="font-mono bg-amber-100 px-1 rounded">{`{beneficiary}`}</code> placeholders.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Massive Center Initiation Action Component with updated text */}
                <div className="pt-6 border-t border-zinc-150 text-center flex-1 flex flex-col justify-center">
                  {(() => {
                    const hours = String(currentTime.getHours()).padStart(2, '0');
                    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
                    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
                    const timeString = `${hours}:${minutes}:${seconds}`;

                    const elapsed = lastGeneratedTime ? Math.floor((currentTime.getTime() - lastGeneratedTime) / 1000) : 100;
                    const cooldown = elapsed < cooldownDuration ? cooldownDuration - elapsed : 0;
                    const isLocked = cooldown > 0;

                    return (
                      <button
                        id="btn-generate-initiation-code"
                        onClick={handleGenerateInitiationCode}
                        disabled={isLocked}
                        className={`w-full text-xs sm:text-sm font-extrabold tracking-widest py-4 px-6 rounded-xl shadow-md transform transition-all flex items-center justify-center gap-3 uppercase cursor-pointer ${
                          isLocked
                            ? 'bg-zinc-250 text-zinc-400 cursor-not-allowed border border-zinc-200'
                            : 'bg-[#5856D6] hover:bg-[#4644BD] hover:shadow-lg text-white hover:scale-[1.01] active:scale-[0.97] cursor-pointer'
                        }`}
                      >
                        <Zap className={`w-4 h-4 fill-current ${isLocked ? 'text-zinc-400' : 'text-amber-300 animate-pulse'}`} />
                        <span>
                          {isLocked ? `COOLDOWN (${cooldown}s LEFT)` : 'GENERATE TRADE SUMMARY'}
                        </span>
                        <span className="font-mono text-xs bg-black/15 px-2.5 py-1 rounded-md font-bold text-zinc-350 animate-pulse">
                          {timeString}
                        </span>
                      </button>
                    );
                  })()}
                  <div className="text-center mt-3 text-[10px] text-zinc-400 font-mono tracking-wide uppercase">
                    Creates unalterable ledger stamps • STAMP NOW. RECONCILE LATER.
                  </div>
                </div>
              </div>

              {/* Quick Stream Monitor Feed - Stacked beautifully beside */}
              <div className="bg-white border border-white/80 rounded-3xl p-6 flex flex-col justify-between shadow-xl text-zinc-900 w-full min-h-[560px]">
                <div>
                  <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-100">
                    <h3 className="text-[10px] font-black tracking-wider text-zinc-400 uppercase font-mono flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-zinc-800" />
                      LIVE CODES ISSUED FEED
                    </h3>
                    <span className="text-[10px] text-emerald-700 font-mono flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ONLINE
                    </span>
                  </div>

                  <div className="space-y-4 h-[470px] overflow-y-auto pr-1.5 relative scrollbar-thin">
                    <AnimatePresence initial={false} mode="popLayout">
                      {pendingTrades.length === 0 ? (
                        <motion.div
                          key="no-stamps"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-16 text-xs text-zinc-400 font-mono"
                        >
                          No pending codes. Ready for treasury stamp initiation.
                        </motion.div>
                      ) : (
                        pendingTrades.map((t) => {
                          const isPending = t.status === 'Pending Reconciliation';
                          const isSuccess = t.status === 'Successfully Executed';
                          const isPhantom = t.status === 'Critical Error: Phantom Token';
                          return (
                            <motion.div
                              id={`feed-row-${t.id}`}
                              key={t.id}
                              layout
                              initial={{ opacity: 0, y: -40, scale: 0.9 }}
                              animate={{ 
                                opacity: 1, 
                                y: 0, 
                                scale: 1,
                                filter: 'blur(0px)'
                              }}
                              exit={{ opacity: 0, y: 40, scale: 0.9 }}
                              transition={{ type: 'spring', stiffness: 355, damping: 26 }}
                              className={`p-4 rounded-2xl bg-zinc-50 border transition-all flex flex-col gap-3.5 relative overflow-hidden ${
                                t.id === newlyCreatedId
                                  ? 'animate-gold-card'
                                  : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
                              }`}
                            >
                              {t.id === newlyCreatedId && (
                                <div className="gold-sweep-light" />
                              )}
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg font-mono tracking-wider ${
                                    t.trade_type === 'Buy'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-205'
                                      : 'bg-rose-100 text-rose-800 border border-rose-205'
                                  }`}
                                >
                                  {t.trade_type}
                                </span>
                                <button
                                  id={`badge-copy-token-${t.id}`}
                                  onClick={() => handleCopyToken(t.token)}
                                  className="text-xs font-black px-2.5 py-1 rounded bg-[#5856D6]/10 text-[#5856D6] hover:bg-[#5856D6]/20 border border-[#5856D6]/20 font-mono tracking-widest cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 focus:outline-none"
                                  title="Click to copy Trade Summary ID"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  {t.token}
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-4 py-1.5 border-y border-dashed border-zinc-200">
                                <span className="text-2xl font-mono font-black text-zinc-900 tracking-tight">
                                  {(() => {
                                    const getCurrencySymbolLocal = (curr: string) => {
                                      switch (curr) {
                                        case 'USD':
                                        case 'USDC': return '$';
                                        case 'EUR': return '€';
                                        case 'GBP': return '£';
                                        default: return '$';
                                      }
                                    };
                                    const symbol = getCurrencySymbolLocal(t.currency);
                                    const amtStr = typeof t.amount === 'number' ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
                                    return `${symbol}${amtStr}`;
                                  })()}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2.5 py-1 bg-zinc-105 border border-zinc-300 text-zinc-700 font-bold rounded-full text-[10px] tracking-wide max-w-[150px] truncate" title={t.client_name || t.partner || 'Client'}>
                                    👤 {t.client_name || t.partner || 'Client'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5 text-[10px] font-mono text-zinc-400">
                                <div className="flex items-center justify-between">
                                  <span>
                                    Stamp: {formatReadableDateTime(t.app_initiation_timestamp) || 'Unknown'}
                                  </span>
                                  <div>
                                    {isPending && (
                                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        PENDING
                                      </span>
                                    )}
                                    {isSuccess && (
                                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        SUCCESS
                                      </span>
                                    )}
                                    {isPhantom && (
                                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        FAILS
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Dynamic Mini Workflow Stages Buttons under the Stamp Timestamp */}
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed border-zinc-150 mt-1">
                                  {/* Button 1: Trade Summary (copies trade summary when clicked) */}
                                  <button
                                    id={`btn-trade-summary-${t.id}`}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const summary = compileTradeSummary(t);
                                      try {
                                        await navigator.clipboard.writeText(summary);
                                        showToast('Trade Summary copied to clipboard!', 'success');
                                      } catch (err) {
                                        showToast('Failed to copy Trade Summary', 'warning');
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#1C1C1E] hover:bg-emerald-100 text-[9.5px] font-bold cursor-pointer transition-all focus:outline-none"
                                    title="Click to copy Trade Summary"
                                  >
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Trade Summary</span>
                                  </button>

                                  {/* Button 2: NGN Received */}
                                  {(() => {
                                    const isLogged = !!t.ngn_received_timestamp;

                                    const handleMarkNgn = async (e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      let targetTimestamp = t.ngn_received_timestamp;

                                      if (!targetTimestamp) {
                                        const ts = new Date().toISOString();
                                        targetTimestamp = ts;
                                        try {
                                          await dbPortal.updateTrade(t.id, { ngn_received_timestamp: ts });
                                          showToast('Captured NGN Received timestamp!', 'success');
                                        } catch (err) {
                                          showToast('Failed to update workflow: ' + err, 'warning');
                                          return;
                                        }
                                      }

                                      const clientName = t.client_name || t.partner || 'Client';
                                      const confirmText = `91 PAYMENTS: NGN Received and Confirmed\nTrade Ref: ${t.token}\nClient: ${clientName}\nSettlement Account: ${t.beneficiary_account || 'Internal Account'}\nCaptured: ${formatReadableDateTime(targetTimestamp)}`;
                                      try {
                                        await navigator.clipboard.writeText(confirmText);
                                        showToast('NGN Received confirmation copied!', 'success');
                                      } catch (err) {
                                        console.warn(err);
                                      }
                                    };

                                    return (
                                      <button
                                        id={`btn-ngn-recv-${t.id}`}
                                        onClick={handleMarkNgn}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9.5px] font-bold transition-all relative ${
                                          isLogged
                                            ? 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer'
                                            : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-650 cursor-pointer'
                                        }`}
                                        title={isLogged ? `Logged at ${formatReadableDateTime(t.ngn_received_timestamp!)}. Click to copy confirmation text.` : 'Mark NGN Received'}
                                      >
                                        {isLogged ? (
                                          <>
                                            <CheckCircle className="w-2.5 h-2.5 text-blue-500" />
                                            <span>NGN Received</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="w-2.5 h-2.5 text-zinc-400" />
                                            <span>NGN Received</span>
                                          </>
                                        )}
                                      </button>
                                    );
                                  })()}

                                  {/* Button 3: USD Payout Initiated */}
                                  {(() => {
                                    const isLogged = !!t.usd_payout_timestamp;

                                    const handleMarkUsd = async (e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      let targetTimestamp = t.usd_payout_timestamp;

                                      if (!targetTimestamp) {
                                        const ts = new Date().toISOString();
                                        targetTimestamp = ts;
                                        try {
                                          await dbPortal.updateTrade(t.id, { usd_payout_timestamp: ts });
                                          showToast('Captured USD Payout Initiated timestamp!', 'success');
                                        } catch (err) {
                                          showToast('Failed to update workflow: ' + err, 'warning');
                                          return;
                                        }
                                      }

                                      const clientName = t.client_name || t.partner || 'Client';
                                      const currencySymbol = t.currency === 'EUR' ? '€' : t.currency === 'GBP' ? '£' : '$';
                                      const amountStr = typeof t.amount === 'number' ? t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
                                      const confirmText = `91 PAYMENTS: USD Payout Initiated\nTrade Ref: ${t.token}\nClient: ${clientName}\nPayout Volume: ${currencySymbol}${amountStr} ${t.currency}\nCaptured: ${formatReadableDateTime(targetTimestamp)}`;
                                      try {
                                        await navigator.clipboard.writeText(confirmText);
                                        showToast('USD Initiated confirmation copied!', 'success');
                                      } catch (err) {
                                        console.warn(err);
                                      }
                                    };

                                    return (
                                      <button
                                        id={`btn-usd-payout-${t.id}`}
                                        onClick={handleMarkUsd}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9.5px] font-bold transition-all relative ${
                                          isLogged
                                            ? 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 cursor-pointer'
                                            : 'bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-650 cursor-pointer'
                                        }`}
                                        title={isLogged ? `Logged at ${formatReadableDateTime(t.usd_payout_timestamp!)}. Click to copy confirmation text.` : 'Mark USD Initiated'}
                                      >
                                        {isLogged ? (
                                          <>
                                            <CheckCircle className="w-2.5 h-2.5 text-purple-500" />
                                            <span>USD Initiated</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="w-2.5 h-2.5 text-zinc-400" />
                                            <span>USD Initiated</span>
                                          </>
                                        )}
                                      </button>
                                    );
                                  })()}

                                  {/* Button 4: Trade Cancelled */}
                                  {(() => {
                                    const isLogged = !!t.cancelled_timestamp;

                                    const handleMarkCancel = async (e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      if (isLogged) {
                                        await navigator.clipboard.writeText(`Trade Cancelled Logged At: ${formatReadableDateTime(t.cancelled_timestamp!)}`);
                                        showToast('Cancelled timestamp copied to clipboard!', 'success');
                                        return;
                                      }
                                      const confirmAction = window.confirm('Are you sure you want to cancel this trade slip? This will capture a cancellation timestamp and mark the trade status as Fails.');
                                      if (!confirmAction) return;

                                      const ts = new Date().toISOString();
                                      try {
                                        await dbPortal.updateTrade(t.id, { 
                                          cancelled_timestamp: ts,
                                          status: 'Critical Error: Phantom Token'
                                        });
                                        showToast('Trade cancelled and logged!', 'info');
                                      } catch (err) {
                                        showToast('Failed to update workflow: ' + err, 'warning');
                                      }
                                    };

                                    return (
                                      <button
                                        id={`btn-cancel-trade-${t.id}`}
                                        onClick={handleMarkCancel}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9.5px] font-bold transition-all relative ${
                                          isLogged
                                            ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                                            : 'bg-zinc-100 border border-zinc-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-zinc-650 cursor-pointer'
                                        }`}
                                        title={isLogged ? `Logged at ${formatReadableDateTime(t.cancelled_timestamp!)}. Click to copy.` : 'Cancel Trade'}
                                      >
                                        {isLogged ? (
                                          <>
                                            <CheckCircle className="w-2.5 h-2.5 text-rose-500" />
                                            <span>Cancelled</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertTriangle className="w-2.5 h-2.5 text-zinc-400" />
                                            <span>Cancel</span>
                                          </>
                                        )}
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                    {/* Bottom gradient fade-out to make the 3rd card grey/fade out gently */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-100 text-center text-[10px] text-zinc-400 font-mono tracking-wide uppercase">
                  Showing live issued stamp streams • Click copy icon to transcribe
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: END-OF-DAY (EOD) RECONCILIATION DASHBOARD */}
        {activeTab === 'eod' && (
          <div className="space-y-6">
            <AuditBanner />
            <StatsGrid trades={trades} />

            <div id="eod-dashboard-section" className="bg-white border border-zinc-205 rounded-2xl p-6 shadow-sm">
            {/* Action Bar Header */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-zinc-100 mb-6">
              <div className="flex items-center gap-3">
                <div id="eod-subtab-controller" className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 p-1 rounded-xl">
                  <button
                    id="subtab-pending-btn"
                    onClick={() => setEodSubTab('pending')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all cursor-pointer ${
                      eodSubTab === 'pending'
                        ? 'bg-zinc-900 text-white font-black'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    PENDING ACTIONS ({pendingTrades.length})
                  </button>
                  <button
                    id="subtab-completed-btn"
                    onClick={() => setEodSubTab('completed')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all cursor-pointer ${
                      eodSubTab === 'completed'
                        ? 'bg-zinc-900 text-white font-black'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    COMPLETED HISTORY ({completedTrades.length})
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    id="eod-search-input"
                    type="text"
                    placeholder="Search tokens, corridors, partners..."
                    value={eodSearch}
                    onChange={(e) => setEodSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-550 w-full md:w-60 font-mono shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-export-csv"
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-emerald-55 bg-emerald-50 border-2 border-emerald-250 hover:border-emerald-400 hover:bg-emerald-100/40 rounded-xl text-emerald-800 font-bold text-xs font-mono tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-2 uppercase"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Export as CSV
                </button>
                <button
                  id="btn-run-discrepancy-audit"
                  onClick={handleRunDiscrepancyAudit}
                  className="px-4 py-2 bg-rose-50 border-2 border-rose-200 hover:border-rose-450 rounded-xl text-rose-800 font-bold text-xs font-mono tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-2 uppercase"
                >
                  <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                  Run Discrepancy Audit
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Pending Action Grid / List */}
            {eodSubTab === 'pending' && (
              <div id="pending-grid-area">
                {filteredPending.length === 0 ? (
                  <div className="text-center py-16 text-zinc-550 border border-dashed border-zinc-250 rounded-2xl bg-zinc-50">
                    <CheckCircle className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-zinc-800">Blotter Clear of Pending Tasks</p>
                    <p className="text-xs text-zinc-450 mt-1 max-w-md mx-auto leading-relaxed">
                      All clocked codes have been reconciled. Good job! Click on Quick Stamp to issue new tokens.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPending.map((trade) => {
                      const isExpanded = expandedTradeId === trade.id;
                      return (
                        <div
                          id={`pending-trade-card-${trade.id}`}
                          key={trade.id}
                          className={`border rounded-2xl overflow-hidden transition-all bg-white ${
                            isExpanded ? 'border-zinc-850 shadow-md ring-1 ring-zinc-800/10' : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          {/* Main Scannable Row Summary */}
                          <div
                            id={`pending-trade-summary-${trade.id}`}
                            className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/50"
                            onClick={() => handleStartReconciliation(trade)}
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-base font-black font-mono text-zinc-900 tracking-wider bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-xl">
                                {trade.token}
                              </span>
                              <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                                <span className={`w-2 h-2 rounded-full ${trade.trade_type === 'Buy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="text-xs font-bold font-mono text-zinc-800">
                                  {trade.trade_type.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs font-bold font-mono text-zinc-650 bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                                Corridor: <strong className="text-zinc-900">{trade.corridor}</strong>
                              </span>
                              <span className="text-xs font-semibold text-zinc-650 font-mono bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200">
                                Stamp: <strong className="text-zinc-900">{formatReadableDateTime(trade.app_initiation_timestamp)}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                              <span className="text-xs text-amber-800 font-mono font-bold flex items-center gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                AWAITING SLIP
                              </span>
                              <button
                                id={`btn-whatsapp-pending-${trade.id}`}
                                title="Copy WhatsApp text update"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyWhatsappText(trade);
                                }}
                                className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              {activeUser.username === 'Philip' && (
                                <button
                                  id={`delete-pending-${trade.id}`}
                                  title="Delete Record"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTrade(trade.id, trade.token);
                                  }}
                                  className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-105 hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                id={`toggle-expand-${trade.id}`}
                                className={`p-2 rounded-lg bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-650 transition-colors transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* RECONCILIATION INLINE FORM */}
                          {isExpanded && (
                            <div id={`reconcile-form-${trade.id}`} className="px-6 pb-6 pt-2 border-t border-zinc-150 bg-zinc-50/50 animate-in fade-in slide-in-from-top-3">
                              <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4.5 mb-6 flex items-start gap-3">
                                <FileText className="w-5 h-5 text-zinc-605 mt-0.5" />
                                <div>
                                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                                    Reconcile Stamp {trade.token}
                                  </h4>
                                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                    app_initiation_timestamp: <span className="font-mono text-zinc-800 font-bold">{trade.app_initiation_timestamp}</span> is read-only. Enter the exact bank execution time shown on the processing portal receipt.
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                {/* Unit Column */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Unit Desk
                                  </label>
                                  <input
                                    id={`input-unit-${trade.id}`}
                                    type="text"
                                    value={formUnit}
                                    onChange={(e) => setFormUnit(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  />
                                </div>

                                {/* Corridor selection dropdown */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Corridor
                                  </label>
                                  <select
                                    id={`select-corridor-${trade.id}`}
                                    value={formCorridor}
                                    onChange={(e) => setFormCorridor(e.target.value as TradeCorridor)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  >
                                    {['NGN', 'GHS', 'KES', 'XOF', 'AOA', 'CDF', 'VND'].map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Trade Date picker */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Trade Date
                                  </label>
                                  <input
                                    id={`input-trade-date-${trade.id}`}
                                    type="date"
                                    value={formTradeDate}
                                    onChange={(e) => setFormTradeDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  />
                                </div>

                                {/* Value date picker */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Value Date (EOD Close)
                                  </label>
                                  <input
                                    id={`input-value-date-${trade.id}`}
                                    type="date"
                                    value={formValueDate}
                                    onChange={(e) => setFormValueDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  />
                                </div>

                                {/* Desk Partner dropdown query */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Partner Merchant
                                  </label>
                                  <select
                                    id={`select-partner-${trade.id}`}
                                    value={formPartner}
                                    onChange={(e) => setFormPartner(e.target.value as TradePartner)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-sans"
                                  >
                                    {[
                                      'Nairagram',
                                      'Juicyway',
                                      'Cosmo Remit',
                                      'Chinelo Fx',
                                      'Rolla',
                                      'Lilian',
                                      'Alex Adino',
                                      'Regulus',
                                      'Starks',
                                      'Vgg',
                                      'Fincra',
                                      'Blusalt',
                                    ].map((p) => (
                                      <option key={p} value={p}>
                                        {p}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Source Bank processing input */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Source/Bank Partner
                                  </label>
                                  <input
                                    id={`input-source-bank-${trade.id}`}
                                    type="text"
                                    placeholder="Enter processing bank"
                                    value={formSourceBank}
                                    onChange={(e) => setFormSourceBank(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  />
                                </div>

                                {/* Direction type select */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Direction Flow
                                  </label>
                                  <select
                                    id={`select-trade-type-${trade.id}`}
                                    value={formTradeType}
                                    onChange={(e) => setFormTradeType(e.target.value as TradeType)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  >
                                    <option value="Buy">Buy (Inflow)</option>
                                    <option value="Sell">Sell (Outflow)</option>
                                  </select>
                                </div>

                                {/* Traded Currency select */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Traded Currency
                                  </label>
                                  <select
                                    id={`select-currency-${trade.id}`}
                                    value={formCurrency}
                                    onChange={(e) => setFormCurrency(e.target.value as TradeCurrency)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                                  >
                                    {['USD', 'USDC', 'EUR', 'GBP'].map((cur) => (
                                      <option key={cur} value={cur}>
                                        {cur}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Amount transacted input */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Volume Amount
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs font-bold text-zinc-400 font-mono">
                                      {formCurrency === 'USDC' ? '' : '$'}
                                    </span>
                                    <input
                                      id={`input-amount-${trade.id}`}
                                      type="number"
                                      placeholder="0.00"
                                      value={formAmount}
                                      onChange={(e) =>
                                        setFormAmount(e.target.value === '' ? '' : Number(e.target.value))
                                      }
                                      className="w-full pl-7 pr-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:border-zinc-550 font-mono text-left"
                                    />
                                  </div>
                                </div>

                                {/* Forex Rate applied input */}
                                <div className="md:col-span-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Desk Forex Rate
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs font-bold text-zinc-400 font-mono">
                                      ₦
                                    </span>
                                    <input
                                      id={`input-rate-${trade.id}`}
                                      type="number"
                                      placeholder="0.00"
                                      value={formRate}
                                      onChange={(e) =>
                                        setFormRate(e.target.value === '' ? '' : Number(e.target.value))
                                      }
                                      className="w-full pl-7 pr-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:border-zinc-550 font-mono text-left"
                                    />
                                  </div>
                                </div>

                                {/* NGN equi - Calculated in real-time immediately volume or rate updates */}
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    NGN Equivalent (Calculated Real-Time)
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs font-bold text-zinc-900 font-mono">
                                      ₦
                                    </span>
                                    <input
                                      id={`input-ngn-equi-${trade.id}`}
                                      type="text"
                                      value={liveCalculatedNgnEqui ? liveCalculatedNgnEqui.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                      disabled
                                      className="w-full pl-7 pr-3 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-black text-zinc-900 cursor-not-allowed font-mono text-left shadow-inner"
                                    />
                                  </div>
                                </div>

                                {/* Destination account Beneficiary details */}
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    Destination Account (Partner/Beneficiary Address / Account)
                                  </label>
                                  <input
                                    id={`input-dest-account-${trade.id}`}
                                    type="text"
                                    placeholder="Enter final payout coordinates"
                                    value={formDestAccount}
                                    onChange={(e) => setFormDestAccount(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-zinc-550 font-mono"
                                  />
                                </div>

                                {/* Collection bank account model details */}
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 font-sans">
                                    91-Pay Beneficiary Collection Account
                                  </label>
                                  <input
                                    id={`input-beneficiary-account-${trade.id}`}
                                    type="text"
                                    placeholder="Enter 91-Pay collection bank account used"
                                    value={formBeneficiaryAccount}
                                    onChange={(e) => setFormBeneficiaryAccount(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-zinc-550 font-mono"
                                  />
                                </div>

                                {/* bank_executed_timestamp localized Datetime element matching bank slip */}
                                <div className="md:col-span-2">
                                  <label className="block text-[10px] font-bold text-zinc-500 font-mono tracking-wider uppercase mb-1.5 flex justify-between font-sans">
                                    <span>Bank Executed Timestamp (Portal slip date/time)</span>
                                    <span className="text-zinc-400 font-mono font-bold lowercase">Target matching timezone</span>
                                  </label>
                                  <input
                                    id={`input-bank-execution-time-${trade.id}`}
                                    type="datetime-local"
                                    value={formBankExecutionTime}
                                    onChange={(e) => setFormBankExecutionTime(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-550 font-mono"
                                  />
                                </div>

                                {/* Fast timestamp filler controls */}
                                <div className="md:col-span-2 flex items-end gap-1.5 pb-[2px]">
                                  <button
                                    id={`time-filler-stamp-${trade.id}`}
                                    type="button"
                                    onClick={() => setFormBankExecutionTime(trade.app_initiation_timestamp.slice(0, 16))}
                                    className="flex-1 text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 py-2 rounded-lg text-zinc-700 font-mono uppercase cursor-pointer"
                                  >
                                    Match App Stamp Time
                                  </button>
                                  <button
                                    id={`time-filler-now-${trade.id}`}
                                    type="button"
                                    onClick={() => setFormBankExecutionTime(new Date().toISOString().slice(0, 16))}
                                    className="flex-1 text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 py-2 rounded-lg text-zinc-700 font-mono uppercase cursor-pointer"
                                  >
                                    Match Current Clock Now
                                  </button>
                                </div>
                              </div>

                              {/* Form submit bar */}
                              <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
                                <div className="text-xs text-rose-700 flex items-center gap-1 font-bold">
                                  {(!formAmount || !formRate || !formDestAccount || !formBeneficiaryAccount) && (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>All blotting columns are recommended for auditing trace.</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    id={`cancel-reconcile-${trade.id}`}
                                    onClick={() => setExpandedTradeId(null)}
                                    className="px-4 py-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent rounded-xl text-xs font-semibold transition-colors uppercase cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    id={`btn-submit-re reconciliation-${trade.id}`}
                                    onClick={() => handleSubmitReconciliation(trade)}
                                    className="px-6 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-black tracking-wider rounded-xl transition-all shadow-md active:scale-95 uppercase flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    Submit Reconciliation
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Completed History Grid / Table view */}
            {eodSubTab === 'completed' && (
              <div id="completed-grid-area">
                {filteredCompleted.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                    <HistoryNotLoadedIcon className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-zinc-850">No Reconciled Slips Found</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                      Either no trades are executed yet, or your search query matches no results.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <table id="completed-history-table" className="w-full text-left text-xs min-w-[1240px]">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 uppercase font-mono tracking-wider">
                          <th className="p-4">Alphanumeric Token</th>
                          <th className="p-4">Lifecycle Status</th>
                          <th className="p-4">Desk Unit</th>
                          <th className="p-4">Corridor / Type</th>
                          <th className="p-4">Merchant Partner / Bank</th>
                          <th className="p-4">Transacted Volume</th>
                          <th className="p-4">NGN Equivalent</th>
                          <th className="p-4">SLA Elapsed Duration</th>
                          {activeUser.username === 'Philip' && <th className="p-4 text-rose-600">Admin Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-medium">
                        {filteredCompleted.map((t) => {
                          const isSuccess = t.status === 'Successfully Executed';
                          const isPhantom = t.status === 'Critical Error: Phantom Token';
                          return (
                            <tr
                              id={`completed-row-${t.id}`}
                              key={t.id}
                              className="hover:bg-zinc-50 transition-colors"
                            >
                              {/* Token */}
                              <td className="p-4 font-black font-mono text-zinc-900 tracking-wider text-sm">
                                {t.token}
                              </td>

                              {/* Lifecycle Status */}
                              <td className="p-4">
                                {isSuccess && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                    Successfully Executed
                                  </span>
                                )}
                                {isPhantom && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    Phantom Token
                                  </span>
                                )}
                              </td>

                              {/* Unit */}
                              <td className="p-4 text-zinc-650 font-mono">
                                {t.unit || 'Treasury'}
                              </td>

                              {/* Corridor / Type */}
                              <td className="p-4">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 font-bold">
                                    {t.corridor}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                                      t.trade_type === 'Buy'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {t.trade_type}
                                  </span>
                                </div>
                              </td>

                              {/* Partner / Bank */}
                              <td className="p-4">
                                {isSuccess ? (
                                  <div>
                                    <div className="text-zinc-900 font-bold flex items-center gap-1 font-sans">
                                      {t.partner}
                                    </div>
                                    <div className="text-[9px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                                      <Building2 className="w-2.5 h-2.5 text-zinc-450" />
                                      {t.source_bank || 'Unspecified'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 font-mono">N/A - Audited</span>
                                )}
                              </td>

                              {/* Volume Amount Traded */}
                              <td className="p-4 font-mono font-bold text-zinc-800">
                                {isSuccess && t.amount ? (
                                  <div>
                                    <div className="font-bold">
                                      {t.amount.toLocaleString()} <span className="text-zinc-450 text-[10px]">{t.currency}</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-400 mt-0.5 font-sans font-medium">
                                      @ Rate {t.rate}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-zinc-405">N/A</span>
                                )}
                              </td>

                              {/* NGN Equivalent */}
                              <td className="p-4 font-mono text-zinc-900 font-black text-sm">
                                {isSuccess && t.ngn_equi ? (
                                  `₦${t.ngn_equi.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                ) : (
                                  <span className="text-zinc-400">-</span>
                                )}
                              </td>

                              {/* SLA Status & Elapsed minutes */}
                              <td className="p-4">
                                {isSuccess && typeof t.sla_elapsed_minutes === 'number' ? (
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                                        t.sla_status === 'On Time'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                                      }`}
                                    >
                                      {t.sla_status}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      {t.sla_elapsed_minutes} oper-mins
                                    </span>
                                  </div>
                                ) : isPhantom ? (
                                  <span className="text-xs text-rose-700 font-black font-mono">
                                    Fails: App stamp exceeded 3 Hours with zero execution
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 font-mono">-</span>
                                )}
                              </td>
                              {activeUser.username === 'Philip' && (
                                <td className="p-4">
                                  <button
                                    id={`delete-completed-${t.id}`}
                                    onClick={() => handleDeleteTrade(t.id, t.token)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors uppercase font-mono text-[9px] font-bold cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        )}

        {/* SCREEN 3: CORPORATE SETTLEMENT BANK DETAILS SETTINGS */}
        {activeTab === 'banks' && (
          <div id="bank-settings-section" className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 bg-indigo-50 text-[#5856D6] rounded-xl">
                    <Building2 className="w-6 h-6 stroke-[2]" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-zinc-900 font-sans">
                      Settlement Directory Configuration
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium font-sans mt-0.5">
                      Fatimah's control portal to configure bank settlement instructions used on Trade Summary Slips.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 rounded-xl px-4 py-2.5 text-xs text-indigo-900 font-mono">
                <Shield className="w-4 h-4 text-[#5856D6]" />
                <span className="font-semibold">
                  Authorized Role: Fatimah (FX Desk Operations Supervisor)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Configuration Desk panel (Add bank) */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-zinc-400 font-mono uppercase mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-800" />
                    ADD SETTLEMENT ACCOUNT
                  </h3>

                  {activeUser.username === 'Fatimah' ? (
                    <form onSubmit={handleCreateBank} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Bank Name
                        </label>
                        <input
                          id="new-bank-name"
                          type="text"
                          value={newBankName}
                          onChange={(e) => setNewBankName(e.target.value)}
                          placeholder="e.g. Sterling Bank Plc"
                          className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Account Name
                        </label>
                        <input
                          id="new-account-name"
                          type="text"
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          placeholder="e.g. 91-Pay Sterling Settlement Cole"
                          className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                            Account Number
                          </label>
                          <input
                            id="new-account-number"
                            type="text"
                            value={newAccountNumber}
                            onChange={(e) => setNewAccountNumber(e.target.value)}
                            placeholder="e.g. 1019483849"
                            className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                            Settlement Currency
                          </label>
                          <select
                            id="new-bank-currency"
                            value={newCurrency}
                            onChange={(e) => setNewCurrency(e.target.value as TradeCurrency)}
                            className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-mono"
                          >
                            {['USD', 'EUR', 'GBP', 'KES', 'GHS', 'XOF', 'NGN'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        id="btn-add-bank-submit"
                        type="submit"
                        className="w-full mt-4 py-3 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-black tracking-widest rounded-xl uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        CREATE SETTLEMENT PROFILE
                      </button>
                    </form>
                  ) : (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-center text-zinc-800">
                      <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                        Read-Only Access Mode
                      </h4>
                      <p className="text-xs text-zinc-650 mt-1.5 leading-relaxed">
                        Your active session is signed under <strong>{activeUser.full_name}</strong>. Only <strong>Fatimah</strong> is authorized to configure corporate settlement assets.
                      </p>
                      <button
                        id="btn-switch-to-fatimah"
                        onClick={() => {
                          const fatimah = FX_USERS.find(user => user.username === 'Fatimah');
                          if (fatimah) {
                            setActiveUser(fatimah);
                            showToast('Switched session to Fatimah desk. Authority updated.', 'success');
                          }
                        }}
                        className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer"
                      >
                        Sign in as Fatimah
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Settlement Directory Directory Table */}
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black tracking-widest text-zinc-400 font-mono uppercase mb-4">
                  ACTIVE CORPORATE SETTLEMENT DIRECTORY
                </h3>

                {bankDetails.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                    <Building2 className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-zinc-800">Directory Empty</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                      No registered banks. Please use the Fatimah console panel to insert the active corporate banking details.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bankDetails.map((b) => (
                      <div
                        id={`bank-card-${b.id}`}
                        key={b.id}
                        className="p-5 border border-zinc-200 rounded-2xl bg-zinc-50/40 relative flex flex-col justify-between hover:border-zinc-300 hover:shadow-sm transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black font-mono bg-[#EAEAFF] text-[#5856D6] border border-[#D5D3FF]">
                              <Globe2 className="w-3.5 h-3.5" />
                              {b.currency} Account
                            </span>
                            {activeUser.username === 'Fatimah' && (
                              <button
                                id={`btn-delete-bank-${b.id}`}
                                onClick={() => handleDeleteBank(b.id, b.bankName)}
                                title="Remove bank"
                                className="p-2 bg-white border border-rose-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50/50 shadow-sm transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Bank Partner</p>
                              <p className="text-sm font-black text-zinc-900 tracking-tight font-sans">{b.bankName}</p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Account Name</p>
                              <p className="text-xs font-bold text-zinc-750 font-sans break-all">{b.accountName}</p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Account Coordinates</p>
                              <p className="text-sm font-black font-mono text-[#5856D6] tracking-wider select-all">{b.accountNumber}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Split Grid for Client configuration and trade template text */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Client Config Desk Panel */}
              <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-[#5856D6] font-mono uppercase mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    ADD CLIENT PARTNER
                  </h3>

                  {activeUser.username === 'Fatimah' ? (
                    <form onSubmit={handleCreateClient} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Client / Institution Name
                        </label>
                        <input
                          id="new-client-name"
                          type="text"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="e.g. Nairagram FX Partner"
                          className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Contact Email (Optional)
                        </label>
                        <input
                          id="new-client-email"
                          type="email"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                          placeholder="e.g. operations@nairagram.com"
                          className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 tracking-widest font-mono uppercase mb-1.5">
                          Internal Notes
                        </label>
                        <textarea
                          id="new-client-notes"
                          rows={2}
                          value={newClientNotes}
                          onChange={(e) => setNewClientNotes(e.target.value)}
                          placeholder="Special settlement agreements or SLAs"
                          className="w-full px-3 py-2 border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <button
                        id="btn-add-client-submit"
                        type="submit"
                        className="w-full mt-4 py-3 bg-[#5856D6] hover:bg-[#4745B4] text-white text-xs font-black tracking-widest rounded-xl uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        CREATE CLIENT CONFIGURATION
                      </button>
                    </form>
                  ) : (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-center text-zinc-800">
                      <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                        Read-Only Access Mode
                      </h4>
                      <p className="text-xs text-zinc-650 mt-1.5 leading-relaxed">
                        Your active session is signed under <strong>{activeUser.full_name}</strong>. Only <strong>Fatimah</strong> is authorized to configure corporate client directories.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Columns: Active Clients & Customizable Template Card */}
              <div className="lg:col-span-2 space-y-8">
                {/* Active clients directory */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-black tracking-widest text-[#5856D6] font-mono uppercase mb-4">
                    ACTIVE CLIENT PARTNERS DIRECTORY
                  </h3>

                  {clients.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                      <p className="text-sm font-semibold text-zinc-800">No registered client partners</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clients.map((c) => (
                        <div
                          id={`client-card-${c.id}`}
                          key={c.id}
                          className="p-5 border border-zinc-200 rounded-2xl bg-zinc-50/40 relative flex flex-col justify-between hover:border-zinc-300 hover:shadow-sm transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black font-mono bg-zinc-100 text-zinc-800 border border-zinc-200">
                                Client Partner
                              </span>
                              {activeUser.username === 'Fatimah' && (
                                <button
                                  id={`btn-delete-client-${c.id}`}
                                  onClick={() => handleDeleteClient(c.id, c.name)}
                                  title="Remove client"
                                  className="p-2 bg-white border border-rose-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50/50 shadow-sm transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm font-black text-zinc-900 tracking-tight">{c.name}</p>
                              {c.email && (
                                <p className="text-xs text-zinc-500 font-mono italic break-all">{c.email}</p>
                              )}
                              {c.notes && (
                                <p className="text-xs text-zinc-650 mt-1 leading-snug">{c.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customizable Trade Summary Template Card */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-black tracking-widest text-[#5856D6] font-mono uppercase mb-1.5 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    CUSTOMIZABLE TRADE SUMMARY TEMPLATE
                  </h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    Modify the message template. Changes are saved dynamically and applied when copies or new slips are generated.
                  </p>

                  <div className="space-y-4">
                    <textarea
                      id="trade-summary-template-textarea"
                      rows={8}
                      className="w-full px-3 py-2 font-mono text-xs border border-zinc-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50 text-zinc-800 leading-relaxed"
                      value={tradeSummaryTemplate}
                      onChange={(e) => handleUpdateTemplate(e.target.value)}
                      disabled={activeUser.username !== 'Fatimah'}
                      placeholder="Enter customizable summary string here..."
                    />

                    {activeUser.username !== 'Fatimah' && (
                      <p className="text-[10px] text-amber-600 font-semibold italic">
                        * Note: Only Fatimah is authorized to modify the trade summary template.
                      </p>
                    )}

                    <div className="p-4 bg-zinc-100 rounded-xl border border-zinc-200">
                      <p className="text-[10px] font-black uppercase text-zinc-500 font-mono mb-2">
                        Supported Replacement Dynamic Tags Cheat Sheet
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono text-zinc-650">
                        <div><code>{"{trade_ref}"}</code> - Code (e.g. 91P-TR5K)</div>
                        <div><code>{"{client_name}"}</code> - Selected Client</div>
                        <div><code>{"{type}"}</code> - buys / sells</div>
                        <div><code>{"{amount}"}</code> - Formatted amount</div>
                        <div><code>{"{rate}"}</code> - Exchange rate</div>
                        <div><code>{"{currency}"}</code> - Currency code</div>
                        <div><code>{"{symbol}"}</code> - Currency symbol</div>
                        <div><code>{"{value_date}"}</code> - Value date</div>
                        <div><code>{"{account_name}"}</code> - Bank Account Name</div>
                        <div><code>{"{account_number}"}</code> - Bank Account Number</div>
                        <div><code>{"{bank_name}"}</code> - Settlement Bank</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Desktop footer with audit parameters */}
      <footer id="fx-hub-footer" className="mt-auto border-t border-zinc-200 bg-white py-6 px-4 text-center text-[10px] text-zinc-400 font-mono shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>
            System Active Desk Operator Code: 91P-SYSTEM-FX • Powered by Cloud Run & Firestore
          </p>
          <p className="text-zinc-500 font-bold">
            Audit Mode: {dbPortal.isCloudMode() ? '🔴 Firestore Enterprise Live Cloud Node' : '🟢 Local Sandbox Browser Storage Mode'}
          </p>
        </div>
      </footer>
    </div>
  );
}

// Help Icon Components to satisfy linter typecheck variables
function HistoryNotLoadedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
