global class OrderContext {
	global List<RichMessaging.OrderBeneficiary> beneficiaries;
	global List<RichMessaging.OrderBeneficiary> beneficiariesValue;
	global String catalogId;
	global String catalogIdValue;
	global RichMessaging.PaymentCheckoutBehavior checkoutBehavior;
	global RichMessaging.PaymentCheckoutBehavior checkoutBehaviorValue;
	global RichMessaging.OrderExpiration expiration;
	global RichMessaging.OrderExpiration expirationValue;
	global RichMessaging.OrderType orderType;
	global RichMessaging.OrderType orderTypeValue;
	global String referenceId;
	global String referenceIdValue;
	global OrderContext() { }
	global Object clone() { }

}