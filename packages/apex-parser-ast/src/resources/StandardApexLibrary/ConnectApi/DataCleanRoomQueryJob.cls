global class DataCleanRoomQueryJob {
	global Datetime completedDate;
	global String errorCode;
	global String errorMessage;
	global String executedBy;
	global String outputDMOName;
	global Map<String,String> queryParam;
	global String reportId;
	global String reportName;
	global List<String> segmentNames;
	global ConnectApi.DataCleanRoomQueryJobStatusEnum status;
	global Datetime triggeredDate;
	global DataCleanRoomQueryJob() { }
	global Object clone() { }
	global Boolean equals(Object obj) { }
	global Double getBuildVersion() { }
	global Integer hashCode() { }
	global String toString() { }

}