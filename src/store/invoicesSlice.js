/**
 * @file invoicesSlice.js
 * @description Central Redux slice for AR Invoices and Accounts Receivable billing management.
 * Provides async thunks for:
 * - Fetching filtered invoices
 * - Fetching detailed invoice record with line items, payments, adjustments, and timeline
 * - Sending draft invoices (single and bulk)
 * - Voiding invoices with reason
 * - Deleting draft invoices
 * - Recording payments with overpayment safeguards and ledger updates
 * - Applying credits and adjustments
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { arService } from '../services/arService';
import { addToast } from './toastSlice';
import { fetchArPayments } from './paymentsSlice';

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (filters, { rejectWithValue }) => {
    try {
      return await arService.getInvoices(filters);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invoices');
    }
  }
);

export const fetchInvoiceByIdThunk = createAsyncThunk(
  'invoices/fetchInvoiceById',
  async (id, { rejectWithValue }) => {
    try {
      return await arService.getInvoiceById(id);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invoice details');
    }
  }
);

export const sendInvoiceThunk = createAsyncThunk(
  'invoices/sendInvoice',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const updated = await arService.sendInvoice(id);
      dispatch(
        addToast({
          type: 'success',
          title: 'Invoice Sent',
          message: `Invoice ${updated.invoiceNumber || updated.id} has been moved to Open status and sent to client.`
        })
      );
      dispatch(fetchInvoices());
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Failed to Send Invoice',
          message: err.message || 'An error occurred while sending the invoice.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const bulkSendInvoicesThunk = createAsyncThunk(
  'invoices/bulkSendInvoices',
  async (ids, { dispatch, rejectWithValue }) => {
    try {
      const count = await arService.sendInvoices(ids);
      dispatch(
        addToast({
          type: 'success',
          title: 'Invoices Sent',
          message: `Successfully sent ${count} draft invoice(s) to clients.`
        })
      );
      dispatch(fetchInvoices());
      return count;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Bulk Send Failed',
          message: err.message || 'Failed to send selected invoices.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const voidInvoiceThunk = createAsyncThunk(
  'invoices/voidInvoice',
  async ({ id, reason }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await arService.voidInvoice(id, reason);
      dispatch(
        addToast({
          type: 'warning',
          title: 'Invoice Voided',
          message: `Invoice ${updated.invoiceNumber || updated.id} has been voided. Balance set to zero.`
        })
      );
      dispatch(fetchInvoices());
      return updated;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Failed to Void Invoice',
          message: err.message || 'Could not void invoice.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const deleteInvoiceThunk = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await arService.deleteInvoice(id);
      dispatch(
        addToast({
          type: 'success',
          title: 'Invoice Deleted',
          message: `Draft invoice ${id} was deleted.`
        })
      );
      dispatch(fetchInvoices());
      return id;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Failed to Delete Invoice',
          message: err.message || 'Could not delete invoice.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const recordPaymentThunk = createAsyncThunk(
  'invoices/recordPayment',
  async (paymentData, { dispatch, rejectWithValue }) => {
    try {
      const result = await arService.recordPayment(paymentData);
      dispatch(
        addToast({
          type: 'success',
          title: 'Payment Recorded',
          message: `Successfully applied $${result.payment.amount.toLocaleString()} via ${result.payment.paymentMethod} (Ref: ${result.payment.referenceNumber}). Remaining balance: $${result.invoice.balance.toLocaleString()}.`
        })
      );
      dispatch(fetchInvoices());
      dispatch(fetchArPayments());
      return result;
    } catch (err) {
      dispatch(
        addToast({
          type: 'danger',
          title: 'Payment Record Failed',
          message: err.message || 'Failed to record payment.'
        })
      );
      return rejectWithValue(err.message);
    }
  }
);

export const addAdjustmentThunk = createAsyncThunk(
  'invoices/addAdjustment',
  async (adjustmentData, { dispatch, rejectWithValue }) => {
    try {
      const adj = await arService.addAdjustment(adjustmentData);
      dispatch(
        addToast({
          type: 'success',
          title: 'Adjustment Applied',
          message: `Applied ${adj.type} adjustment of $${adj.amount.toLocaleString()} to invoice.`
        })
      );
      dispatch(fetchInvoices());
      dispatch(fetchInvoiceByIdThunk(adjustmentData.invoiceId));
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

export const fetchArAgingDataThunk = createAsyncThunk(
  'invoices/fetchArAgingData',
  async (_, { rejectWithValue }) => {
    try {
      return await arService.getArAgingData();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to calculate aging report');
    }
  }
);

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    selectedInvoice: null,
    detailStatus: 'idle',
    agingData: null,
    agingStatus: 'idle',
    actionLoading: false
  },
  reducers: {
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Single Invoice
      .addCase(fetchInvoiceByIdThunk.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(fetchInvoiceByIdThunk.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchInvoiceByIdThunk.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.error = action.payload;
      })

      // Record Payment
      .addCase(recordPaymentThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(recordPaymentThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (state.selectedInvoice && state.selectedInvoice.id === action.payload.invoice.id) {
          state.selectedInvoice = action.payload.invoice;
        }
      })
      .addCase(recordPaymentThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Send Invoice
      .addCase(sendInvoiceThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(sendInvoiceThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (state.selectedInvoice && state.selectedInvoice.id === action.payload.id) {
          state.selectedInvoice = action.payload;
        }
      })
      .addCase(sendInvoiceThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Void Invoice
      .addCase(voidInvoiceThunk.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(voidInvoiceThunk.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (state.selectedInvoice && state.selectedInvoice.id === action.payload.id) {
          state.selectedInvoice = action.payload;
        }
      })
      .addCase(voidInvoiceThunk.rejected, (state) => {
        state.actionLoading = false;
      })

      // Aging Data
      .addCase(fetchArAgingDataThunk.pending, (state) => {
        state.agingStatus = 'loading';
      })
      .addCase(fetchArAgingDataThunk.fulfilled, (state, action) => {
        state.agingStatus = 'succeeded';
        state.agingData = action.payload;
      })
      .addCase(fetchArAgingDataThunk.rejected, (state, action) => {
        state.agingStatus = 'failed';
      });
  }
});

export const { setSelectedInvoice, clearSelectedInvoice } = invoicesSlice.actions;
export const selectInvoices = (state) => state.invoices.items;
export const selectInvoicesStatus = (state) => state.invoices.status;
export const selectSelectedInvoice = (state) => state.invoices.selectedInvoice;
export const selectInvoiceDetailStatus = (state) => state.invoices.detailStatus;
export const selectArAgingData = (state) => state.invoices.agingData;
export const selectArAgingStatus = (state) => state.invoices.agingStatus;
export const selectInvoiceActionLoading = (state) => state.invoices.actionLoading;

export default invoicesSlice.reducer;
