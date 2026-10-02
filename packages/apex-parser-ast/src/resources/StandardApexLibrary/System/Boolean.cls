/**
 * Contains methods for the Boolean primitive data type.
 */
global class Boolean {
    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }

    /**
     * Converts the specified object to a Boolean value. Use this method to convert a history tracking field value or an object that represents a Boolean value.
     * <p>Usage
     * Use this method with the OldValue or NewValue fields of history sObjects, such as AccountHistory, when the field type corresponds to a Boolean type, like a checkbox field.
     * <p>Example
     * List<AccountHistory> ahlist =
     *      [SELECT Field,OldValue,NewValue FROM AccountHistory];
     * for(AccountHistory ah : ahlist) {
     *    System.debug('Field: ' + ah.Field);
     *    if (ah.field == 'IsPlatinum__c') {
     *       Boolean oldValue = Boolean.valueOf(ah.OldValue);
     *       Boolean newValue = Boolean.valueOf(ah.NewValue);
     *    }
     * }
     */
    global static Boolean valueOf(Object a) { return false; }
}