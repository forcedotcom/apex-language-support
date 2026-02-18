global class BankPaymentMethodRequest {
	global String accountHolderFirstName;
	global String accountHolderLastName;
	global String accountHolderName;
	global ConnectApi.AccountHolderType accountHolderType;
	global String accountId;
	global String accountNumber;
	global ConnectApi.AccountType accountType;
	global Boolean autoPay;
	global String bankCode;
	global ConnectApi.BankType bankType;
	global String comments;
	global String email;
	global String mandate;
	global String nickName;
	global ConnectApi.StandardEntryClassCode standardEntryClassCode;
	global BankPaymentMethodRequest() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}