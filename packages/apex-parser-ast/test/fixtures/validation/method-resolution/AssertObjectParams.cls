/**
 * Tests that Assert methods accepting Object parameters correctly accept
 * subtypes (String, Exception) - implicit upcast in Apex.
 */
public class AssertObjectParams {
    public static void testIsNotNull() {
        String s = 'hello';
        Assert.isNotNull(s);
    }

    public static void testIsInstanceOfType() {
        try {
            throw new Exception('test');
        } catch (Exception e) {
            Assert.isInstanceOfType(e, Exception.class);
        }
    }
}
