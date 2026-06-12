/**
 * Work with orders in Order Management.
 */
global class OrderSummary {

  global OrderSummary() {}

  global static ConnectApi.AdjustOrderSummaryOutputRepresentation adjustPreview(String orderSummaryId, ConnectApi.AdjustOrderItemSummaryInputRepresentation adjustInput) {}

  global static ConnectApi.AdjustOrderSummaryOutputRepresentation adjustSubmit(String orderSummaryId, ConnectApi.AdjustOrderItemSummaryInputRepresentation adjustInput) {}

  global static ConnectApi.CreateCreditMemoOutputRepresentation createCreditMemo(String orderSummaryId, ConnectApi.CreateCreditMemoInputRepresentation creditMemoInput) {}

  global static ConnectApi.CreateMultipleInvoicesFromChangeOrdersOutputRepresentation createMultipleInvoices(ConnectApi.CreateMultipleInvoicesFromChangeOrdersInputRepresentation invoicesInput) {}

  global static ConnectApi.EnsureFundsAsyncOutputRepresentation ensureFundsAsync(String orderSummaryId, ConnectApi.EnsureFundsAsyncInputRepresentation ensureFundsInput) {}

  global static ConnectApi.EnsureRefundsAsyncOutputRepresentation ensureRefundsAsync(String orderSummaryId, ConnectApi.EnsureRefundsAsyncInputRepresentation ensureRefundsInput) {}

  global static ConnectApi.MultipleAsyncOutputRepresentation multipleEnsureFundsAsync(ConnectApi.MultipleEnsureFundsAsyncInputRepresentation multipleEnsureFundsInput) {}

  global static ConnectApi.PreviewCancelOutputRepresentation previewCancel(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  global static ConnectApi.PreviewReturnOutputRepresentation previewReturn(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  global static ConnectApi.SubmitCancelOutputRepresentation submitCancel(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  global static ConnectApi.SubmitReturnOutputRepresentation submitReturn(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  global Object clone() {}

}