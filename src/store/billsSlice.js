/**
 * @file billsSlice.js
 * @description Central Redux Toolkit slice for Accounts Payable (AP) management.
 * Provides async thunks for:
 * - Fetching normalized, filtered bills
 * - Fetching full bill details with relations and paired margin
 * - Recording single bill disbursements
 * - Executing "Pay Selected" batch disbursements in a single confirmed action
 * - Applying deductions and adjustments
 * - Computing employee and vendor-level AP aging matrix
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apService } from '../services/apService';
import { addToast } from './toastSlice';
import { fetchApPayments } from './paymentsSlice';

export const fetchBills = createAsyncThunk(
  'bills/fetchBills',
  async (filters, { rejectWithValue }) => {
    try {
      return await apService.getBills(filters);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch bills');
    }
  }
);

export const fetchBillByIdThunk = createAsyncThunk(
  'bills/fetchBillById',
  async (id, { rejectWithValue }) => {
    try {
      return await apService.getBillById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch bill details');
    }
  }
);

export const recordApPaymentThunk = createAsyncThunk(
  'bills/recordPayment',
  async (paymentData, { dispatch, rejectWithValue }) => {
    try {
      const result = await apService.recordPayment(paymentData);
      dispatch(
        addToast({
          type: 'success',
          title: 'Payment Recorded',
          message: `Disbursed $${result.payment.amount.toLocaleString()} via ${result.payment.paymentMethod} (Ref: ${result.payment.referenceNumber}). Remaining balance: $${result.bill.balance.toLocaleString()}.`
        })
      );
      dispatch(fetchBills());
      dispatch(fetchApPayments());
      return result;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Disbursement Failed',
          message: err.message || 'Failed to record payment.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const batchPayBillsThunk = createAsyncThunk(
  'bills/batchPay',
  async (batchData, { dispatch, rejectWithValue }) => {
    try {
      const result = await apService.payBatch(batchData);
      dispatch(
        addToast({
          type: 'success',
          title: 'Batch Payment Executed',
          message: `Successfully processed ${result.count} bill disbursements totaling $${result.totalPaid.toLocaleString()} via ${batchData.paymentMethod}.`
        })
      );
      dispatch(fetchBills());
      dispatch(fetchApPayments());
      return result;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Batch Payment Failed',
          message: err.message || 'Failed to execute batch payment.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const addApAdjustmentThunk = createAsyncThunk(
  'bills/addAdjustment',
  async (adjustmentData, { dispatch, rejectWithValue }) => {
    try {
      const adj = await apService.addAdjustment(adjustmentData);
      dispatch(
        addToast({
          type: 'success',
          title: 'Adjustment Applied',
          message: `Applied ${adj.type} adjustment of $${adj.amount.toLocaleString()} to bill.`
        })
      );
      dispatch(fetchBills());
      dispatch(fetchBillByIdThunk(adjustmentData.billId));
      return adj;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Adjustment Failed',
          message: err.message || 'Failed to apply adjustment.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const fetchApAgingDataThunk = createAsyncThunk(
  'bills/fetchApAgingData',
  async (_, { rejectWithValue }) => {
    try {
      return await apService.getApAgingData();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to compute AP aging matrix');
    }
  }
);

const billsSlice = createSlice({
  name: 'bills',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    selectedBill: null,
    detailStatus: 'idle',
    agingData: null,
    agingStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    setSelectedBill: (state, action) => {
      state.selectedBill = action.payload;
    },
    clearSelectedBill: (state) => {
      state.selectedBill = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Bills
      .addCase(fetchBills.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Bill By ID
      .addCase(fetchBillByIdThunk.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(fetchBillByIdThunk.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selectedBill = action.payload;
      })
      .addCase(fetchBillByIdThunk.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.error = action.payload;
      })

      // Record Single Payment
      .addCase(recordApPaymentThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(recordApPaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (state.selectedBill && state.selectedBill.id === action.payload.bill.id) {
          state.selectedBill = action.payload.bill;
        }
      })
      .addCase(recordApPaymentThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Batch Pay
      .addCase(batchPayBillsThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(batchPayBillsThunk.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(batchPayBillsThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Add Adjustment
      .addCase(addApAdjustmentThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(addApAdjustmentThunk.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(addApAdjustmentThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // AP Aging Data
      .addCase(fetchApAgingDataThunk.pending, (state) => {
        state.agingStatus = 'loading';
      })
      .addCase(fetchApAgingDataThunk.fulfilled, (state, action) => {
        state.agingStatus = 'succeeded';
        state.agingData = action.payload;
      })
      .addCase(fetchApAgingDataThunk.rejected, (state, action) => {
        state.agingStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { setSelectedBill, clearSelectedBill } = billsSlice.actions;

export const selectBills = (state) => state.bills.items;
export const selectBillsStatus = (state) => state.bills.status;
export const selectBillsError = (state) => state.bills.error;
export const selectSelectedBill = (state) => state.bills.selectedBill;
export const selectBillDetailStatus = (state) => state.bills.detailStatus;
export const selectApAgingDataState = (state) => state.bills.agingData;
export const selectApAgingStatus = (state) => state.bills.agingStatus;
export const selectBillActionLoading = (state) => state.bills.actionLoading;

export default billsSlice.reducer;
