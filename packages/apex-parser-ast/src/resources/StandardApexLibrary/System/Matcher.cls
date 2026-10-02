/**
 * Matchers use Patterns to perform match operations on a character string.
 */
global class Matcher {
    /**
     * Returns the position after the last matched character.
     */
    global Integer end() { return 0; }

    /**
     * Returns the position after the last character of the subsequence captured by the group index during the previous match operation. If the match was successful but the group itself did not match anything, this method returns -1.
     * <p>Usage
     * Captured groups are indexed from left to right, starting at one. Group zero denotes the entire pattern, so the expressionm.end(0) is equivalent to m.end().
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_capturing_groups.htm" target="_blank">Understanding Capturing Groups</a>.
     */
    global Integer end(Integer grp) { return 0; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Attempts to find the next subsequence of the input sequence that matches the pattern. This method returns true if a subsequence of the input sequence matches this Matcher object's pattern.
     * <p>Usage
     * This method starts at the beginning of this Matcher object's region, or, if a previous invocation of the method was successful and the Matcher object has not since been reset, at the first character not matched by the previous match.
     * If the match succeeds, more information can be obtained using the start, end, and group methods.
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_regions.htm" target="_blank">Using Regions</a>.
     */
    global Boolean find() { return false; }

    /**
     * Resets the Matcher object and then tries to find the next subsequence of the input sequence that matches the pattern. This method returns true if a subsequence of the input sequence matches this Matcher object's pattern.
     * <p>Usage
     * If the match succeeds, more information can be obtained using the start, end, and group methods.
     */
    global Boolean find(Integer start) { return false; }

    /**
     * Returns the input subsequence returned by the previous match.
     * <p>Usage
     * Note that some groups, such as (a*), match the empty string. This method returns the empty string when such a group successfully matches the empty string in the input.
     */
    global String group() { return null; }

    /**
     * Returns the input subsequence captured by the specified group index during the previous match operation. If the match was successful but the specified group failed to match any part of the input sequence, null is returned.
     * <p>Usage
     * Captured groups are indexed from left to right, starting at one. Group zero denotes the entire pattern, so the expression m.group(0) is equivalent to m.group().
     * Note that some groups, such as (a*), match the empty string. This method returns the empty string when such a group successfully matches the empty string in the input.
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_capturing_groups.htm" target="_blank">Understanding Capturing Groups</a>.
     */
    global String group(Integer start) { return null; }

    /**
     * Returns the number of capturing groups in this Matching object's pattern. Group zero denotes the entire pattern and is not included in this count.
     * <p>Usage
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_capturing_groups.htm" target="_blank">Understanding Capturing Groups</a>.
     */
    global Integer groupCount() { return 0; }

    /**
     * Returns true if the Matcher object has anchoring bounds, false otherwise. By default, a Matcher object uses anchoring bounds regions.
     * <p>Usage
     * If a Matcher object uses anchoring bounds, the boundaries of this Matcher object's region match start and end of line anchors such as ^ and $.
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_bounds.htm" target="_blank">Using Bounds</a>.
     */
    global Boolean hasAnchoringBounds() { return false; }

    /**
     * Returns true if the Matcher object has transparent bounds, false if it uses opaque bounds. By default, a Matcher object uses opaque region boundaries.
     * <p>Usage
     * For more information, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_bounds.htm" target="_blank">Using Bounds</a>.
     */
    global Boolean hasTransparentBounds() { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the end of input was found by the search engine in the last match operation performed by this Matcher object. When this method returns true, it is possible that more input would have changed the result of the last search.
     */
    global Boolean hitEnd() { return false; }

    /**
     * Attempts to match the input sequence, starting at the beginning of the region, against the pattern.
     * <p>Usage
     * Like the matches method, this method always starts at the beginning of the region; unlike that method, it does not require the entire region be matched.
     * If the match succeeds, more information can be obtained using the start, end, and group methods.
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_regions.htm" target="_blank">Using Regions</a>.
     */
    global Boolean lookingAt() { return false; }

    /**
     * Attempts to match the entire region against the pattern.
     * <p>Usage
     * If the match succeeds, more information can be obtained using the start, end, and group methods.
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_regions.htm" target="_blank">Using Regions</a>.
     */
    global Boolean matches() { return false; }

    global System.Pattern pattern() { return null; }

    /**
     * Returns a literal replacement string for the specified string inputString. The characters in the returned string match the sequence of characters in inputString.
     * <p>Usage
     * Metacharacters (such as $ or ^) and escape sequences in the input string are treated as literal characters with no special meaning.
     */
    global static String quoteReplacement(String s) { return null; }

    global System.Matcher region(Integer start, Integer ending) { return null; }

    /**
     * Returns the end index (exclusive) of this Matcher object's region.
     * <p>Usage
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_regions.htm" target="_blank">Using Regions</a>.
     */
    global Integer regionEnd() { return 0; }

    /**
     * Returns the start index (inclusive) of this Matcher object's region.
     * <p>Usage
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_regions.htm" target="_blank">Using Regions</a>.
     */
    global Integer regionStart() { return 0; }

    /**
     * Replaces every subsequence of the input sequence that matches the pattern with the replacement string.
     * <p>Usage
     * This method first resets the Matcher object, then scans the input sequence looking for matches of the pattern. Characters that are not part of any match are appended directly to the result string; each match is replaced in the result by the replacement string. The replacement string may contain references to captured subsequences.
     * Note that backslashes (\) and dollar signs ($) in the replacement string may cause the results to be different than if the string was treated as a literal replacement string. Dollar signs may be treated as references to captured subsequences, and backslashes are used to escape literal characters in the replacement string.
     * Invoking this method changes this Matcher object's state. If the Matcher object is to be used in further matching operations it should first be reset.
     * Given the regular expression a*b, the input "aabxyzaabxyzabxyzb", and the replacement string "-", an invocation of this method on a Matcher object for that expression would yield the string "-xyz-xyz-xyz-".
     */
    global String replaceAll(String replacement) { return null; }

    /**
     * Replaces the first subsequence of the input sequence that matches the pattern with the replacement string.
     * <p>Usage
     * Note that backslashes (\) and dollar signs ($) in the replacement string may cause the results to be different than if the string was treated as a literal replacement string. Dollar signs may be treated as references to captured subsequences, and backslashes are used to escape literal characters in the replacement string.
     * Invoking this method changes this Matcher object's state. If the Matcher object is to be used in further matching operations it should first be reset.
     * Given the regular expression dog, the input "zzzdogzzzdogzzz", and the replacement string "cat", an invocation of this method on a Matcher object for that expression would return the string "zzzcatzzzdogzzz".
     */
    global String replaceFirst(String replacement) { return null; }

    /**
     * Returns true if more input could change a positive match into a negative one.
     * <p>Usage
     * If this method returns true, and a match was found, then more input could cause the match to be lost.
     * If this method returns false and a match was found, then more input might change the match but the match won't be lost.
     * If a match was not found, then requireEnd has no meaning.
     */
    global Boolean requireEnd() { return false; }

    global System.Matcher reset() { return null; }

    global System.Matcher reset(String input) { return null; }

    /**
     * Returns the start index of the first character of the previous match.
     */
    global Integer start() { return 0; }

    /**
     * Returns the start index of the subsequence captured by the group specified by the group index during the previous match operation. Captured groups are indexed from left to right, starting at one. Group zero denotes the entire pattern, so the expression m.start(0) is equivalent to m.start().
     * <p>Usage
     * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_classes_pattern_and_matcher_capturing_groups.htm" target="_blank">Understanding Capturing Groups</a>.
     */
    global Integer start(Integer grp) { return 0; }

    global override virtual String toString() { return null; }

    global System.Matcher useAnchoringBounds(Boolean b) { return null; }

    global System.Matcher usePattern(System.Pattern p) { return null; }

    global System.Matcher useTransparentBounds(Boolean b) { return null; }
}