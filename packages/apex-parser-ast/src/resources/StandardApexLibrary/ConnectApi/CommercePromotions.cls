/**
 * Evaluate promotions for Commerce orders. Get coupon code redemption usage.
 */
global class CommercePromotions {

  global CommercePromotions() {}

  global static ConnectApi.CouponCodeRedemptionCollection decreaseRedemption(ConnectApi.CouponCodeRedemptionInput couponCodeRedemption) {}

  global static ConnectApi.PromotionEvaluation evaluate(ConnectApi.PromotionEvaluateInput salesTransaction) {}

  global static ConnectApi.CouponCodeRedemptionCollection increaseRedemption(ConnectApi.CouponCodeRedemptionInput couponCodeRedemption) {}

  global Object clone() {}

}