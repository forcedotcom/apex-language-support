global class CursorFetchResult {
	global Object clone() { }
	global Integer getNextIndex() { }
	global Integer getNumDeletedRecords() { }
	global List<SObject> getRecords() { }
	global Boolean isDone() { }

}