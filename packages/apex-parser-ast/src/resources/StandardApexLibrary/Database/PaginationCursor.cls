global class PaginationCursor {
	global Object clone() { }
	global Integer fetchDeleted(Integer start, Integer pageSize) { }
	global Database.CursorFetchResult fetchPage(Integer start, Integer pageSize) { }
	global Integer getNumRecords() { }
global enum DeleteFilter {
DELETED_ROWS_ONLY,
NO_DELETED_ROWS,
NO_DELETED_SHARING_ROWS,
NO_FILTER
}

}