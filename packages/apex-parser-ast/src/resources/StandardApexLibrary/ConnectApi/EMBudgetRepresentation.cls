global class EMBudgetRepresentation {
	global String accountId;
	global Map<String,String> additionalFields;
	global Double amount;
	global String description;
	global Double estimatedUtilizationAmount;
	global String id;
	global Boolean isSubmitted;
	global String name;
	global Datetime periodEndDate;
	global Datetime periodStartDate;
	global Double quantity;
	global String status;
	global String type;
	global EMBudgetRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}