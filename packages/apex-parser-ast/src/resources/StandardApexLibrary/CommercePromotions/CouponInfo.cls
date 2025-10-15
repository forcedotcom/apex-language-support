global class CouponInfo {
	global String couponCode;
	global commercepromotions.CouponInfo.ErrorCode couponErrorCode;
	global String id;
	global Boolean isValidCoupon;
	global CouponInfo(String id, String couponCode, Boolean isValidCoupon, commercepromotions.CouponInfo.ErrorCode couponErrorCode) { }
	global CouponInfo() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Map<String,Object> getAsMap() { }
	global String getCouponCode() { }
	global commercepromotions.CouponInfo.ErrorCode getCouponErrorCode() { }
	global String getId() { }
	global Boolean getIsValidCoupon() { }
	global Integer hashCode() { }
	global String toString() { }
global enum ErrorCode {
INVALIDCOUPON,
PROMOTIONALREADYAPPLIED,
UNQUALIFIEDCART
}

}