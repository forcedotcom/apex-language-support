global class PromotionInfo {
	global commercepromotions.CouponInfo couponInfo;
	global String displayName;
	global String id;
	global Boolean isAutomatic;
	global Integer priority;
	global PromotionInfo(String id, String displayName, Boolean isAutomatic, Integer priority, commercepromotions.CouponInfo couponInfo) { }
	global PromotionInfo() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Map<String,Object> getAsMap() { }
	global commercepromotions.CouponInfo getCouponInfo() { }
	global String getDisplayName() { }
	global String getId() { }
	global Boolean getIsAutomatic() { }
	global Integer getPriority() { }
	global Integer hashCode() { }
	global String toString() { }

}