/**
 * Performs rule-based searches for duplicate records. The input is an array of IDs. Each ID specifies records to search for duplicates among. The duplicates are detected based on the active duplicate rules applicable to the object type corresponding to the input IDs.
 */
global class FindDuplicatesByIds {
    global FindDuplicatesByIds() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Identifies duplicates of record IDs provided and returns a list of FindDuplicatesResult objects.
     * <p>Usage
     * FindDuplicatesByIds uses the duplicate rules for the object that has the same type as the input record IDs. For example, if the record ID represents an Account, FindDuplicatesByIds uses the duplicate rules associated with the Account object.
     * FindDuplicatesByIds identifies duplicate records according to activated standard and custom matching rules. <a class="xref" href="https://help.salesforce.com/s/articleView?id=sales.matching_rules_standard_rules.htm&amp;language=en_US&amp;type=5" target="_blank" title="HTML (New Window)">Standard matching rules</a> don’t include custom fields in their matching criteria. You can configure custom matching rules that do include custom fields for matching criteria, and then assign the custom matching rule to a <a class="xref" href="https://help.salesforce.com/s/articleView?id=sales.duplicate_rules_map_of_reference.htm&amp;type=5&amp;language=en_US" target="_blank">duplicate rule</a>. However, configuring these rules isn’t a part of the Datacloud API.
     * Input:
     * All record IDs in the input array must be of the same object type, and that type must correspond to an object type that supports duplicate rules.
     * The input array is limited to 50 elements. If you exceed this limit, an exception is thrown with the following message: Configuration error: The number of records to check is greater than the permitted batch size.
     * Output:
     * The output of FindDuplicatesByIds is an array of objects with the same number of elements as the input array, and in the same order. The output objects encapsulate record IDs for duplicate records. The output objects also contain values from the duplicate records.
     * Each element contains an array of DuplicateResult objects, which each represent a duplicate rule that FindDuplicatesByIds applied. Within each DuplicateResult object is an array of MatchResult objects, which each represent a matching rule that the duplicate rule applied. If FindDuplicatesByIds doesn’t find any duplicates for that matching rule, then the MatchResult.getMatchRecords() array is empty. Otherwise, the MatchResult.getMatchRecords() array contains MatchRecord objects, which each represent a duplicate record.
     * If no duplicate rule is active for the object type of the record IDs in the input array, a System.HandledException exception is thrown with this message: No active duplicate rules are defined for the {ObjectName} object type.
     * <p>Example
     * // Create list of existing record IDs to check for duplicates
     * List<Id> idList = new List<Id>();
     * idList.add('EXISTING_ID'); // Replace placeholder with an existing 18-digit record ID
     *
     * // Call the FindDuplicatesByIds method, which returns one FindDuplicatesResult for each ID in the input list.
     * List<Datacloud.FindDuplicatesResult> results = Datacloud.FindDuplicatesByIds.findDuplicatesByIds(idList);
     *
     * //Get the result for the first record ID (index 0).
     * Datacloud.FindDuplicatesResult idResult = results[0];
     *
     * // Check that findDuplicates() was successfully executed for this record
     * if (!idResult.isSuccess()) {
     *   List<Database.Error> errs = idResult.getErrors();
     *   for (Database.Error err : errs) {
     *       System.debug(err.getMessage());
     *   }
     * } else {
     *
     *   Boolean duplicatesFound = false;
     *   Boolean matchError = false;
     *
     *   // Iterate through the duplicate rules that were evaluated.
     *   for (Datacloud.DuplicateResult dupResult : idResult.getDuplicateResults()) {
     *     // Iterate through the matching rules that were evaluated for each duplicate rule
     *     for (Datacloud.MatchResult matchResult : dupResult.getMatchResults()) {
     *       // Check that getMatchResults() was successfully executed for this matching rule
     *       if (!matchResult.isSuccess()) {
     *         List<Database.Error> errs = matchResult.getErrors();
     *         for (Database.Error err : errs) {
     *           System.debug(err.getMessage());
     *         }
     *         matchError = true;
     *       } else {
     *         // Check if duplicates are found according to the matching rule
     *         if (!matchResult.getMatchRecords().isEmpty()) {
     *           System.debug('Duplicate record(s) found with matching rule: ' + matchResult.getRule());
     *           duplicatesFound = true;
     *           // Get information about the duplicates
     *           for (Datacloud.MatchRecord matchRecord : matchResult.getMatchRecords()) {
     *             System.debug('Duplicate record: ' + matchRecord.getRecord());
     *           }
     *         }
     *       }
     *     }
     *   }
     *
     *   // If no duplicates were found and no errors occurred for first record ID
     *   if (!duplicatesFound && !matchError) {
     *     System.debug('No duplicates found for record ID: ' + idList[0]);
     *   }
     * }
     */
    global static List findDuplicatesByIds(List ids) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}