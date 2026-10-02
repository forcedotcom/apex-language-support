/**
 * Contains methods for the ID primitive data type.
 * <p>Example: Getting an sObject Token From an ID
 * This sample shows how to use the getSObjectType method to obtain an sObject token from an ID. The updateOwner method in this sample accepts a list of IDs of the sObjects to update the ownerId field of. This list contains IDs of sObjects of the same type. The second parameter is the new owner ID. Note that since it is a future method, it doesn’t accept sObject types as parameters; this is why it accepts IDs of sObjects. This method gets the sObject token from the first ID in the list, then does a describe to obtain the object name and constructs a query dynamicallly. It then queries for all sObjects and updates their owner ID fields to the new owner ID.
 * public with sharing class MyDynamicSolution {
 *     @Future
 *     public static void updateOwner(List<ID> objIds, ID newOwnerId) {
 *         // Validate input
 *         Assert.isNotNull(objIds);
 *         Assert.isTrue(objIds.size() > 0);
 *         Assert.isNotNull(newOwnerId);
 *
 *         // Get the sObject token from the first ID
 *         // (the List contains IDs of sObjects of the same type).
 *         Schema.SObjectType token = objIds[0].getSObjectType();
 *
 *         // Using the token, do a describe
 *         // and construct a query dynamically.
 *         Schema.DescribeSObjectResult dr = token.getDescribe();
 *         String queryString = 'SELECT ownerId FROM ' + dr.getName() +
 *             ' WHERE ';
 *         for(ID objId : objIds) {
 *             queryString += 'Id=\'' + objId + '\' OR ';
 *         }
 *         // Remove the last ' OR'
 *         queryString = queryString.subString(0, queryString.length() - 4);
 *
 *         sObject[] objDBList = Database.query(queryString, AccessLevel.USER_MODE);
 *         Assert.isTrue(objDBList.size() > 0);
 *
 *         // Update the owner ID on the sObjects
 *         for(Integer i=0;i<objDBList.size();i++) {
 *             objDBList[i].put('ownerId', newOwnerId);
 *         }
 *         Database.SaveResult[] srList = Database.update(objDBList, false, AccessLevel.USER_MODE);
 *         for(Database.SaveResult sr : srList) {
 *             if (sr.isSuccess()) {
 *                 System.debug('Updated owner ID successfully for ' +
 *                     dr.getName() + ' ID ' + sr.getId());
 *             }
 *             else {
 *                 System.debug('Updating ' + dr.getName() + ' returned the following errors.');
 *                 for(Database.Error e : sr.getErrors()) {
 *                     System.debug(e.getMessage());
 *                 }
 *             }
 *         }
 *     }
 * }
 */
global class Id {
    global Boolean equals(Object o) { return false; }

    /**
     * Returns the token for the sObject corresponding to this ID. This method is primarily used with describe information.
     * <p>Usage
     * For more information about describes, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_describe_objects_understanding.htm" target="_blank">Understanding Apex Describe Information</a>.
     * <p>Example
     * account a = new account(name = 'account');
     * insert a;
     * Id myId = a.id;
     * system.assertEquals(Schema.Account.SObjectType, myId.getSobjectType());
     */
    global Schema.SObjectType getSobjectType() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Converts an 18-character Id value to a 15-character case-sensitive string.
     * <p>Example
     * String Id_15_char = '0D5B000001DVM9t';
     * String Id_18_char = '0D5B000001DVM9tkAh';
     * ID testId = Id_18_char;
     * System.assertEquals(testId.to15(),Id_15_char);
     */
    global String to15() { return null; }

    global String toString() { return null; }

    /**
     * Converts the specified String into an ID and returns the ID.
     * <p>Example
     * Id myId = Id.valueOf('001xa000003DIlo');
     * <p>Versioned Behavior Changes
     * In API version 54.0 and later, assignment of an invalid 15 or 18 character ID to a variable results in a System.StringException exception.
     */
    global static Id valueOf(String str) { return null; }

    /**
     * Converts the specified string into an ID and returns the ID. If restoreCasing is true, and the string represents an 18-character ID that has incorrect casing, the method returns an 18-character ID that is correctly aligned with its encoded casing.
     * @return The return value depends on both the str and the restoreCasing parameter values.
     * Note
     * If the str is invalid, the method throws a System.StringException exception.
     * Parameters restoreCasing=true restoreCasing=false
     * Valid 15-character str value Because the 15-character input value can’t be encoded for casing, the method throws a System.StringException. The method returns a 15-character ID.
     * Valid 18-character str value The method returns an 18-character ID that is correctly aligned with its encoded casing. The method doesn’t attempt to correctly align the casing of the 18-character ID and returns an 18-character ID.
     */
    global static Id valueOf(String str, Boolean restoreCasing) { return null; }
}