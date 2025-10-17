global class BuyerGroupRequest {
	global BuyerGroupRequest(String storeId, String accountId, Map<String,Object> requestContextParameters) { }
	global Object clone() { }
	global String getAccountId() { }
	global Map<String,Object> getRequestContextParameters() { }
	global String getStoreId() { }

}