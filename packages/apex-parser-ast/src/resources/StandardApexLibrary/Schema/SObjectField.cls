/**
 * A Schema.sObjectField object is returned from the field describe result using the getController and getSObjectField methods.
 * Example
 * Schema.DescribeFieldResult F = Account.Industry.getDescribe();
 * Schema.sObjectField T = F.getSObjectField();
 */
global class SObjectField {
    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the describe field result for this field.
     */
    global Schema.DescribeFieldResult getDescribe() { return null; }

    /**
     * Returns the describe field result for this field. This method also provides an option to get all the describe field results for an object.
     */
    global Schema.DescribeFieldResult getDescribe(Object options) { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}