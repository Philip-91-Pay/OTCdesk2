export type TradeStatus =
  | 'Pending Reconciliation'
  | 'Successfully Executed'
  | 'Critical Error: Phantom Token';

export type TradeCorridor =
  | 'NGN'
  | 'GHS'
  | 'KES'
  | 'XOF'
  | 'AOA'
  | 'CDF'
  | 'VND'
  | 'USD';

export type TradeType = 'Buy' | 'Sell';

export type TradeCurrency = 'USD' | 'USDC' | 'EUR' | 'GBP';

export type TradePartner =
  | 'Nairagram'
  | 'Juicyway'
  | 'Cosmo Remit'
  | 'Chinelo Fx'
  | 'Rolla'
  | 'Lilian'
  | 'Alex Adino'
  | 'Regulus'
  | 'Starks'
  | 'Vgg'
  | 'Fincra'
  | 'Blusalt';

export interface Trade {
  // Internal Tracking Columns (Auto-Captured)
  id: string; // UUID (Primary Key, auto-generated)
  token: string; // Unique alphanumeric code format: 91P-XXXX
  app_initiation_timestamp: string; // ISO 8601 string containing system timezone
  status: TradeStatus;

  // Standardized Blotter Columns
  unit: string; // Defaults to 'Treasury'
  corridor: TradeCorridor;
  trade_date: string; // YYYY-MM-DD
  value_date: string; // YYYY-MM-DD
  partner: TradePartner;
  source_bank: string;
  trade_type: TradeType;
  currency: TradeCurrency;
  amount: number | null;
  rate: number | null;
  ngn_equi: number | null; // Amount * Rate
  destination_account: string;
  beneficiary_account: string;
  bank_executed_timestamp: string; // ISO string matching bank portal transaction slip
  ngn_received_timestamp?: string; // Captured system timestamp for NGN received
  usd_payout_timestamp?: string; // Captured system timestamp for USD payout
  cancelled_timestamp?: string; // Captured system timestamp for trade cancelled
  client_name?: string; // Dynaic Client name associated with this trade

  // Calculated SLA columns
  sla_status?: 'On Time' | 'SLA Breach';
  sla_elapsed_minutes?: number;
}

export interface BankDetail {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: TradeCurrency;
}

export interface ClientDetail {
  id: string;
  name: string;
  email?: string;
  notes?: string;
}

export type FXUser = 'Fatimah' | 'Clement' | 'Philip';

export interface FXUserProfile {
  username: FXUser;
  email: string;
  role: string;
}

export const FX_USERS: FXUserProfile[] = [
  { username: 'Fatimah', email: 'fatimah@91-payments.com', role: 'Treasury Lead' },
  { username: 'Clement', email: 'clement@91-payments.com', role: 'Senior Trader' },
  { username: 'Philip', email: 'philip@91-payments.com', role: 'Operations Admin' },
];
