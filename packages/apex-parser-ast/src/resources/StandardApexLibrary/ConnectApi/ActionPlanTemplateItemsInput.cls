global class ActionPlanTemplateItemsInput {
	global ConnectApi.ActionPlanItemTasksInput adhocItems;
	global List<String> excludedItems;
	global String name;
	global String targetId;
	global ConnectApi.ActionPlanItemTasksInput updateableItems;
	global ActionPlanTemplateItemsInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}