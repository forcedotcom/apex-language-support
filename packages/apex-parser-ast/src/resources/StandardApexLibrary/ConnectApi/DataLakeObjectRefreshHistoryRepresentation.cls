global class DataLakeObjectRefreshHistoryRepresentation {
	global Datetime endTime;
	global Long recordsAdded;
	global Long recordsRemoved;
	global Long recordsUpdated;
	global Datetime startTime;
	global Long totalRecords;
	global DataLakeObjectRefreshHistoryRepresentation() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}