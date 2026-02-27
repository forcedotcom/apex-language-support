public class DateDateTimeTimeArithmetic {
    public void testInvalidDateArithmetic() {
        Date d1;
        // Invalid: Date * Integer
        d1 = d1 * 1;
        
        // Invalid: Date + Boolean
        d1 = d1 + true;
    }
    
    public void testInvalidDateTimeArithmetic() {
        DateTime dt1;
        // Invalid: DateTime + Boolean
        dt1 = dt1 + true;
    }
    
    public void testInvalidTimeArithmetic() {
        Time t1;
        // Invalid: Time * Long
        t1 = t1 * 1L;
        
        // Invalid: Time / Long
        t1 = t1 / 1L;
        
        // Invalid: Time + Boolean
        t1 = t1 + true;
    }
}
