global class BankPaymentMethodOutput {
	global ConnectApi.AccountHolderType accountHolderType;
	global String accountId;
	global ConnectApi.AccountType accountType;
	global String bankCode;
	global String bankName;
	global ConnectApi.BankType bankType;
	global String comments;
	global String email;
	global String gatewayToken;
	global String gatewayTokenDetails;
	global String lastFour;
	global String mandateUrl;
	global String name;
	global String savedPaymentMethodId;
	global ConnectApi.StandardEntryClassCode standardEntryClassCode;
	global BankPaymentMethodOutput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}