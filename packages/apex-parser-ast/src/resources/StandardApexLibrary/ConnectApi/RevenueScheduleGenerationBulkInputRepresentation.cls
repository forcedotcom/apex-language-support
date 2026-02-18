global class RevenueScheduleGenerationBulkInputRepresentation {
	global ConnectApi.CalenderTypeEnum calendarType;
	global String endDate;
	global String opportunityId;
	global List<String> opportunityLineItemList;
	global ConnectApi.RevenueDistributionTypeEnum revenueDistributionType;
	global ConnectApi.RevenueSchedulePeriodTypeEnum revenueSchedulePeriodType;
	global RevenueScheduleGenerationBulkInputRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}