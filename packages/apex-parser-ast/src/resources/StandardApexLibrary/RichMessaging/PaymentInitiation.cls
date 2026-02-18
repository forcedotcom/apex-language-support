global class PaymentInitiation {
	global RichMessaging.PaymentInitiationBoleto boleto;
	global RichMessaging.PaymentInitiationBoleto boletoValue;
	global RichMessaging.PaymentInitiationGateway gateway;
	global RichMessaging.PaymentInitiationGateway gatewayValue;
	global String mode;
	global String modeValue;
	global RichMessaging.PaymentInitiationPix pix;
	global RichMessaging.PaymentInitiationPix pixValue;
	global RichMessaging.PaymentInitiationUpi upi;
	global RichMessaging.PaymentInitiationUpi upiValue;
	global PaymentInitiation() { }
	global Object clone() { }

}