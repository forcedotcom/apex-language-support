/**
 * Performs rule-based searches for duplicate records. The input is an array of sObjects. Each sObject represents a record you want to find duplicates of. The output identifies the detected duplicates for each input sObject based on active duplicate rules for the given object.
 */
global class FindDuplicates {
    global Object FindDuplicates() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Identifies duplicates for sObjects provided and returns a list of FindDuplicatesResult objects.
     * <p>Usage
     * Use FindDuplicates to apply active duplicate rules associated with an object to records represented by input sObjects.
     * FindDuplicates uses the duplicate rules for the object that has the same type as the input sObjects.
     * This method doesn’t return custom fields by default. This method identifies duplicate records according to activated standard and custom matching rules. Standard matching rules don’t include custom fields in their matching criteria. You can configure custom matching rules that do include custom fields for matching criteria, and then assign the custom matching rule to a <a class="xref" href="https://help.salesforce.com/s/articleView?id=sales.duplicate_rules_map_of_reference.htm&amp;type=5&amp;language=en_US" target="_blank">duplicate rule</a>. However, configuring these rules isn’t a part of the Datacloud API.
     * Input:
     * All sObjects in the input array must be of the same object type, and that type must correspond to an object type that supports duplicate rules.
     * The input array is limited to 50 elements. If you exceed this limit, an exception is thrown with the following message: Configuration error: The number of records to check is greater than the permitted batch size.
     * Output:
     * The output of FindDuplicates is an array of objects with the same number of elements as the input array, and in the same order. The output objects encapsulate record IDs for duplicate records. The output objects also contain values from the duplicate records.
     * Each element contains an array of DuplicateResult objects, which each represent a duplicate rule that FindDuplicates applied. Within each DuplicateResult object is an array of MatchResult objects, which each represent a matching rule that the duplicate rule applied. If FindDuplicates doesn’t find any duplicates for that matching rule, then the MatchResult.getMatchRecords() array is empty. Otherwise, the MatchResult.getMatchRecords() array contains MatchRecord elements, which each represent a duplicate record.
     * If no duplicate rule is active for the object type in the input array, a System.HandledException exception is thrown with this message: No active duplicate rules are defined for the {ObjectName} object type.
     * <p>Example
     * //Create the sObject to check for duplicates.
     * Account acct = new Account();
     * acct.Name = 'Test Account 123';
     * acct.BillingStreet = '123 Test Street';
     * acct.BillingCity = 'San Francisco';
     * acct.BillingState = 'CA';
     * acct.BillingCountry = 'US';
     *
     * List<Account> acctList = new List<Account>();
     * acctList.add(acct);
     *
     * // Call the findDuplicates method, which returns one FindDuplicatesResult for each sObject in the input list.
     * List<Datacloud.FindDuplicatesResult> results = Datacloud.FindDuplicates.findDuplicates(acctList);
     *
     * //Get the result for the first record (index 0).
     * Datacloud.FindDuplicatesResult acctResult = results[0];
     *
     * // Check that findDuplicates() was successfully executed for this account.
     * if (!acctResult.isSuccess()) {
     *   List<Database.Error> errs = acctResult.getErrors();
     *   for (Database.Error err : errs) {
     *       System.debug(err.getMessage());
     *   }
     * } else {
     *
     *   Boolean duplicatesFound = false;
     *   Boolean matchError = false;
     *
     *   // Iterate through the duplicate rules that were evaluated.
     *   for (Datacloud.DuplicateResult dupResult : acctResult.getDuplicateResults()) {
     *     // Iterate through the matching rules that were evaluated for each duplicate rule.
     *     for (Datacloud.MatchResult matchResult : dupResult.getMatchResults()) {
     *       // Check that getMatchResults() was successfully executed for this matching rule.
     *       if (!matchResult.isSuccess()) {
     *         List<Database.Error> errs = matchResult.getErrors();
     *         for (Database.Error err : errs) {
     *           System.debug(err.getMessage());
     *         }
     *         matchError = true;
     *       } else {
     *         // Check if duplicates are found according to the matching rule.
     *         if (!matchResult.getMatchRecords().isEmpty()) {
     *           System.debug('Duplicate record(s) found with matching rule: ' + matchResult.getRule());
     *           duplicatesFound = true;
     *           // Get information about the duplicates.
     *           for (Datacloud.MatchRecord matchRecord : matchResult.getMatchRecords()) {
     *             System.debug('Duplicate record: ' + matchRecord.getRecord());
     *           }
     *         }
     *       }
     *     }
     *   }
     *
     *   // Insert the record only if no duplicates were found and no errors occurred.
     *   if (!duplicatesFound && !matchError) {
     *     insert(acct);
     *     System.debug('Account inserted.');
     *   }
     *
     * }
     */
    global static List findDuplicates(List sObjects) { return null; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}