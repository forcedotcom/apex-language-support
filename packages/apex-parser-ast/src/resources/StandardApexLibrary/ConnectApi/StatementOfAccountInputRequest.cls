global class StatementOfAccountInputRequest {
	global List<String> associatedAccountIds;
	global String correlationId;
	global String documentTemplateId;
	global Boolean shouldShowOpenBalancesOnly;
	global ConnectApi.StatementSortByEnum sortBy;
	global ConnectApi.StatementSortOrderEnum sortingOrder;
	global String startDate;
	global List<String> transactionTypes;
	global StatementOfAccountInputRequest() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}