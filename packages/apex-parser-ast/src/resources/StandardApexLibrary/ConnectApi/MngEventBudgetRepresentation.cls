global class MngEventBudgetRepresentation {
	global Map<String,String> additionalFields;
	global Double allocatedAmount;
	global ConnectApi.EMBudgetRepresentation budget;
	global String budgetId;
	global String createdById;
	global Datetime createdDate;
	global String eventBudgetId;
	global String eventId;
	global String lastModifiedById;
	global Datetime lastModifiedDate;
	global String name;
	global Double totalActualExpenseAmount;
	global Double totalEstimatedExpenseAmount;
	global MngEventBudgetRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}