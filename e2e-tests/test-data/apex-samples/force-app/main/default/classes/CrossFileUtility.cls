/*
 * Utility class for cross-file resolution e2e testing.
 * Used as the TARGET in cross-file go-to-definition and hover tests.
 * CrossFileCaller.cls references this class from a separate file.
 */
public class CrossFileUtility {
    /**
     * Formats a full name from first and last name parts.
     */
    public static String formatName(String firstName, String lastName) {
        return firstName + ' ' + lastName;
    }

    /**
     * Adds two integers and returns the result.
     */
    public static Integer add(Integer a, Integer b) {
        return a + b;
    }

    /**
     * Returns a greeting message.
     */
    public static String greet(String name) {
        return 'Hello, ' + name + '!';
    }
}
