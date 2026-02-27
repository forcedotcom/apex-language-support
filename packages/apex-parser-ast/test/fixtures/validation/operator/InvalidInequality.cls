public class InvalidInequality {
    public void testInvalidInequality() {
        Boolean bool1 = true;
        Boolean bool2 = false;
        
        // Error: Inequality operators on Boolean
        Boolean result1 = bool1 < bool2;
        Boolean result2 = bool1 > bool2;
        Boolean result3 = bool1 <= bool2;
        Boolean result4 = bool1 >= bool2;
    }
}
