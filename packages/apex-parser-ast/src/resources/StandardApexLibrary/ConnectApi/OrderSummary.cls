/**
 * Work with orders in Order Management.
 */
public class OrderSummary {

  public static ConnectApi.AdjustOrderSummaryOutputRepresentation adjustPreview(String orderSummaryId, ConnectApi.AdjustOrderItemSummaryInputRepresentation adjustInput) {}

  public static ConnectApi.AdjustOrderSummaryOutputRepresentation adjustSubmit(String orderSummaryId, ConnectApi.AdjustOrderItemSummaryInputRepresentation adjustInput) {}

  public static ConnectApi.CreateCreditMemoOutputRepresentation createCreditMemo(String orderSummaryId, ConnectApi.CreateCreditMemoInputRepresentation creditMemoInput) {}

  public static ConnectApi.CreateMultipleInvoicesFromChangeOrdersOutputRepresentation createMultipleInvoices(ConnectApi.CreateMultipleInvoicesFromChangeOrdersInputRepresentation invoicesInput) {}

  public static ConnectApi.EnsureFundsAsyncOutputRepresentation ensureFundsAsync(String orderSummaryId, ConnectApi.EnsureFundsAsyncInputRepresentation ensureFundsInput) {}

  public static ConnectApi.EnsureRefundsAsyncOutputRepresentation ensureRefundsAsync(String orderSummaryId, ConnectApi.EnsureRefundsAsyncInputRepresentation ensureRefundsInput) {}

  public static ConnectApi.MultipleAsyncOutputRepresentation multipleEnsureFundsAsync(ConnectApi.MultipleEnsureFundsAsyncInputRepresentation multipleEnsureFundsInput) {}

  public static ConnectApi.PreviewCancelOutputRepresentation previewCancel(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  public static ConnectApi.PreviewReturnOutputRepresentation previewReturn(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  public static ConnectApi.SubmitCancelOutputRepresentation submitCancel(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

  public static ConnectApi.SubmitReturnOutputRepresentation submitReturn(String orderSummaryId, ConnectApi.ChangeInputRepresentation changeInput) {}

}