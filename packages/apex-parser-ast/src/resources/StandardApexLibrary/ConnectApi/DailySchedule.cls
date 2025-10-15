global class DailySchedule {
	global List<ConnectApi.CdpDayOfWeekEnum> daysOfWeek;
	global Integer interval;
	global ConnectApi.TimeOutput runFrom;
	global ConnectApi.TimeOutput runTo;
	global DailySchedule() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}