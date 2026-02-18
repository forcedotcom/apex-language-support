global class DailyScheduleInput {
	global List<String> daysOfWeek;
	global Integer interval;
	global ConnectApi.TimeInput runFrom;
	global ConnectApi.TimeInput runTo;
	global DailyScheduleInput() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Integer hashCode() { }
	global String toString() { }

}