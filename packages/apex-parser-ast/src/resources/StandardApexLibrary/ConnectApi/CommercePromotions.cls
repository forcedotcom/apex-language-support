/**
 * Evaluate promotions for Commerce orders. Get coupon code redemption usage.
 */
global class CommercePromotions {

  public static ConnectApi.CouponCodeRedemptionCollection decreaseRedemption(ConnectApi.CouponCodeRedemptionInput couponCodeRedemption) {}

  global static ConnectApi.PromotionEvaluation evaluate(ConnectApi.PromotionEvaluateInput salesTransaction) {}

  public static ConnectApi.CouponCodeRedemptionCollection increaseRedemption(ConnectApi.CouponCodeRedemptionInput couponCodeRedemption) {}

}