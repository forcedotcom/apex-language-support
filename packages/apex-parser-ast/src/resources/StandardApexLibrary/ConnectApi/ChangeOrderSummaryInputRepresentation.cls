global class ChangeOrderSummaryInputRepresentation {
	global List<ConnectApi.ChangeOrderAdjustmentGroupSummaryInputRepresentation> adjustmentGroupSummaries;
	global List<ConnectApi.ChangeOrderItemAdjustmentLineSummaryInputRepresentation> adjustments;
	global String changeReason;
	global List<ConnectApi.ChangeOrderDeliveryGroupSummaryInputRepresentation> deliveryGroupSummaries;
	global List<ConnectApi.ChangeOrderItemSummaryInputRepresentation> items;
	global String orderReferenceNumber;
	global SObject orderSummary;
	global List<ConnectApi.ChangeOrderItemTaxLineItemSummaryInputRepresentation> taxes;
	global ChangeOrderSummaryInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}