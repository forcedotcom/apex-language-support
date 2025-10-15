global class PromotionRequest {
	global String buyerAccountId;
	global List<String> couponCodes;
	global SObject salesTransaction;
	global String webStoreId;
	global PromotionRequest(SObject salesTransaction, String buyerAccountId, String webStoreId, List<String> couponCodes) { }
	global PromotionRequest() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Map<String,Object> getAsMap() { }
	global String getBuyerAccountId() { }
	global List<String> getCouponCodes() { }
	global SObject getSalesTransaction() { }
	global String getWebStoreId() { }
	global Integer hashCode() { }
	global String toString() { }

}