global class PaymentInitiationGateway {
	global String configurationId;
	global String hostedLinkUrl;
	global List<RichMessaging.PaymentMethodHint> methodHints;
	global String paymentConfigurationName;
	global String providerName;
	global List<RichMessaging.PaymentGatewayProperties> providerParameters;
	global PaymentInitiationGateway() { }
	global Object clone() { }

}