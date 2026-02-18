global class DMOFilterInput {
	global ConnectApi.BaseComparisonInput entityFilter;
	global String entityFilterType;
	global String entityName;
	global ConnectApi.DmoFilterLimitInput filterLimit;
	global ConnectApi.BaseComparisonInput inheritedFilter;
	global String inheritedFilterType;
	global List<ConnectApi.QueryPathInputConfig> queryPathConfigForActivateOnToContainer;
	global List<ConnectApi.QueryPathInputConfig> queryPathConfigFromContainerToEntity;
	global DMOFilterInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}