global class PromotionTarget {
	global Decimal adjustmentAmount;
	global Decimal adjustmentPercent;
	global commercepromotions.PromotionTarget.AdjustmentType adjustmentType;
	global String id;
	global Integer priority;
	global commercepromotions.PromotionTarget.AssociationStatus promotionTargetAssociationStatus;
	global List<commercepromotions.PromotionTargetLineItem> promotionTargetLineItems;
	global String targetId;
	global commercepromotions.PromotionTarget.TargetType targetType;
	global PromotionTarget(String id, commercepromotions.PromotionTarget.TargetType targetType, String targetId, commercepromotions.PromotionTarget.AdjustmentType adjustmentType, Decimal adjustmentAmount, Decimal adjustmentPercent, Integer priority, commercepromotions.PromotionTarget.AssociationStatus promotionTargetAssociationStatus, List<commercepromotions.PromotionTargetLineItem> promotionTargetLineItems) { }
	global PromotionTarget() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Decimal getAdjustmentAmount() { }
	global Decimal getAdjustmentPercent() { }
	global commercepromotions.PromotionTarget.AdjustmentType getAdjustmentType() { }
	global Map<String,Object> getAsMap() { }
	global String getId() { }
	global Integer getPriority() { }
	global commercepromotions.PromotionTarget.AssociationStatus getPromotionTargetAssociationStatus() { }
	global List<commercepromotions.PromotionTargetLineItem> getPromotionTargetLineItems() { }
	global String getTargetId() { }
	global commercepromotions.PromotionTarget.TargetType getTargetType() { }
	global Integer hashCode() { }
	global String toString() { }
global enum AdjustmentType {
FIXEDAMOUNTOFFLINEITEMTOTAL,
FIXEDAMOUNTOFFTRANSACTION,
FIXEDAMOUNTOFFUNITPRICE,
FIXEDPRICE,
PERCENTAGEDISCOUNT,
TOTALFIXEDPRICE
}
global enum AssociationStatus {
BLOCKEDEXCLUSIVE,
INVALID,
VALID
}
global enum TargetType {
TYPE_PRODUCT,
TYPE_PRODUCTCATEGORY,
TYPE_TRANSACTION
}

}