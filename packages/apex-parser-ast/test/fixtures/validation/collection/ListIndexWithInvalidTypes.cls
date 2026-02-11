public class ListIndexWithInvalidTypes {
    public void testMethod() {
        List<String> myList = new List<String>();
        String strIndex = "0";
        Boolean boolIndex = true;
        Double doubleIndex = 1.5;
        
        // Invalid: String variable as index
        String value1 = myList[strIndex];
        
        // Invalid: Boolean variable as index
        String value2 = myList[boolIndex];
        
        // Invalid: Double variable as index
        String value3 = myList[doubleIndex];
    }
}
