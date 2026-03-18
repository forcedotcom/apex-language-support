/*
 * Caller class for cross-file resolution e2e testing.
 * Used as the SOURCE in cross-file go-to-definition and hover tests.
 * Calls into a utility class defined in a separate file.
 */
public class CrossFileCaller {
    /**
     * Calls static methods on a utility class defined in a separate file.
     */
    public void callUtility() {
        String fullName = CrossFileUtility.formatName('John', 'Doe');
        Integer sum = CrossFileUtility.add(3, 7);
        String greeting = CrossFileUtility.greet(fullName);
        System.debug(greeting + ' Sum: ' + sum);
    }

    /**
     * Returns a formatted name using the cross-file utility.
     */
    public static String getFormattedName(String first, String last) {
        return CrossFileUtility.formatName(first, last);
    }
}
