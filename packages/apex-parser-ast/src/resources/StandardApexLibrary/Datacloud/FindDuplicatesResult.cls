/**
 * Output for rule-based searches for duplicate records. FindDuplicatesResult contains results of detecting duplicates using instances of FindDuplicates or FindDuplicatesByIds classes.
 */
global class FindDuplicatesResult {
    /**
     * A list of DuplicateResult objects representing the results of calling FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids). Elements in the list correspond to sObjects or IDs in the input list.
     * <p>List<DuplicateResult>
     */
    global List duplicateresults { get; }
    /**
     * A list of Database.Error objects holding errors resulting from calling FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids).
     * <p>List<Database.Error>
     */
    global List errors { get; }
    /**
     * Boolean signifying whether the call to FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids) was successful.
     * <p>Boolean
     */
    global Boolean success { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns a list of DuplicateResult objects representing the results of calling FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids). Elements in the list correspond to sObjects or IDs in the input list.
     * <p>Example
     * Account acct = new Account(name='Salesforce');
     * List<Account> acctList = new List<Account>();
     * acctList.add(acct);
     *
     * Datacloud.FindDuplicatesResult[] results = Datacloud.FindDuplicates.findDuplicates(acctList);
     * for (Datacloud.FindDuplicatesResult findDupeResult : results) {
     *   for (Datacloud.DuplicateResult dupeResult : findDupeResult.getDuplicateResults()) {
     *     for (Datacloud.MatchResult matchResult : dupeResult.getMatchResults()) {
     *       for (Datacloud.MatchRecord matchRecord : matchResult.getMatchRecords()) {
     *           System.debug('Duplicate Record: ' + matchRecord.getRecord());
     *       }
     *     }
     *   }
     * }
     */
    global List getDuplicateResults() { return null; }

    /**
     * Returns a list of DatabaseError objects containing errors resulting from calling FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids), if errors were encountered.
     */
    global List getErrors() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns a Boolean signifying whether the call to FindDuplicates.findDuplicates(sObjects) or FindDuplicatesByIds.findDuplicatesByIds(ids) was successful.
     */
    global Boolean isSuccess() { return false; }

    global String toString() { return null; }
}