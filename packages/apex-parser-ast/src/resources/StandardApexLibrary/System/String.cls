/**
 * Contains methods for the String primitive data type.
 */
global class String {

  global String() {}

  /**
   * Returns an abbreviated version of the String, of the specified length and with ellipses appended if the current String is longer than the specified length; otherwise, returns the original String without ellipses.
   * @param maxWidth If maxWidth is less than four, this method throws a run-time exception.
   * @return String
   */
  global String abbreviate(Integer maxWidth) {}

  /**
   * Returns an abbreviated version of the String, of the specified length and with ellipses appended if the current String is longer than the specified length; otherwise, returns the original String without ellipses.
   * @param maxWidth If maxWidth is less than four, this method throws a run-time exception.
   * @param offset 
   * @return String
   */
  global String abbreviate(Integer maxWidth, Integer offset) {}

  /**
   * Returns the current String with the first letter changed to title case.
   * @return String
   */
  global String capitalize() {}

  /**
   * Returns a version of the current String of the specified size padded with spaces on the left and right, so that it appears in the center. If the specified size is smaller than the current String size, the entire String is returned without added spaces.
   * @param size 
   * @return String
   */
  global String center(Integer size) {}

  /**
   * Returns a version of the current String of the specified size padded with spaces on the left and right, so that it appears in the center. If the specified size is smaller than the current String size, the entire String is returned without added spaces.
   * @param size 
   * @param paddingString 
   * @return String
   */
  global String center(Integer size, String paddingString) {}

  /**
   * Returns the value of the character at the specified index.
   * @param index The index of the character to get the value of.
   * @return Integer
   */
  global Integer charAt(Integer index) {}

  /**
   * Returns the Unicode code point value at the specified index.
   * @param index The index of the characters (Unicode code units) in the string. The index range is from zero to the string length minus one.
   * @return Integer
   */
  global Integer codePointAt(Integer index) {}

  /**
   * Returns the Unicode code point value that occurs before the specified index.
   * @param index The index before the Unicode code point that is to be returned. The index range is from one to the string length.
   * @return Integer
   */
  global Integer codePointBefore(Integer index) {}

  /**
   * Returns the number of Unicode code points within the specified text range.
   * @param beginIndex The index of the first character in the range.
   * @param endIndex The index after the last character in the range.
   * @return Integer
   */
  global Integer codePointCount(Integer beginIndex, Integer endIndex) {}

  /**
   * Compares two strings lexicographically, based on the Unicode value of each character in the Strings.
   * @param secondString 
   * @return Integer
   */
  global Integer compareTo(String secondString) {}

  /**
   * Returns true if and only if the String that called the method contains the specified sequence of characters in substring .
   * @param substring 
   * @return Boolean
   */
  global Boolean contains(String substring) {}

  /**
   * Returns true if the current String contains any of the characters in the specified String; otherwise, returns false .
   * @param inputString 
   * @return Boolean
   */
  global Boolean containsAny(String inputString) {}

  /**
   * Returns true if the current String contains the specified sequence of characters without regard to case; otherwise, returns false .
   * @param substring 
   * @return Boolean
   */
  global Boolean containsIgnoreCase(String substring) {}

  /**
   * Returns true if the current String doesn’t contain any of the characters in the specified String; otherwise, returns false .
   * @param inputString If inputString is an empty string or the current String is empty, this method returns true . If inputString is null, this method returns a run-time exception.
   * @return Boolean
   */
  global Boolean containsNone(String inputString) {}

  /**
   * Returns true if the current String contains characters only from the specified sequence of characters and not any other characters; otherwise, returns false .
   * @param inputString 
   * @return Boolean
   */
  global Boolean containsOnly(String inputString) {}

  /**
   * Returns true if the current String contains any white space characters; otherwise, returns false .
   * @return Boolean
   */
  global Boolean containsWhitespace() {}

  /**
   * Returns the number of times the specified substring occurs in the current String.
   * @param substring 
   * @return Integer
   */
  global Integer countMatches(String substring) {}

  /**
   * Returns a version of the current String with all white space characters removed.
   * @return String
   */
  global String deleteWhitespace() {}

  /**
   * Returns the difference between the current String and the specified String.
   * @param secondString If secondString is an empty string, this method returns an empty string.If secondString is null, this method throws a run-time exception.
   * @return String
   */
  global String difference(String secondString) {}

  /**
   * Returns true if the String that called the method ends with the specified suffix .
   * @param suffix 
   * @return Boolean
   */
  global Boolean endsWith(String suffix) {}

  /**
   * Returns true if the current String ends with the specified suffix; otherwise, returns false .
   * @param suffix 
   * @return Boolean
   */
  global Boolean endsWithIgnoreCase(String suffix) {}

  /**
   * Deprecated. This method is replaced by equals(stringOrId) . Returns true if the passed-in string is not null and represents the same binary sequence of characters as the current string. Use this method to perform case-sensitive comparisons.
   * @param secondString 
   * @return Boolean
   */
  global Boolean equals(String secondString) {}

  /**
   * Deprecated. This method is replaced by equals(stringOrId) . Returns true if the passed-in string is not null and represents the same binary sequence of characters as the current string. Use this method to perform case-sensitive comparisons.
   * @param stringOrId 
   * @return Boolean
   */
  global Boolean equals(Object stringOrId) {}

  /**
   * Returns true if the secondString isn’t null and represents the same sequence of characters as the String that called the method, ignoring case.
   * @param secondString 
   * @return Boolean
   */
  global Boolean equalsIgnoreCase(String secondString) {}

  /**
   * Returns a String for a CSV column enclosed in double quotes, if required.
   * @return String
   */
  global String escapeCsv() {}

  /**
   * Escapes the characters in the String using EcmaScript String rules.
   * @return String
   */
  global String escapeEcmaScript() {}

  /**
   * Escapes the characters in a String using HTML 3.0 entities.
   * @return String
   */
  global String escapeHtml3() {}

  /**
   * Escapes the characters in a String using HTML 4.0 entities.
   * @return String
   */
  global String escapeHtml4() {}

  /**
   * Returns a String whose characters are escaped using Java String rules. Characters escaped include quotes and control characters, such as tab, backslash, and carriage return characters.
   * @return String
   */
  global String escapeJava() {}

  global static String escapeSingleQuotes(String stringToEscape) {}

  /**
   * Returns a String whose Unicode characters are escaped to a Unicode escape sequence.
   * @return String
   */
  global String escapeUnicode() {}

  /**
   * Escapes the characters in a String using XML entities.
   * @return String
   */
  global String escapeXml() {}

  /**
   * Treat the first argument as a pattern and return a string using the second argument for substitution and formatting. The substitution and formatting are the same as apex:outputText and the Java MessageFormat class. Non-string types in the second argument’s List are implicitly converted to strings, respecting the toString() method overrides that exist on the type.
   * @param stringToFormat 
   * @param formattingArguments 
   * @return String
   */
  global static String format(String stringToFormat, List<Object> formattingArguments) {}

  /**
   * Returns a String from the values of the list of integers.
   * @param charArray 
   * @return String
   */
  global static String fromCharArray(List<Integer> charArray) {}

  /**
   * Returns an array of character values that represent the characters in this string.
   * @return List<Integer>
   */
  global List<Integer> getChars() {}

  /**
   * Returns the initial sequence of characters as a String that is common to all the specified Strings.
   * @param strings 
   * @return String
   */
  global static String getCommonPrefix(List<String> strings) {}

  /**
   * Returns the Levenshtein distance between the current String and the specified String.
   * @param stringToCompare 
   * @return Integer
   */
  global Integer getLevenshteinDistance(String stringToCompare) {}

  /**
   * Returns the Levenshtein distance between the current String and the specified String.
   * @param stringToCompare 
   * @param threshold 
   * @return Integer
   */
  global Integer getLevenshteinDistance(String stringToCompare, Integer threshold) {}

  /**
   * Returns a hash code value for this string.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Returns the index of the first occurrence of the specified substring. If the substring does not occur, this method returns -1.
   * @param substring 
   * @return Integer
   */
  global Integer indexOf(String substring) {}

  /**
   * Returns the index of the first occurrence of the specified substring. If the substring does not occur, this method returns -1.
   * @param substring 
   * @param index 
   * @return Integer
   */
  global Integer indexOf(String substring, Integer index) {}

  /**
   * Returns the zero-based index of the first occurrence of any character specified in the substring. If none of the characters occur, returns -1.
   * @param substring 
   * @return Integer
   */
  global Integer indexOfAny(String substring) {}

  /**
   * Returns the zero-based index of the first occurrence of a character that is not in the specified substring. Otherwise, returns -1.
   * @param substring 
   * @return Integer
   */
  global Integer indexOfAnyBut(String substring) {}

  /**
   * Returns the index of the first occurrence of the character that corresponds to the specified character value.
   * @param character The integer value of the character in the string.
   * @return Integer
   */
  global Integer indexOfChar(Integer character) {}

  /**
   * Returns the index of the first occurrence of the character that corresponds to the specified character value.
   * @param character The integer value of the character in the string.
   * @param startIndex 
   * @return Integer
   */
  global Integer indexOfChar(Integer character, Integer startIndex) {}

  /**
   * Returns the zero-based index of the character where the current String begins to differ from the specified String.
   * @param stringToCompare 
   * @return Integer
   */
  global Integer indexOfDifference(String stringToCompare) {}

  /**
   * Returns the zero-based index of the first occurrence of the specified substring without regard to case. If the substring does not occur, this method returns -1.
   * @param substring 
   * @return Integer
   */
  global Integer indexOfIgnoreCase(String substring) {}

  /**
   * Returns the zero-based index of the first occurrence of the specified substring without regard to case. If the substring does not occur, this method returns -1.
   * @param substring 
   * @param startPosition 
   * @return Integer
   */
  global Integer indexOfIgnoreCase(String substring, Integer startPosition) {}

  /**
   * Returns true if all characters in the current String are lowercase; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAllLowerCase() {}

  /**
   * Returns true if all characters in the current String are uppercase; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAllUpperCase() {}

  /**
   * Returns true if all characters in the current String are Unicode letters only; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAlpha() {}

  /**
   * Returns true if all characters in the current String are Unicode letters or spaces only; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAlphaSpace() {}

  /**
   * Returns true if all characters in the current String are Unicode letters or digits only; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAlphanumeric() {}

  /**
   * Returns true if all characters in the current String are Unicode letters, digits, or spaces only; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAlphanumericSpace() {}

  /**
   * Returns true if the current String contains only ASCII printable characters; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isAsciiPrintable() {}

  /**
   * Returns true if the specified String is white space, empty (''), or null; otherwise, returns false .
   * @param inputString 
   * @return Boolean
   */
  global static Boolean isBlank(String inputString) {}

  /**
   * Returns true if the specified String is empty ('') or null; otherwise, returns false .
   * @param inputString 
   * @return Boolean
   */
  global static Boolean isEmpty(String inputString) {}

  /**
   * Returns true if the specified String is not whitespace, not empty (''), and not null; otherwise, returns false .
   * @param inputString 
   * @return Boolean
   */
  global static Boolean isNotBlank(String inputString) {}

  /**
   * Returns true if the specified String is not empty ('') and not null; otherwise, returns false .
   * @param inputString 
   * @return Boolean
   */
  global static Boolean isNotEmpty(String inputString) {}

  /**
   * Returns true if the current String contains only Unicode digits; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isNumeric() {}

  /**
   * Returns true if the current String contains only Unicode digits or spaces; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isNumericSpace() {}

  /**
   * Returns true if the current String contains only white space characters or is empty; otherwise, returns false .
   * @return Boolean
   */
  global Boolean isWhitespace() {}

  /**
   * Joins the elements of the specified iterable object, such as a List, into a single String separated by the specified separator.
   * @param iterableObj 
   * @param separator 
   * @return String
   */
  global static String join(Object iterableObj, String separator) {}

  /**
   * Returns the index of the last occurrence of the specified substring. If the substring does not occur, this method returns -1.
   * @param substring 
   * @return Integer
   */
  global Integer lastIndexOf(String substring) {}

  /**
   * Returns the index of the last occurrence of the specified substring. If the substring does not occur, this method returns -1.
   * @param substring 
   * @param endPosition 
   * @return Integer
   */
  global Integer lastIndexOf(String substring, Integer endPosition) {}

  /**
   * Returns the index of the last occurrence of the character that corresponds to the specified character value.
   * @param character The integer value of the character in the string.
   * @return Integer
   */
  global Integer lastIndexOfChar(Integer character) {}

  /**
   * Returns the index of the last occurrence of the character that corresponds to the specified character value.
   * @param character The integer value of the character in the string.
   * @param endIndex 
   * @return Integer
   */
  global Integer lastIndexOfChar(Integer character, Integer endIndex) {}

  /**
   * Returns the index of the last occurrence of the specified substring regardless of case.
   * @param substring 
   * @return Integer
   */
  global Integer lastIndexOfIgnoreCase(String substring) {}

  /**
   * Returns the index of the last occurrence of the specified substring regardless of case.
   * @param substring 
   * @param endPosition 
   * @return Integer
   */
  global Integer lastIndexOfIgnoreCase(String substring, Integer endPosition) {}

  /**
   * Returns the leftmost characters of the current String of the specified length.
   * @param length 
   * @return String
   */
  global String left(Integer length) {}

  /**
   * Returns the current String padded with spaces on the left and of the specified length.
   * @param length 
   * @return String
   */
  global String leftPad(Integer length) {}

  /**
   * Returns the current String padded with spaces on the left and of the specified length.
   * @param length 
   * @param padStr 
   * @return String
   */
  global String leftPad(Integer length, String padStr) {}

  /**
   * Returns the number of 16-bit Unicode characters contained in the String.
   * @return Integer
   */
  global Integer length() {}

  /**
   * Returns a new String that begins with the character at the specified zero-based startIndex with the number of characters specified by length .
   * @param startIndex If startIndex is negative, it is considered to be zero.
   * @param length If length is negative or zero, an empty String is returned. If length is greater than the remaining characters, the remainder of the String is returned.
   * @return String
   */
  global String mid(Integer startIndex, Integer length) {}

  /**
   * Returns the current String with leading, trailing, and repeating white space characters removed.
   * @return String
   */
  global String normalizeSpace() {}

  /**
   * Returns the index of the Unicode code point that is offset by the specified number of code points, starting from the given index.
   * @param index The start index in the string.
   * @param codePointOffset The number of code points to be offset.
   * @return Integer
   */
  global Integer offsetByCodePoints(Integer index, Integer codePointOffset) {}

  /**
   * Removes all occurrences of the specified substring and returns the String result.
   * @param substring 
   * @return String
   */
  global String remove(String substring) {}

  /**
   * Removes the specified substring only if it occurs at the end of the String.
   * @param substring 
   * @return String
   */
  global String removeEnd(String substring) {}

  /**
   * Removes the specified substring only if it occurs at the end of the String using a case-insensitive match.
   * @param substring 
   * @return String
   */
  global String removeEndIgnoreCase(String substring) {}

  /**
   * Removes the specified substring only if it occurs at the beginning of the String.
   * @param substring 
   * @return String
   */
  global String removeStart(String substring) {}

  /**
   * Removes the specified substring only if it occurs at the beginning of the String using a case-insensitive match.
   * @param substring 
   * @return String
   */
  global String removeStartIgnoreCase(String substring) {}

  /**
   * Returns the current String repeated the specified number of times.
   * @param numberOfTimes 
   * @return String
   */
  global String repeat(Integer numberOfTimes) {}

  /**
   * Returns the current String repeated the specified number of times.
   * @param separator 
   * @param numberOfTimes 
   * @return String
   */
  global String repeat(String separator, Integer numberOfTimes) {}

  /**
   * Replaces each substring of a string that matches the literal target sequence target with the specified literal replacement sequence replacement .
   * @param target 
   * @param replacement 
   * @return String
   */
  global String replace(String target, String replacement) {}

  /**
   * Replaces each substring of a string that matches the regular expression regExp with the replacement sequence replacement .
   * @param regExp 
   * @param replacement 
   * @return String
   */
  global String replaceAll(String regExp, String replacement) {}

  /**
   * Replaces the first substring of a string that matches the regular expression regExp with the replacement sequence replacement .
   * @param regExp 
   * @param replacement 
   * @return String
   */
  global String replaceFirst(String regExp, String replacement) {}

  /**
   * Returns a String with all the characters reversed.
   * @return String
   */
  global String reverse() {}

  /**
   * Returns the rightmost characters of the current String of the specified length.
   * @param length If length is greater than the String size, the entire String is returned.
   * @return String
   */
  global String right(Integer length) {}

  /**
   * Returns the current String padded with spaces on the right and of the specified length.
   * @param length If length is less than or equal to the current String size, the entire String is returned without space padding.
   * @return String
   */
  global String rightPad(Integer length) {}

  /**
   * Returns the current String padded with spaces on the right and of the specified length.
   * @param length If length is less than or equal to the current String size, the entire String is returned without space padding.
   * @param padStr 
   * @return String
   */
  global String rightPad(Integer length, String padStr) {}

  /**
   * Returns a list that contains each substring of the String that is terminated by either the regular expression regExp or the end of the String.
   * @param regExp 
   * @return String[]
   */
  global String[] split(String regExp) {}

  /**
   * Returns a list that contains each substring of the String that is terminated by either the regular expression regExp or the end of the String.
   * @param regExp 
   * @param limit 
   * @return String[]
   */
  global String[] split(String regExp, Integer limit) {}

  /**
   * Splits the current String by character type and returns a list of contiguous character groups of the same type as complete tokens.
   * @return List<String>
   */
  global List<String> splitByCharacterType() {}

  /**
   * Splits the current String by character type and returns a list of contiguous character groups of the same type as complete tokens, with the following exception: the uppercase character, if any, immediately preceding a lowercase character token belongs to the following character token rather than to the preceding.
   * @return List<String>
   */
  global List<String> splitByCharacterTypeCamelCase() {}

  /**
   * Returns true if the String that called the method begins with the specified prefix .
   * @param prefix 
   * @return Boolean
   */
  global Boolean startsWith(String prefix) {}

  /**
   * Returns true if the current String begins with the specified prefix regardless of the prefix case.
   * @param prefix 
   * @return Boolean
   */
  global Boolean startsWithIgnoreCase(String prefix) {}

  /**
   * Removes HTML markup and returns plain text.
   * @return String
   */
  global String stripHtmlTags() {}

  /**
   * Returns a new String that begins with the character at the specified zero-based startIndex and extends to the end of the String.
   * @param startIndex 
   * @return String
   */
  global String substring(Integer startIndex) {}

  /**
   * Returns a new String that begins with the character at the specified zero-based startIndex and extends to the end of the String.
   * @param startIndex 
   * @param endIndex 
   * @return String
   */
  global String substring(Integer startIndex, Integer endIndex) {}

  /**
   * Returns the substring that occurs after the first occurrence of the specified separator.
   * @param separator 
   * @return String
   */
  global String substringAfter(String separator) {}

  /**
   * Returns the substring that occurs after the last occurrence of the specified separator.
   * @param separator 
   * @return String
   */
  global String substringAfterLast(String separator) {}

  /**
   * Returns the substring that occurs before the first occurrence of the specified separator.
   * @param separator 
   * @return String
   */
  global String substringBefore(String separator) {}

  /**
   * Returns the substring that occurs before the last occurrence of the specified separator.
   * @param separator 
   * @return String
   */
  global String substringBeforeLast(String separator) {}

  /**
   * Returns the substring that occurs between two instances of the specified tag String.
   * @param tag 
   * @return String
   */
  global String substringBetween(String tag) {}

  /**
   * Returns the substring that occurs between two instances of the specified tag String.
   * @param open 
   * @param close 
   * @return String
   */
  global String substringBetween(String open, String close) {}

  /**
   * Swaps the case of all characters and returns the resulting String by using the default (English US) locale.
   * @return String
   */
  global String swapCase() {}

  /**
   * Converts all of the characters in the String to lowercase using the rules of the default (English US) locale.
   * @return String
   */
  global String toLowerCase() {}

  /**
   * Converts all of the characters in the String to lowercase using the rules of the default (English US) locale.
   * @param locale 
   * @return String
   */
  global String toLowerCase(String locale) {}

  /**
   * Converts all of the characters in the String to uppercase using the rules of the default (English US) locale.
   * @return String
   */
  global String toUpperCase() {}

  /**
   * Converts all of the characters in the String to uppercase using the rules of the default (English US) locale.
   * @param locale 
   * @return String
   */
  global String toUpperCase(String locale) {}

  /**
   * Substitutes variables in a string for their corresponding values in the valueMap parameter, and returns the updated string.
   * @param valueMap 
   * @return String
   */
  global String template(Map<String, Object> valueMap) {}

  /**
   * Returns a copy of the string that no longer contains any leading or trailing white space characters.
   * @return String
   */
  global String trim() {}

  /**
   * Returns the current String with the first letter in lowercase.
   * @return String
   */
  global String uncapitalize() {}

  /**
   * Returns a String representing an unescaped CSV column.
   * @return String
   */
  global String unescapeCsv() {}

  /**
   * Unescapes any EcmaScript literals found in the String.
   * @return String
   */
  global String unescapeEcmaScript() {}

  /**
   * Unescapes the characters in a String using HTML 3.0 entities.
   * @return String
   */
  global String unescapeHtml3() {}

  /**
   * Unescapes the characters in a String using HTML 4.0 entities.
   * @return String
   */
  global String unescapeHtml4() {}

  /**
   * Returns a String whose Java literals are unescaped. Literals unescaped include escape sequences for quotes (\\") and control characters, such as tab (\\t), and carriage return (\\n).
   * @return String
   */
  global String unescapeJava() {}

  /**
   * Returns a String whose escaped Unicode characters are unescaped.
   * @return String
   */
  global String unescapeUnicode() {}

  /**
   * Unescapes the characters in a String using XML entities.
   * @return String
   */
  global String unescapeXml() {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param dateToConvert 
   * @return String
   */
  global static String valueOf(Date dateToConvert) {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param datetimeToConvert 
   * @return String
   */
  global static String valueOf(Datetime datetimeToConvert) {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param decimalToConvert 
   * @return String
   */
  global static String valueOf(Decimal decimalToConvert) {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param doubleToConvert 
   * @return String
   */
  global static String valueOf(Double doubleToConvert) {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param integerToConvert 
   * @return String
   */
  global static String valueOf(Integer integerToConvert) {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param longToConvert 
   * @return String
   */
  global static String valueOf(Long longToConvert) {}

  /**
   * Returns a String that represents the specified Date in the standard “yyyy-MM-dd” format.
   * @param toConvert 
   * @return String
   */
  global static String valueOf(Object toConvert) {}

  /**
   * Returns a String that represents the specified Datetime in the standard “yyyy-MM-dd HH:mm:ss” format for the GMT time zone.
   * @param datetimeToConvert 
   * @return String
   */
  global static String valueOfGmt(Datetime datetimeToConvert) {}

  global Object clone() {}

}