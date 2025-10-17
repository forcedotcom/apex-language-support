global class BankPaymentMethodRequest {
	global String accountHolderFirstName;
	global String accountHolderLastName;
	global String accountHolderName;
	global commercepayments.AccountHolderType accountHolderType;
	global String accountId;
	global String accountNumber;
	global commercepayments.AccountType accountType;
	global Boolean autoPay;
	global String bankCode;
	global commercepayments.BankType bankType;
	global String comments;
	global String email;
	global String mandate;
	global String nickName;
	global commercepayments.StandardEntryClassCode standardEntryClassCode;
	global BankPaymentMethodRequest() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}