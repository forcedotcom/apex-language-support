global class AdSpaceAvailabilityInputRepresentation {
	global List<ConnectApi.ObjectFieldInputRepresentation> adSpaceCapacityList;
	global List<ConnectApi.MapListItemInputRepresentation> adSpaceDimensionList;
	global String durationType;
	global String endDate;
	global Map<String,ConnectApi.MapValueInputRepresentation> filter;
	global String productGroupType;
	global String productGroupTypeValue;
	global ConnectApi.ObjectFieldInputRepresentation sortBy;
	global String startDate;
	global String unitType;
	global AdSpaceAvailabilityInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}