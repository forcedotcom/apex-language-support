/**
 * Contains methods for the Double primitive data type.
 * <p>Usage
 * For more information on Double, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_primitives.htm" target="_blank">Double Data Type</a>.
 */
global class Double {
    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the String value for this Double using the locale of the context user
     * <p>Example
     * Double myDouble = 1261992;
     * system.assertEquals('1,261,992', myDouble.format());
     */
    global String format() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns the Integer value of this Double by casting it to an Integer.
     * <p>Example
     * Double DD1 = double.valueOf('3.14159');
     * Integer value = DD1.intValue();
     * system.assertEquals(value, 3);
     */
    global Integer intValue() { return 0; }

    /**
     * Returns the Long value of this Double.
     * <p>Example
     * Double myDouble = 421994;
     * Long value = myDouble.longValue();
     * System.assertEquals(421994, value);
     */
    global Long longValue() { return 0L; }

    /**
     * Returns the closest Long to this Double value.
     * <p>Example
     * Double D1 = 4.5;
     * Long L1 = D1.round();
     * System.assertEquals(5, L1);
     *
     * Double D2= 4.2;
     * Long L2= D2.round();
     * System.assertEquals(4, L2);
     *
     * Double D3= -4.7;
     * Long L3= D3.round();
     * System.assertEquals(-5, L3);
     */
    global Long round() { return 0L; }

    global String toString() { return null; }

    /**
     * Converts the specified object to a Double value. Use this method to convert a history tracking field value or an object that represents a Double value.
     * <p>Usage
     * Use this method with the OldValue or NewValue fields of history sObjects, such as AccountHistory, when the field type corresponds to a Double type, like a number field.
     * <p>Example
     * List<AccountHistory> ahlist =
     *   [SELECT Field,OldValue,NewValue
     *    FROM AccountHistory];
     * for(AccountHistory ah : ahlist) {
     *   System.debug('Field: ' + ah.Field);
     *   if (ah.field == 'NumberOfEmployees') {
     *     Double oldValue =
     *       Double.valueOf(ah.OldValue);
     *     Double newValue =
     *       Double.valueOf(ah.NewValue);
     * }
     */
    global static Double valueOf(Object o) { return 0.0; }

    /**
     * Returns a Double that contains the value of the specified String. As in Java, the String is interpreted as representing a signed decimal.
     * <p>Example
     * Double DD1 = double.valueOf('3.14159');
     */
    global static Double valueOf(String str) { return 0.0; }
}