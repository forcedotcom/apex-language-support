global class CdpSegmentPublishScheduleInfoOutput {
	global Integer dayOfMonth;
	global String expirationTime;
	global Integer frequency;
	global Integer hourlyInterval;
	global Boolean isLastDay;
	global Boolean never;
	global String runTimeEndForRapid;
	global String runTimeStartForRapid;
	global ConnectApi.ScheduleFrequency scheduleFrequency;
	global List<String> scheduledDays;
	global CdpSegmentPublishScheduleInfoOutput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}