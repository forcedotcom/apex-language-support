/**
 * Contains methods for the Datetime primitive data type.
 * Usage
 * Apex supports both implicit and explicit casting of Date values to Datetime, with the time component being zeroed out in the resulting Datetime value. For more information about the Datetime, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_primitives.htm" target="_blank">Datetime Data Type</a>.
 */
global class Datetime {
    /**
     * Adds the specified number of days to a Datetime.
     * Example
     * Datetime myDateTime = Datetime.newInstance(1960, 2, 17);
     * Datetime newDateTime = myDateTime.addDays(2);
     * Datetime expected = Datetime.newInstance(1960, 2, 19);
     * System.assertEquals(expected, newDateTime);
     */
    global Datetime addDays(Integer days) { return null; }

    /**
     * Adds the specified number of hours to a Datetime.
     * Example
     * DateTime myDateTime = DateTime.newInstance(1997, 1, 31, 7, 8, 16);
     * DateTime newDateTime = myDateTime.addHours(3);
     * DateTime expected = DateTime.newInstance(1997, 1, 31, 10, 8, 16);
     * System.assertEquals(expected, newDateTime);
     */
    global Datetime addHours(Integer hours) { return null; }

    /**
     * Adds the specified number of minutes to a Datetime.
     * Example
     * DateTime myDateTime = DateTime.newInstance(1999, 2, 11, 8, 6, 16);
     * DateTime newDateTime = myDateTime.addMinutes(7);
     * DateTime expected = DateTime.newInstance(1999, 2, 11, 8, 13, 16);
     * System.assertEquals(expected, newDateTime);
     */
    global Datetime addMinutes(Integer minutes) { return null; }

    /**
     * Adds the specified number of months to a Datetime.
     * Example
     * DateTime myDateTime = DateTime.newInstance(2000, 7, 7, 7, 8, 12);
     * DateTime newDateTime = myDateTime.addMonths(1);
     * DateTime expected = DateTime.newInstance(2000, 8, 7, 7, 8, 12);
     * System.assertEquals(expected, newDateTime);
     */
    global Datetime addMonths(Integer months) { return null; }

    /**
     * Adds the specified number of seconds to a Datetime.
     * Example
     * DateTime myDateTime = DateTime.newInstance(2001, 7, 19, 10, 7, 12);
     * DateTime newDateTime = myDateTime.addSeconds(4);
     * DateTime expected = DateTime.newInstance(2001, 7, 19, 10, 7, 16);
     * System.assertEquals(expected, newDateTime);
     */
    global Datetime addSeconds(Integer seconds) { return null; }

    /**
     * Adds the specified number of years to a Datetime.
     * Example
     * DateTime myDateTime = DateTime.newInstance(2009, 12, 17, 13, 6, 6);
     * DateTime newDateTime = myDateTime.addYears(1);
     * DateTime expected = DateTime.newInstance(2010, 12, 17, 13, 6, 6);
     * System.assertEquals(expected, newDateTime);
     */
    global Datetime addYears(Integer years) { return null; }

    /**
     * Returns the Date component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime myDateTime = DateTime.newInstance(2006, 3, 16, 12, 6, 13);
     * Date myDate = myDateTime.date();
     * Date expected = Date.newInstance(2006, 3, 16);
     * System.assertEquals(expected, myDate);
     */
    global Date date() { return null; }

    /**
     * Return the Date component of a Datetime in the GMT time zone.
     * Example
     * // California local time, PST
     * DateTime myDateTime = DateTime.newInstance(2006, 3, 16, 23, 0, 0);
     * Date myDate = myDateTime.dateGMT();
     * Date expected = Date.newInstance(2006, 3, 17);
     * System.assertEquals(expected, myDate);
     */
    global Date dateGmt() { return null; }

    /**
     * Returns the day-of-month component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime myDateTime = DateTime.newInstance(1986, 2, 21, 23, 0, 0);
     * System.assertEquals(21, myDateTime.day());
     */
    global Integer day() { return 0; }

    /**
     * Returns the day-of-month component of a Datetime in the GMT time zone.
     * Example
     * // California local time, PST
     * DateTime myDateTime = DateTime.newInstance(1987, 1, 14, 23, 0, 3);
     * System.assertEquals(15, myDateTime.dayGMT());
     */
    global Integer dayGmt() { return 0; }

    /**
     * Returns the day-of-year component of a Datetime in the local time zone of the context user.
     * Example
     * For example, February 5, 2008 08:30:12 would be day 36.
     * Datetime myDate = Datetime.newInstance(2008, 2, 5, 8, 30, 12);
     * system.assertEquals(myDate.dayOfYear(), 36);
     */
    global Integer dayOfYear() { return 0; }

    /**
     * Returns the day-of-year component of a Datetime in the GMT time zone.
     * Example
     * // This sample assumes we are in the PST timezone
     * DateTime myDateTime = DateTime.newInstance(1999, 2, 5, 23, 0, 3);
     * // January has 31 days + 5 days in February = 36 days
     * // dayOfYearGmt() adjusts the time zone from the current time zone to GMT
     * // by adding 8 hours to the PST time zone, so it's 37 days and not 36 days
     * System.assertEquals(37, myDateTime.dayOfYearGmt());
     */
    global Integer dayOfYearGmt() { return 0; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Converts the date to the local time zone and returns the converted date as a formatted string using the locale of the context user. If the time zone cannot be determined, GMT is used.
     * Example
     * Note
     * The sample is executed in an org where the “Enable ICU Locale Formats” crucial update is enabled. See <a class="xref" href="https://releasenotes.docs.salesforce.com/en-us/spring20/release-notes/rn_forcecom_globalization_enable_icu_cruc.htm" target="_blank">https://releasenotes.docs.salesforce.com/en-us/spring20/release-notes/rn_forcecom_globalization_enable_icu_cruc.htm</a>.
     * DateTime.myDateTime = DateTime.newInstance(1993, 6, 6, 3, 3, 3);
     * system.assertEquals('6/6/1993, 3:03 AM', mydatetime.format());
     */
    global String format() { return null; }

    /**
     * Converts the date to the local time zone and returns the converted date as a string using the supplied Java simple date format. If the time zone cannot be determined, GMT is used.
     * Usage
     * For more information on the Java simple date format, see <a class="xref" href="http://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html" target="_blank" title="html (New Window)">Java SimpleDateFormat</a>.
     * Example
     * Datetime myDT = DateTime.newInstance(2022, 5, 4, 19, 37, 55);
     * String myDate = myDT.format('yyyy-MM-dd h:mm a');
     * String expected = '2022-05-04 7:37 PM';
     * System.assertEquals(expected, myDate);
     */
    global String format(String dateformat) { return null; }

    /**
     * Converts the date to the specified time zone and returns the converted date as a string using the supplied Java simple date format. If the supplied time zone is not in the correct format, GMT is used.
     * Usage
     * For more information on the Java simple date format, see <a class="xref" href="http://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html" target="_blank" title="html (New Window)">Java SimpleDateFormat</a>.
     * Example
     * This example uses format to convert a GMT date to the America/New_York time zone and formats the date using the specified date format.
     * Datetime GMTDate =
     *   Datetime.newInstanceGmt(2011,6,1,12,1,5);
     * String strConvertedDate =
     *   GMTDate.format('MM/dd/yyyy HH:mm:ss',
     *                  'America/New_York');
     * // Date is converted to
     * // the new time zone and is adjusted
     * // for daylight saving time.
     * System.assertEquals(
     *   '06/01/2011 08:01:05', strConvertedDate);
     */
    global String format(String dateformat, String timezone) { return null; }

    /**
     * Returns a Datetime as a string using the supplied Java simple date format and the GMT time zone.
     * Usage
     * For more information on the Java simple date format, see <a class="xref" href="http://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html" target="_blank" title="html (New Window)">Java SimpleDateFormat</a>.
     * Example
     * DateTime myDateTime = DateTime.newInstance(1993, 6, 6, 3, 3, 3);
     * String formatted = myDateTime.formatGMT('EEE, MMM d yyyy HH:mm:ss');
     * String expected = 'Sun, Jun 6 1993 10:03:03';
     * System.assertEquals(expected, formatted);
     */
    global String formatGmt(String dateformat) { return null; }

    /**
     * Converts the date to the local time zone and returns the converted date in long date format.
     * Example
     * // Passing local date based on the PST time zone
     * Datetime dt = DateTime.newInstance(2012,12,28,10,0,0);
     * // Writes 12/28/2012 10:00:00 AM PST
     * System.debug('dt.formatLong()=' + dt.formatLong());
     */
    global String formatLong() { return null; }

    /**
     * Returns the number of milliseconds since January 1, 1970, 00:00:00 GMT represented by this DateTime object.
     * Example
     * DateTime dt = DateTime.newInstanceGMT(2007, 6, 23, 3, 3, 3);
     * Long gettime = dt.getTime();
     * Long expected = 1182567783000L;
     * System.assertEquals(expected, gettime);
     */
    global Long getTime() { return 0L; }

    global Integer hashCode() { return 0; }

    /**
     * Returns the hour component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime myDateTime = DateTime.newInstance(1998, 11, 21, 3, 3, 3);
     * System.assertEquals(3 , myDateTime.hour());
     */
    global Integer hour() { return 0; }

    /**
     * Returns the hour component of a Datetime in the GMT time zone.
     * Example
     * // California local time
     * DateTime myDateTime = DateTime.newInstance(2000, 4, 27, 3, 3, 3);
     * System.assertEquals(10 , myDateTime.hourGMT());
     */
    global Integer hourGmt() { return 0; }

    /**
     * Returns true if the Datetime that called the method is the same as the specified Datetime in the local time zone of the context user.
     * Example
     * datetime myDate = datetime.now();
     * datetime dueDate =
     *      datetime.newInstance(2008, 1, 30);
     * boolean dueNow = myDate.isSameDay(dueDate);
     */
    global Boolean isSameDay(Datetime other) { return false; }

    /**
     * Return the millisecond component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime myDateTime = DateTime.now();
     * system.debug(myDateTime.millisecond());
     */
    global Integer millisecond() { return 0; }

    /**
     * Return the millisecond component of a Datetime in the GMT time zone.
     * Example
     * DateTime myDateTime = DateTime.now();
     * system.debug(myDateTime.millisecondGMT());
     */
    global Integer millisecondGmt() { return 0; }

    /**
     * Returns the minute component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime myDateTime = DateTime.newInstance(2001, 2, 27, 3, 3, 3);
     * system.assertEquals(3, myDateTime.minute());
     */
    global Integer minute() { return 0; }

    /**
     * Returns the minute component of a Datetime in the GMT time zone.
     * Example
     * DateTime myDateTime = DateTime.newInstance(2002, 12, 3, 3, 3, 3);
     * system.assertEquals(3, myDateTime.minuteGMT());
     */
    global Integer minuteGmt() { return 0; }

    /**
     * Returns the month component of a Datetime in the local time zone of the context user (1=Jan).
     * Example
     * DateTime myDateTime = DateTime.newInstance(2004, 11, 4, 3, 3, 3);
     * system.assertEquals(11, myDateTime.month());
     */
    global Integer month() { return 0; }

    /**
     * Returns the month component of a Datetime in the GMT time zone (1=Jan).
     * Example
     * DateTime myDateTime = DateTime.newInstance(2006, 11, 19, 3, 3, 3);
     * system.assertEquals(11, myDateTime.monthGMT());
     */
    global Integer monthGmt() { return 0; }

    /**
     * Constructs a Datetime and initializes it to represent the specified number of milliseconds since January 1, 1970, 00:00:00 GMT.
     * Example
     * Long longtime = 1341828183000L;
     * DateTime dt = DateTime.newInstance(longtime);
     * DateTime expected = DateTime.newInstance(2012, 7, 09, 3, 3, 3);
     * System.assertEquals(expected, dt);
     * @return The returned date is in the GMT time zone.
     */
    global static Datetime newInstance(Long time) { return null; }

    /**
     * Constructs a DateTime from the specified date and time in the local time zone.
     * Example
     * Date myDate = Date.newInstance(2011, 11, 18);
     * Time myTime = Time.newInstance(3, 3, 3, 0);
     * DateTime dt = DateTime.newInstance(myDate, myTime);
     * DateTime expected = DateTime.newInstance(2011, 11, 18, 3, 3, 3);
     * System.assertEquals(expected, dt);
     * @return The returned date is in the GMT time zone.
     */
    global static Datetime newInstance(Date date, Time time) { return null; }

    /**
     * Constructs a Datetime from Integer representations of the specified year, month (1=Jan), and day at midnight in the local time zone.
     * Example
     * datetime myDate = datetime.newInstance(2008, 12, 1);
     * @return The returned date is in the GMT time zone.
     */
    global static Datetime newInstance(Integer year, Integer month, Integer day) { return null; }

    /**
     * Constructs a Datetime from Integer representations of the specified year, month (1=Jan), day, hour, minute, and second in the local time zone.
     * Example
     * Datetime myDate = Datetime.newInstance(2008, 12, 1, 12, 30, 2);
     * @return The returned date is in the GMT time zone.
     */
    global static Datetime newInstance(Integer year, Integer month, Integer day, Integer hour, Integer minute, Integer second) { return null; }

    /**
     * Constructs a DateTime from the specified date and time in the GMT time zone.
     * Example
     * Date myDate = Date.newInstance(2013, 11, 12);
     * Time myTime = Time.newInstance(3, 3, 3, 0);
     * DateTime dt = DateTime.newInstanceGMT(myDate, myTime);
     * DateTime expected = DateTime.newInstanceGMT(2013, 11, 12, 3, 3, 3);
     * System.assertEquals(expected, dt);
     */
    global static Datetime newInstanceGmt(Date date, Time time) { return null; }

    /**
     * Constructs a Datetime from Integer representations of the specified year, month (1=Jan), and day at midnight in the GMT time zone
     * Example
     * DateTime dt = DateTime.newInstanceGMT(1996, 3, 22);
     */
    global static Datetime newInstanceGmt(Integer year, Integer month, Integer day) { return null; }

    /**
     * Constructs a Datetime from Integer representations of the specified year, month (1=Jan), day, hour, minute, and second in the GMT time zone
     * Example
     * //California local time
     * DateTime dt = DateTime.newInstanceGMT(1998, 1, 29, 2, 2, 3);
     * DateTime expected = DateTime.newInstance(1998, 1, 28, 18, 2, 3);
     * System.assertEquals(expected, dt);
     */
    global static Datetime newInstanceGmt(Integer year, Integer month, Integer day, Integer hour, Integer minute, Integer second) { return null; }

    /**
     * Returns the current Datetime based on a GMT calendar.
     * Example
     * datetime myDateTime = datetime.now();
     * @return The format of the returned datetime is: 'MM/DD/YYYY HH:MM PERIOD'
     */
    global static Datetime now() { return null; }

    /**
     * Constructs a Datetime from the given String in the local time zone and in the format of the user locale.
     * Example
     * This example uses parse to create a Datetime from a date passed in as a string and that is formatted for the English (United States) locale. You may need to change the format of the date string if you have a different locale.
     * Note
     * This sample is executed in an org where the “Enable ICU Locale Formats” crucial update is enabled. See <a class="xref" href="https://releasenotes.docs.salesforce.com/en-us/spring20/release-notes/rn_forcecom_globalization_enable_icu_cruc.htm" target="_blank">https://releasenotes.docs.salesforce.com/en-us/spring20/release-notes/rn_forcecom_globalization_enable_icu_cruc.htm</a>.
     * Datetime dt = DateTime.parse('10/14/2011, 11:46 AM');
     * String myDtString = dt.format();
     * system.assertEquals(myDtString, '10/14/2011, 11:46 AM');
     * @return The returned date is in the GMT time zone.
     */
    global static Datetime parse(String str) { return null; }

    /**
     * Returns the second component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime dt = DateTime.newInstanceGMT(1999, 9, 22, 3, 1, 2);
     * System.assertEquals(2, dt.second());
     */
    global Integer second() { return 0; }

    /**
     * Returns the second component of a Datetime in the GMT time zone.
     * Example
     * DateTime dt = DateTime.newInstance(2000, 2, 3, 3, 1, 5);
     * System.assertEquals(5, dt.secondGMT());
     */
    global Integer secondGmt() { return 0; }

    /**
     * Returns the time component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime dt = DateTime.newInstance(2002, 11, 21, 0, 2, 2);
     * Time expected = Time.newInstance(0, 2, 2, 0);
     * System.assertEquals(expected, dt.time());
     */
    global Time time() { return null; }

    /**
     * Returns the time component of a Datetime in the GMT time zone.
     * Example
     * // This sample is based on the PST time zone
     * DateTime dt = DateTime.newInstance(2004, 1, 27, 4, 1, 2);
     * Time expected = Time.newInstance(12, 1, 2, 0);
     * // 8 hours are added to the time to convert it from
     * // PST to GMT
     * System.assertEquals(expected, dt.timeGMT());
     */
    global Time timeGmt() { return null; }

    global String toString() { return null; }

    /**
     * Converts the specified object to a Datetime. Use this method to convert a history tracking field value or an object that represents a Datetime value.
     * Usage
     * Use this method with the OldValue or NewValue fields of history sObjects, such as AccountHistory, when the field is a Date/Time field.
     * Example
     * List<AccountHistory> ahlist = [SELECT Field,OldValue,NewValue FROM AccountHistory];
     * for(AccountHistory ah : ahlist) {
     *   System.debug('Field: ' + ah.Field);
     *   if (ah.field == 'MyDatetime__c') {
     *     Datetime oldValue = Datetime.valueOf(ah.OldValue);
     *     Datetime newValue = Datetime.valueOf(ah.NewValue);
     *   }
     * }
     */
    global static Datetime valueOf(Object o) { return null; }

    /**
     * Returns a Datetime that contains the value of the specified string.
     * Usage
     * The specified string should use the standard date format “yyyy-MM-dd HH:mm:ss” in the local time zone.
     * Example
     * string year = '2008';
     * string month = '10';
     * string day = '5';
     * string hour = '12';
     * string minute = '20';
     * string second = '20';
     * string stringDate = year + '-' + month + '-' + day + ' ' + hour + ':'
     *     + minute +  ':' + second;
     *
     * Datetime myDate = Datetime.valueOf(stringDate);
     * @return The returned date is in the GMT time zone.
     */
    global static Datetime valueOf(String str) { return null; }

    /**
     * Returns a Datetime that contains the value of the specified String.
     * Usage
     * The specified string should use the standard date format “yyyy-MM-dd HH:mm:ss” in the GMT time zone.
     * Example
     * // California locale time
     * string year = '2009';
     * string month = '3';
     * string day = '5';
     * string hour = '5';
     * string minute = '2';
     * string second = '2';
     * string stringDate = year + '-' + month + '-' + day + ' ' + hour + ':'
     *     + minute +  ':' + second;
     *
     * Datetime myDate = Datetime.valueOfGMT(stringDate);
     *
     * DateTime expected = DateTime.newInstance(2009, 3, 4, 21, 2, 2);
     * System.assertEquals(expected, myDate);
     */
    global static Datetime valueOfGmt(String str) { return null; }

    /**
     * Returns the year component of a Datetime in the local time zone of the context user.
     * Example
     * DateTime dt = DateTime.newInstance(2012, 1, 26, 5, 2, 4);
     * System.assertEquals(2012, dt.year());
     */
    global Integer year() { return 0; }

    /**
     * Returns the year component of a Datetime in the GMT time zone.
     * Example
     * DateTime dt = DateTime.newInstance(2012, 10, 4, 6, 4, 6);
     * System.assertEquals(2012, dt.yearGMT());
     */
    global Integer yearGmt() { return 0; }
}