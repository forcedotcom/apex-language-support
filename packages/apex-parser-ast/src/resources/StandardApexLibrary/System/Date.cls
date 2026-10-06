/**
 * Contains methods for the Date primitive data type.
 * Usage
 * For more information on Dates, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_primitives.htm" target="_blank">Date Data Type</a>.
 */
global class Date {
    /**
     * Adds the specified number of additional days to a Date.
     * Example
     * Date myDate = Date.newInstance(1960, 2, 17);
     * Date newDate = mydate.addDays(2);
     */
    global Date addDays(Integer days) { return null; }

    /**
     * Adds the specified number of additional months to a Date
     * Example
     * date myDate = date.newInstance(1990, 11, 21);
     * date newDate = myDate.addMonths(3);
     * date expectedDate = date.newInstance(1991, 2, 21);
     * system.assertEquals(expectedDate, newDate);
     */
    global Date addMonths(Integer months) { return null; }

    /**
     * Adds the specified number of additional years to a Date
     * Example
     * date myDate = date.newInstance(1983, 7, 15);
     * date newDate = myDate.addYears(2);
     * date expectedDate = date.newInstance(1985, 7, 15);
     * system.assertEquals(expectedDate, newDate);
     */
    global Date addYears(Integer years) { return null; }

    /**
     * Returns the day-of-month component of a Date.
     * Example
     * date myDate = date.newInstance(1989, 4, 21);
     * Integer day = myDate.day();
     * system.assertEquals(21, day);
     */
    global Integer day() { return 0; }

    /**
     * Returns the day-of-year component of a Date.
     * Example
     * date myDate = date.newInstance(1998, 10, 21);
     * Integer day = myDate.dayOfYear();
     * system.assertEquals(294, day);
     */
    global Integer dayOfYear() { return 0; }

    /**
     * Returns the number of days between the Date that called the method and the specified date.
     * Usage
     * If the Date that calls the method occurs after the secondDate, the return value is negative.
     * Example
     * Date startDate = Date.newInstance(2008, 1, 1);
     * Date dueDate = Date.newInstance(2008, 1, 30);
     * Integer numberDaysDue = startDate.daysBetween(dueDate);
     */
    global Integer daysBetween(Date other) { return 0; }

    /**
     * Returns the number of days in the month for the specified year and month (1=Jan).
     * Example
     * The following example finds the number of days in the month of February in the year 1960.
     * Integer numberDays = date.daysInMonth(1960, 2);
     */
    global static Integer daysInMonth(Integer year, Integer month) { return 0; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the Date as a string using the locale of the context user
     * Example
     * // In American-English locale
     * date myDate = date.newInstance(2001, 3, 21);
     * String dayString = myDate.format();
     * system.assertEquals('3/21/2001', dayString);
     */
    global String format() { return null; }

    global Integer hashCode() { return 0; }

    /**
     * Returns true if the specified year is a leap year.
     * Example
     * system.assert(Date.isLeapYear(2004));
     */
    global static Boolean isLeapYear(Integer year) { return false; }

    /**
     * Returns true if the Date that called the method is the same as the specified date.
     * Example
     * date myDate = date.today();
     * date dueDate = date.newInstance(2008, 1, 30);
     * boolean dueNow = myDate.isSameDay(dueDate);
     */
    global Boolean isSameDay(Date other) { return false; }

    /**
     * Returns the month component of a Date (1=Jan).
     * Example
     * date myDate = date.newInstance(2004, 11, 21);
     * Integer month = myDate.month();
     * system.assertEquals(11, month);
     */
    global Integer month() { return 0; }

    /**
     * Returns the number of months between the Date that called the method and the specified date, ignoring the difference in days.
     * Example
     * Date firstDate = Date.newInstance(2006, 12, 2);
     * Date secondDate = Date.newInstance(2012, 12, 8);
     * Integer monthsBetween = firstDate.monthsBetween(secondDate);
     * System.assertEquals(72, monthsBetween);
     */
    global Integer monthsBetween(Date other) { return 0; }

    /**
     * Constructs a Date from Integer representations of the year, month (1=Jan), and day.
     * Example
     * The following example creates the date February 17th, 1960:
     * Date myDate = date.newinstance(1960, 2, 17);
     */
    global static Date newInstance(Integer year, Integer month, Integer day) { return null; }

    /**
     * Constructs a Date from a String. The format of the String depends on the local date format.
     * Example
     * The following example works in some locales.
     * date mydate = date.parse('12/27/2009');
     */
    global static Date parse(String str) { return null; }

    /**
     * Returns the first of the month for the Date that called the method.
     * Example
     * date myDate = date.newInstance(1987, 12, 17);
     * date firstDate = myDate.toStartOfMonth();
     * date expectedDate = date.newInstance(1987, 12, 1);
     * system.assertEquals(expectedDate, firstDate);
     */
    global Date toStartOfMonth() { return null; }

    /**
     * Returns the start of the week for the Date that called the method, depending on the context user's locale.
     * Example
     * For example, the start of a week is Sunday in the United States locale, and Monday in European locales. For example:
     * Date myDate = Date.today();
     * Date weekStart = myDate.toStartofWeek();
     */
    global Date toStartOfWeek() { return null; }

    global String toString() { return null; }

    /**
     * Returns the current date in the current user's time zone.
     */
    global static Date today() { return null; }

    /**
     * Converts the specified object to a Date. Use this method to convert a history tracking field value or an object that represents a Date value.
     * Usage
     * Use this method with the OldValue or NewValue fields of history sObjects, such as AccountHistory, when the field is a Date field.
     * Example
     * This example converts history tracking fields to Date values.
     * List<AccountHistory> ahlist = [SELECT Field,OldValue,NewValue FROM AccountHistory];
     * for(AccountHistory ah : ahlist) {
     *   System.debug('Field: ' + ah.Field);
     *   if (ah.field == 'MyDate__c') {
     *     Date oldValue = Date.valueOf(ah.OldValue);
     *     Date newValue = Date.valueOf(ah.NewValue);
     *   }
     * }
     * Versioned Behavior Changes
     * Date.valueOf has been versioned in these releases.
     * API version 33.0 or earlier: If you call Date.valueOf with a Datetime object, the method returns a Date value that contains the hours, minutes, seconds, and milliseconds set.
     * API version 34.0 to API version 53.0: If you call Date.valueOf with a Datetime object, the method converts Datetime to a valid Date without the time information, but the result depends on the manner in which the Datetime object was initialized. For example, if the Datetime object was initialized using Datetime.valueOf(stringDate), the returned Date value contains time (hours) information. If the Datetime object is initialized using Datetime.newInstance(year, month, day, hour, minute, second) the returned Date value doesn’t contain time information.
     * API version 54.0 and later: If you call Date.valueOf with a Datetime object, the method converts the object to a valid Date without the time information.
     */
    global static Date valueOf(Object o) { return null; }

    /**
     * Returns a Date that contains the value of the specified String.
     * Usage
     * The specified string should use the standard date format “yyyy-MM-dd HH:mm:ss” in the local time zone.
     * Example
     * string year = '2008';
     * string month = '10';
     * string day = '5';
     * string hour = '12';
     * string minute = '20';
     * string second = '20';
     * string stringDate = year + '-' + month
     *  + '-' + day + ' ' + hour + ':' +
     * minute + ':' + second;
     *
     * Date myDate = date.valueOf(stringDate);
     */
    global static Date valueOf(String str) { return null; }

    /**
     * Returns the year component of a Date
     * Example
     * date myDate = date.newInstance(1988, 12, 17);
     * system.assertEquals(1988, myDate.year());
     */
    global Integer year() { return 0; }
}