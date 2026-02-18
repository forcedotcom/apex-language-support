global class GetInventoryAllocationLineItemDataRepresentation {
	global List<ConnectApi.GetInventoryAllocationLocationDataRepresentation> allocations;
	global Boolean isSerialised;
	global String lineItemId;
	global Double lineItemQuantity;
	global Double pendingAllocatedQuantity;
	global String productId;
	global String productName;
	global Double requestedAllocatedQuantity;
	global String status;
	global Double successfulAllocatedQuantity;
	global GetInventoryAllocationLineItemDataRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}