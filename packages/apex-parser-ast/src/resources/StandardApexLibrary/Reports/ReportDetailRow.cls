/**
 * Contains data cells for a detail row of a report.
 */
global class ReportDetailRow {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a list of data cells for a detail row.
     */
    global List getDataCells() { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}